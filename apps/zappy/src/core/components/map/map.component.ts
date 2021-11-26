import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
} from '@angular/core';
import { Cell, GameService } from '../../services/game/game.service';
import { TuiDestroyService } from '@taiga-ui/cdk';
import { Observable, takeUntil, tap } from 'rxjs';
import { SoundService } from '../../services/sound/sound.service';

@Component({
  selector: 'zappy-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  styles: [
    `
      .map {
        grid: repeat(var(--sizeY), 1fr) / repeat(var(--sizeX), 1fr);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TuiDestroyService],
})
export class MapComponent {
  worldMap: Observable<Cell[]>;

  @HostBinding('style.--sizeX')
  sizeX!: number;

  @HostBinding('style.--sizeY')
  sizeY!: number;

  constructor(
    private readonly gameService: GameService,
    private readonly destroy$: TuiDestroyService,
    private readonly soundService: SoundService
  ) {
    gameService
      .settings()
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          this.sizeX = data.sizeX ?? 0;
          this.sizeY = data.sizeY ?? 0;
        })
      )
      .subscribe();
    this.worldMap = gameService.worldMap();
  }

  private static padZero(str: string, len: number = 2) {
    const zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
  }

  trackBy(index: number) {
    return index;
  }

  showHint(index?: Cell) {
    // console.log(index);
  }

  invertColor(hex: string) {
    if (hex.indexOf('#') === 0) {
      hex = hex.slice(1);
    }
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
      g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
      b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
    // pad each with zeros and return
    return (
      '#' +
      MapComponent.padZero(r) +
      MapComponent.padZero(g) +
      MapComponent.padZero(b)
    );
  }

  focusPlayer(event: Event, id: number) {
    event.stopPropagation();
    this.soundService.click();

    this.gameService.setInfo(id, 'player');
  }

  focusCell(event: Event, id: number) {
    event.stopPropagation();
    this.soundService.click();

    this.gameService.setInfo(id, 'cell');
  }

  @HostListener('document:click')
  clickOut() {
    this.soundService.click();
    this.gameService.setInfo(-1, 'empty');
  }
}
