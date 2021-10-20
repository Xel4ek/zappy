import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { EngineService } from '../../services/engine/engine.service';
import { Scene } from 'babylonjs';

@Component({
  selector: 'zappy-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas', { static: true }) canvas?: ElementRef<HTMLCanvasElement>;
  private scene?: Scene;

  constructor(private readonly engineService: EngineService) {}
  ngOnInit(): void {}

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
}
