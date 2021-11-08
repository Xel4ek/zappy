import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { TuiAvatarModule, TuiBadgedContentModule } from '@taiga-ui/kit';

@NgModule({
  declarations: [MapComponent],
  exports: [MapComponent],
  imports: [CommonModule, TuiBadgedContentModule, TuiAvatarModule],
})
export class MapModule {}
