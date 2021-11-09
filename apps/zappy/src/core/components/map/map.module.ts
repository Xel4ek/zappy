import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { TuiAvatarModule, TuiBadgedContentModule } from '@taiga-ui/kit';
import {
  TuiColorModule,
  TuiHintControllerModule,
  TuiHintModule,
  TuiPointerHintModule,
  TuiScrollbarModule,
  TuiSvgModule,
} from '@taiga-ui/core';

@NgModule({
  declarations: [MapComponent],
  exports: [MapComponent],
  imports: [
    CommonModule,
    TuiBadgedContentModule,
    TuiAvatarModule,
    TuiPointerHintModule,
    TuiHintControllerModule,
    TuiHintModule,
    TuiScrollbarModule,
    TuiSvgModule,
    TuiColorModule,
  ],
})
export class MapModule {}
