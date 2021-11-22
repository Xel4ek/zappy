import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerPipe } from './player.pipe';

@NgModule({
  declarations: [PlayerPipe],
  exports: [PlayerPipe],
  imports: [CommonModule],
})
export class FilterModule {}
