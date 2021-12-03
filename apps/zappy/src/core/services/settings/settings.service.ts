import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private _settings$ = new BehaviorSubject<{ mode: '2d' | '3d' }>({
    mode: '3d',
  });
  settings() {
    return this._settings$.asObservable();
  }
  setMode(mode: '2d' | '3d') {
    this._settings$.next({ ...this._settings$.value, mode });
  }
}
