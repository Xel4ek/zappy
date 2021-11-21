import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsComponent } from './settings.component';
import {
  TuiBadgeModule,
  TuiMarkerIconModule,
  TuiSliderModule,
} from '@taiga-ui/kit';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [SettingsComponent],
  exports: [SettingsComponent],
  imports: [
    CommonModule,
    TuiBadgeModule,
    TuiSliderModule,
    ReactiveFormsModule,
    TuiMarkerIconModule,
  ],
})
export class SettingsModule {}
