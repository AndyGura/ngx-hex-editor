import { NgModule } from '@angular/core';
import { HexEditorComponent } from './hex-editor.component';
import { CommonModule } from "@angular/common";



@NgModule({
  declarations: [
    HexEditorComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    HexEditorComponent
  ]
})
export class HexEditorModule { }
