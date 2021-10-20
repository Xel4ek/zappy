import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameComponent } from './game.component';
import { StatisticModule } from '../statistic/statistic.module';
import { MapModule } from '../map/map.module';

@NgModule({
  declarations: [GameComponent],
  exports: [GameComponent],
  imports: [CommonModule, StatisticModule, MapModule],
})
export class GameModule {}
