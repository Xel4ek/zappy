import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsComponent } from './settings.component';
import { TuiBadgeModule } from '@taiga-ui/kit';

@NgModule({
  declarations: [SettingsComponent],
  exports: [SettingsComponent],
  imports: [CommonModule, TuiBadgeModule],
})
export class SettingsModule {}
