import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameComponent } from './game.component';
import { StatisticModule } from '../statistic/statistic.module';
import { MapModule } from '../map/map.module';
import { TuiScrollbarModule } from '@taiga-ui/core';
import { SettingsModule } from '../settings/settings.module';
import { GameService } from '../../services/game/game.service';
import { Map3dModule } from '../map3d/map3d.module';
import { TuiLetModule } from '@taiga-ui/cdk';
import { EngineService } from '../../services/engine/engine.service';

@NgModule({
  declarations: [GameComponent],
  exports: [GameComponent],
  imports: [
    CommonModule,
    StatisticModule,
    MapModule,
    TuiScrollbarModule,
    SettingsModule,
    Map3dModule,
    TuiLetModule,
  ],
})
export class GameModule {
  constructor(private readonly gameService: GameService) {}
}
