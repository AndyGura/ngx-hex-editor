import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { HexEditorModule } from "ngx-hex-editor";

import { AppComponent } from "./app.component";

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, FormsModule, HexEditorModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
