import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  OnInit,
  ViewChild,
} from '@angular/core';
import { EngineService } from '../../services/engine/engine.service';
import { Scene } from 'babylonjs';
import { Cell, GameService } from '../../services/game/game.service';
import { TuiDestroyService } from '@taiga-ui/cdk';
import { Observable, takeUntil, tap } from 'rxjs';

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
export class MapComponent implements AfterViewInit {
  @ViewChild('canvas', { static: true }) canvas?: ElementRef<HTMLCanvasElement>;
  private scene?: Scene;
  worldMap: Observable<Cell[]>;
  constructor(
    private readonly engineService: EngineService,
    private readonly gameService: GameService,
    private readonly destroy$: TuiDestroyService
  ) {
    gameService
      .settings()
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          this.sizeX = data.sizeX;
          this.sizeY = data.sizeY;
        })
      )
      .subscribe();
    this.worldMap = gameService.worldMap();
  }
  @HostBinding('style.--sizeX')
  sizeX!: number;

  @HostBinding('style.--sizeY')
  sizeY!: number;

  ngAfterViewInit(): void {
    if (this.canvas) {
      this.engineService.bind(this.canvas);
      if (this.engineService.engine) {
        this.scene = new Scene(this.engineService.engine);
        this.engineService.start(this.scene);
      }
    }
    // start the Engine
    // be aware that we have to setup the Scene before
  }
  trackBy(index: number) {
    return index;
  }
}
