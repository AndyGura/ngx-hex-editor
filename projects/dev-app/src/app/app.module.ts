import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { HexEditorModule } from "../../../../projects/ngx-hex-editor/src/public-api";

import { AppComponent } from "./app.component";

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, FormsModule, HexEditorModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
