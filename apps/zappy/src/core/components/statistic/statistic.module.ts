import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatisticComponent } from './statistic.component';
import { TuiScrollbarModule } from '@taiga-ui/core';
import { ScrollingModule } from '@angular/cdk/scrolling';

@NgModule({
  declarations: [StatisticComponent],
  exports: [StatisticComponent],
  imports: [CommonModule, TuiScrollbarModule, ScrollingModule],
})
export class StatisticModule {}
