import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from "@angular/core";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = "dev-app";
  hexString = "48656c6c6f20576f726c6421"; // "Hello World!" in hex
  binaryData: Uint8Array = new Uint8Array();

  constructor(private readonly cdr: ChangeDetectorRef) {
    this.updateBinaryFromHex();
  }

  onHexChange() {
    // Sanitize hex string (only 0-9, a-f, A-F)
    this.hexString = this.hexString.replace(/[^0-9a-fA-F]/g, "");
    this.updateBinaryFromHex();
  }

  updateBinaryFromHex() {
    const hex = this.hexString;
    const bytes = new Uint8Array(Math.floor(hex.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    console.log("##### onHexChange: ", bytes);
    this.binaryData = bytes;
    this.cdr.markForCheck();
  }

  onDataChange(newData: Uint8Array) {
    this.binaryData = newData;
    this.updateHexFromBinary();
  }

  updateHexFromBinary() {
    this.hexString = Array.from(this.binaryData)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    this.cdr.markForCheck();
  }
}
