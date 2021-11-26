import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable, takeUntil } from 'rxjs';
import { Cell, GameService, Player } from '../../services/game/game.service';
import { FormControl } from '@angular/forms';
import { map } from 'rxjs/operators';
import { TuiDestroyService } from '@taiga-ui/cdk';
import { SoundService } from '../../services/sound/sound.service';
import { EngineService } from '../../services/engine/engine.service';

@Component({
  selector: 'zappy-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TuiDestroyService],
})
export class SettingsComponent {
  private volumeKeeper = { trusted: false, volume: 0 };
  speed$: Observable<number>;
  info$: Observable<
    { type: 'player'; data: Player } | { type: 'cell'; data: Cell } | undefined
  >;
  soundVolume = new FormControl(100);
  constructor(
    // private readonly gameService: GameService,
    private readonly engineService: EngineService,
    private readonly destroyService$: TuiDestroyService,
    private readonly soundService: SoundService
  ) {
    this.info$ = this.engineService.info();
    this.soundVolume.valueChanges
      .pipe(
        takeUntil(this.destroyService$),
        map((data) => {
          if (this.volumeKeeper.trusted) {
            this.volumeKeeper.trusted = false;
          } else {
            this.volumeKeeper.volume = 0;
          }
          this.soundService.setVolume(data);
        })
      )
      .subscribe();
    this.speed$ = this.engineService.settings().pipe(map((data) => data.speed));
  }
  mute() {
    if (this.volumeKeeper.volume) {
      this.soundVolume.setValue(this.volumeKeeper.volume);
      this.volumeKeeper = { trusted: true, volume: 0 };
    } else {
      this.volumeKeeper = { trusted: true, volume: this.soundVolume.value };
      this.soundVolume.setValue(0);
    }
  }

  increaseSpeed() {
    this.engineService.increaseSpeed();
  }

  decreaseSpeed() {
    this.engineService.decreaseSpeed();
  }
}
