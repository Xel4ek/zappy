import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import {
  TuiAvatarModule,
  TuiBadgedContentModule,
  TuiBadgeModule,
} from '@taiga-ui/kit';
import {
  TuiColorModule,
  TuiHintControllerModule,
  TuiHintModule,
  TuiPointerHintModule,
  TuiScrollbarModule,
  TuiSvgModule,
} from '@taiga-ui/core';
import { TuiFocusableModule } from '@taiga-ui/cdk';

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
    TuiBadgeModule,
    TuiFocusableModule,
  ],
})
export class MapModule {}
