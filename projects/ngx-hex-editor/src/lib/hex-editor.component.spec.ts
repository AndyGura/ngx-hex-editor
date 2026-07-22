import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from "@angular/core/testing";
import { HexEditorComponent } from "./hex-editor.component";

describe("HexEditorComponent Pagination", () => {
  let component: HexEditorComponent;
  let fixture: ComponentFixture<HexEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HexEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HexEditorComponent);
    component = fixture.componentInstance;

    // Set maxRows and maxColumns to prevent resizing logic from changing pageSize
    component.maxRows = 10;
    component.maxColumns = 16;
  });

  it("should render page number as an editable span when multiple pages exist", fakeAsync(() => {
    fixture.detectChanges();
    tick(100);

    // Manually set pageSize to simulate multiple pages
    // 16 columns, 10 rows = 160 bytes per page
    component.pageSize$.next([16, 10]);
    // 600 bytes + 1 (empty) = 601 bytes. 601 / 16 = 38 rows. 38 / 10 = 4 pages.
    component.data = new Uint8Array(600);

    fixture.detectChanges();
    tick(); // Wait for any remaining async ops
    fixture.detectChanges();

    const paginationSpan =
      fixture.nativeElement.querySelector(".pagination span");
    expect(paginationSpan).toBeTruthy();

    const pageInput = paginationSpan.querySelector(".page-input");
    expect(pageInput).toBeTruthy();
    expect(pageInput.innerText.trim()).toBe("1");
    expect(pageInput.getAttribute("contenteditable")).toBe("true");
    expect(paginationSpan.textContent).toContain("Page");
    expect(paginationSpan.textContent).toContain("of 4");
  }));

  it("should change page when editable span value changes on blur", fakeAsync(() => {
    fixture.detectChanges();
    tick(100);

    component.pageSize$.next([16, 10]);
    component.data = new Uint8Array(600);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const pageInput = fixture.nativeElement.querySelector(".page-input");
    pageInput.innerText = "2";
    pageInput.dispatchEvent(new Event("blur"));

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.currentPage$.value).toBe(1);
    expect(pageInput.innerText.trim()).toBe("2");
  }));

  it("should change page when enter key is pressed", fakeAsync(() => {
    fixture.detectChanges();
    tick(100);

    component.pageSize$.next([16, 10]);
    component.data = new Uint8Array(600);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const pageInput = fixture.nativeElement.querySelector(".page-input");
    pageInput.focus();
    pageInput.innerText = "2";
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    pageInput.dispatchEvent(event);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.currentPage$.value).toBe(1);
    expect(pageInput.innerText.trim()).toBe("2");
  }));

  it("should bound page number within valid range", fakeAsync(() => {
    fixture.detectChanges();
    tick(100);

    component.pageSize$.next([16, 10]);
    component.data = new Uint8Array(600); // 4 pages

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const pageInput = fixture.nativeElement.querySelector(".page-input");

    // Test upper bound
    pageInput.innerText = "10";
    pageInput.dispatchEvent(new Event("blur"));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.currentPage$.value).toBe(3); // Last page index for 4 pages

    // Test upper bound when already on last page
    component.currentPage$.next(3);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    pageInput.innerText = "10";
    pageInput.dispatchEvent(new Event("blur"));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.currentPage$.value).toBe(3);
    expect(pageInput.innerText.trim()).toBe("4");
  }));

  it("should update span value when page is changed via changePage (Next/Previous buttons)", fakeAsync(() => {
    fixture.detectChanges();
    tick(100);

    component.pageSize$.next([16, 10]);
    component.data = new Uint8Array(600); // 4 pages

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const pageInput = fixture.nativeElement.querySelector(".page-input");
    expect(pageInput.innerText.trim()).toBe("1");

    // Simulate clicking "Next" button or calling changePage directly
    component.changePage(1);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(pageInput.innerText.trim()).toBe("2");

    component.changePage(-1);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(pageInput.innerText.trim()).toBe("1");
  }));

  it("should update span value when page is changed via changePage after manual edit", fakeAsync(() => {
    fixture.detectChanges();
    tick(100);

    component.pageSize$.next([16, 10]);
    component.data = new Uint8Array(600); // 4 pages

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const pageInput = fixture.nativeElement.querySelector(".page-input");

    // Manual edit
    pageInput.innerText = "2";
    pageInput.dispatchEvent(new Event("blur"));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(component.currentPage$.value).toBe(1);
    expect(pageInput.innerText.trim()).toBe("2");

    // Change page programmatically
    component.changePage(1);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.currentPage$.value).toBe(2);
    expect(pageInput.innerText.trim()).toBe("3");
  }));

  it("should reset span value to current page if invalid input is provided", fakeAsync(() => {
    fixture.detectChanges();
    tick(100);

    component.pageSize$.next([16, 10]);
    component.data = new Uint8Array(600);

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const pageInput = fixture.nativeElement.querySelector(".page-input");

    pageInput.innerText = "abc";
    pageInput.dispatchEvent(new Event("blur"));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(pageInput.innerText.trim()).toBe("1");
  }));
});
