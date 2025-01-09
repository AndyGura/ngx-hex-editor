import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { auditTime, BehaviorSubject, combineLatest, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'hex-editor',
  template: `
    <div class="editor-body" #editorBody>
      <div class="row"
           *ngFor="let row of (renderedRows$ | async); let rowIndex = index; trackBy: trackByIndex"
           [class.gray]="rowIndex % 2 !== 0">
        <div *ngIf="_showOffsets$ | async" class="offset">{{ row.offset }}</div>
        <div class="hex-values">
          <input
            *ngFor="let value of row.values; let colIndex = index; trackBy: trackByIndex"
            [id]="'hex_input__' + rowIndex + '__' + colIndex"
            [value]="value[0]"
            (input)="onHexInput($event, rowIndex, colIndex)"
            (focus)="onHexFocus($event, colIndex)"
            (blur)="onHexBlur($event)"
            [disabled]="value[0] === null"
            maxlength="2"
          />
        </div>
        <div *ngIf="(_showOffsets$ | async) || (_showUtf8$ | async)" class="flex-spacer"></div>
        <div *ngIf="_showUtf8$ | async" class="utf8-values">
          <span *ngFor="let value of row.values; let colIndex = index; trackBy: trackByIndex"
                [id]="'utf_char__' + rowIndex + '__' + colIndex"
                (click)="blurInput(rowIndex, colIndex)">{{ value[1] }}</span>
        </div>
      </div>
      <div class="flex-spacer"></div>
    </div>
    <div *ngIf="((totalPages$ | async) || 0) > 1" class="pagination">
      <button (click)="changePage(-1)" [disabled]="(currentPage$ | async) === 0">Previous</button>
      <span>Page {{ ((currentPage$ | async) || 0) + 1 }} of {{ totalPages$ | async }}</span>
      <button (click)="changePage(1)"
              [disabled]="((currentPage$ | async) || 0) >= ((totalPages$ | async) || 0) - 1">
        Next
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        font-family: monospace;
      }

      .editor-body {
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        overflow-y: hidden;
      }

      .row {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 24px;
        margin-bottom: 4px;
      }

      .row.gray {
        background-color: lightgray;
      }

      .offset {
        width: 60px;
        text-align: left;
        margin-right: 8px;
      }

      .hex-values {
        display: flex;
        gap: 2px;
        flex-shrink: 1;
        overflow-x: clip;
      }

      .hex-values input {
        width: 32px;
        text-align: center;
        box-sizing: border-box;
      }

      .utf8-values {
        margin-left: 8px;
      }

      .utf8-values span {
        display: inline-block;
        width: 8px;
        margin-left: 2px;
        color: black;
      }

      .utf8-values span.highlight {
        background-color: yellow;
      }

      .pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1em;
      }

      .flex-spacer {
        flex-grow: 1;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HexEditorComponent implements AfterViewInit, OnDestroy {

  _maxColumns$: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  @Input() set maxColumns(value: number) {
    this._maxColumns$.next(value);
  };

  _maxRows$: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  @Input() set maxRows(value: number) {
    this._maxRows$.next(value);
  };

  _showOffsets$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  @Input() set showOffsets(value: boolean) {
    this._showOffsets$.next(value);
  };

  _showUtf8$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  @Input() set showUtf8(value: boolean) {
    this._showUtf8$.next(value);
  };

  _data$: BehaviorSubject<Uint8Array> = new BehaviorSubject<Uint8Array>(new Uint8Array());

  @Input() set data(value: Uint8Array) {
    if (value === this._data$.value) {
      return;
    } else if (value.length === this._data$.value.length) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== this._data$.value[i]) {
          break;
        }
      }
      return;
    }
    this._data$.next(value);
  };

  get data(): Uint8Array {
    return this._data$.value;
  }

  @Input() readOnly: boolean = false;

  @Output() dataChange = new EventEmitter<Uint8Array>();

  @ViewChild('editorBody') editorBody!: ElementRef<HTMLDivElement>;

  currentPage$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  totalPages$: BehaviorSubject<number> = new BehaviorSubject<number>(1);

  pageSize$: BehaviorSubject<[number, number]> = new BehaviorSubject<[number, number]>([0, 0]);

  renderedRows$: BehaviorSubject<{ values: [string | null, string][]; offset: string }[]> = new BehaviorSubject<{
    values: [string | null, string][];
    offset: string
  }[]>([]);

  private viewportSize$ = new BehaviorSubject<[number, number]>([0, 0]);

  private readonly destroyed$: Subject<void> = new Subject<void>();

  constructor(private readonly cdr: ChangeDetectorRef) {
  }

  private renderValue(byte: number | null): [string | null, string] {
    if (byte === null || byte === undefined) {
      return [null, '∅'];
    } else {
      return [
        byte.toString(16).padStart(2, '0').toUpperCase(),
        byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'
      ];
    }
  }

  ngAfterViewInit(): void {
    // listen to viewport size
    new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.viewportSize$.next([
          entry.contentRect.width,
          entry.contentRect.height,
        ]);
      }
    }).observe(this.editorBody.nativeElement);

    // update column/rows amount
    combineLatest([
      this.viewportSize$,
      this._maxColumns$,
      this._maxRows$,
      this._showOffsets$,
      this._showUtf8$,
    ])
      .pipe(
        takeUntil(this.destroyed$),
        auditTime(50)
      )
      .subscribe(([[pureWidth, height], maxColumns, maxRows, showOffsets, showUtf8]) => {
        let width = pureWidth - 8 // - utf8 panel margin
        if (showOffsets) {
          width -= 68; // -60px width -8 px margin
        }
        let byteWidth = 32 + 2; // 32 own size, 2 gap
        if (showUtf8) {
          width -= 8; // utf8 margin
          byteWidth += 10; //10 is for each UTF 8: 8 own size + 2 margin
        }
        const rowHeight = 24 + 4; // 24 own size, 4 margin bottom
        let cols = Math.floor(width / byteWidth);
        if (maxColumns > 0 && cols > maxColumns) {
          cols = maxColumns;
        }
        let currentCols = this.pageSize$.value[0];
        if ((cols === currentCols + 1) && ((width / byteWidth) % 1) < 0.5) {
          cols = currentCols;
        }
        cols = Math.max(1, cols);
        let rows = Math.floor(height / rowHeight);
        if (maxRows > 0 && rows > maxRows) {
          rows = maxRows;
        }
        rows = Math.max(1, rows);
        if (cols != this.pageSize$.value[0] || rows !== this.pageSize$.value[1]) {
          this.pageSize$.next([cols, rows]);
        }
      });

    // render data
    combineLatest([
      this._data$,
      this.currentPage$,
      this.pageSize$
    ])
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([data, currentPage, pageSize]) => {
        if (pageSize[0] === 0 || pageSize[1] === 0) {
          return;
        }
        let totalPages = Math.max(1, Math.ceil(Math.ceil(data.length / pageSize[0]) / pageSize[1]));
        if (this.totalPages$.value !== totalPages) {
          this.totalPages$.next(totalPages);
        }
        if (currentPage >= totalPages) {
          currentPage = totalPages - 1;
          this.currentPage$.next(currentPage);
          return;
        }
        const pagedRows: { values: [string | null, string][]; offset: string }[] = [];
        for (
          let i = currentPage * pageSize[0] * pageSize[1];
          i < Math.min(data.length, (currentPage + 1) * pageSize[0] * pageSize[1]);
          i += pageSize[0]
        ) {
          const values: [string | null, string][] = [];
          for (let j = 0; j < pageSize[0]; j++) {
            values.push(this.renderValue(data[i + j]));
          }
          pagedRows.push({
            values,
            offset: i.toString(16).padStart(8, '0').toUpperCase(),
          });
        }
        this.renderedRows$.next(pagedRows);
        this.cdr.detectChanges();
      });
  }

  changePage(direction: number): void {
    let newPage = Math.min(
      Math.max(this.currentPage$.value + direction, 0),
      this.totalPages$.value - 1
    );
    if (this.currentPage$.value !== newPage) {
      this.currentPage$.next(newPage);
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  trackByIndex(index: number) {
    return index;
  }

  blurInput(rowIndex: number, colIndex: number): boolean {
    const em = this.editorBody.nativeElement.querySelector(`#hex_input__${rowIndex}__${colIndex}`);
    if (em) {
      (em as HTMLInputElement).focus();
      return true;
    }
    return false;
  }

  private goToNextInput(currentInputId: string) {
    const [_, rowIndex, colIndex] = currentInputId.split('__');
    if (this.blurInput(+rowIndex, +colIndex + 1)) {
      return;
    }
    if (this.blurInput(+rowIndex + 1, 0)) {
      return;
    }
    if (this.currentPage$.value < this.totalPages$.value - 1) {
      this.changePage(1);
      this.blurInput(0, 0);
    }
  }

  onHexInput(event: Event, rowIndex: number, colIndex: number): void {
    const inputElement = event.target as HTMLInputElement;
    if (this.readOnly) {
      inputElement.value = this.renderedRows$.value[rowIndex].values[colIndex][0]!;
      return;
    }
    const value = inputElement.value.replace(/[^0-9a-fA-F]/g, "");
    inputElement.value = value.toUpperCase();
    if (value.length === 2) {
      const byteValue = parseInt(value, 16);
      if (!isNaN(byteValue) && byteValue >= 0 && byteValue <= 255) {
        const dataIndex = (this.currentPage$.value * this.pageSize$.value[1] + rowIndex) * this.pageSize$.value[0] + colIndex;
        this.data[dataIndex] = byteValue;
        this.renderedRows$.value[rowIndex].values[colIndex] = this.renderValue(byteValue);
        this.cdr.detectChanges();

        this.dataChange.emit(this.data);
        this.goToNextInput(inputElement.id);
      }
    }
  }

  onHexFocus(event: Event, colIndex: number): void {
    const inputElement = event.target as HTMLInputElement;
    const editorRow = inputElement.closest('.row');
    if (editorRow) {
      const utf8Spans = editorRow.querySelectorAll('.utf8-values span');
      utf8Spans.forEach((span, index) => {
        span.classList.toggle('highlight', index === colIndex);
      });
    }
    inputElement.select();
  }

  onHexBlur(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const editorRow = inputElement.closest('.row');
    if (editorRow) {
      const utf8Spans = editorRow.querySelectorAll('.utf8-values span');
      utf8Spans.forEach((span) => {
        span.classList.remove('highlight');
      });
    }
  }
}
