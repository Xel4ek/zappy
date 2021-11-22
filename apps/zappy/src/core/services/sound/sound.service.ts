import { Injectable } from '@angular/core';
import { Howl, Howler } from 'howler';

@Injectable({
  providedIn: 'root',
})
export class SoundService {
  private _click = new Howl({
    src: ['/assets/mixkit-plastic-bubble-click-1124.wav'],
  });
  private _message = new Howl({
    src: ['/assets/mixkit-positive-tech-alert-3218.wav'],
  });
  private _background = new Howl({
    src: ['/assets/ForestWalk-320bit.mp3'],
    autoplay: true,
    loop: true,
    volume: 0.1,
  });
  constructor() {}

  click() {
    this._click.play();
  }
  setVolume(value: number) {
    Howler.volume(value / 100);
  }
  message() {
    this._message.play();
  }
}
