import { ElementRef, Injectable, NgZone } from '@angular/core';
import { Engine, Scene } from 'babylonjs';
@Injectable({
  providedIn: 'root',
})
export class EngineService {
  engine?: Engine;
  constructor(private readonly ngZone: NgZone) {}
  bind(canvas: ElementRef<HTMLCanvasElement>) {
    this.engine = new Engine(canvas.nativeElement, true);
  }
  start(scene: Scene) {
    this.ngZone.runOutsideAngular(() => {
      this.engine?.runRenderLoop(() => scene.render());
    });
  }
}
