import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { EngineService } from '../../services/engine/engine.service';
import { GameService } from '../../services/game/game.service';
import { TuiDestroyService } from '@taiga-ui/cdk';
import { filter, first, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'zappy-map3d',
  templateUrl: './map3d.component.html',
  styleUrls: ['./map3d.component.scss'],
  providers: [TuiDestroyService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Map3dComponent implements AfterViewInit {
  @ViewChild('canvas', { static: true }) canvas?: ElementRef<HTMLCanvasElement>;

  constructor(
    private readonly engineService: EngineService,
    private readonly gameService: GameService,
    private readonly tuiDestroyService: TuiDestroyService
  ) {}

  ngAfterViewInit(): void {
    if (!this.canvas) return;
    this.engineService
      .settings()
      .pipe(
        takeUntil(this.tuiDestroyService),
        filter(
          (settings) => !!(settings.sizeX && settings.sizeY && this.canvas)
        ),
        first(),
        tap((settings) => {
          if (settings.sizeX && settings.sizeY && this.canvas) {
            this.engineService.createScene(this.canvas, {
              x: settings.sizeX,
              y: settings.sizeY,
            });
            this.engineService.animate();
          }
        })
      )
      .subscribe();
  }
}
