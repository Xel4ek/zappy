import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatisticComponent } from './statistic.component';
import { TuiScrollbarModule } from '@taiga-ui/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TuiLetModule, TuiOverscrollModule } from '@taiga-ui/cdk';
import { TuiTreeModule } from '@taiga-ui/kit';
import { FilterModule } from '../../pipe/filter/filter.module';

@NgModule({
  declarations: [StatisticComponent],
  exports: [StatisticComponent],
  imports: [
    CommonModule,
    TuiScrollbarModule,
    ScrollingModule,
    TuiOverscrollModule,
    TuiTreeModule,
    TuiLetModule,
    FilterModule,
  ],
})
export class StatisticModule {}
