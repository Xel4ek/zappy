import { Injectable, OnDestroy } from '@angular/core';
import { WebsocketService } from '../websocket/websocket.service';
import {
  BehaviorSubject,
  Observable,
  ReplaySubject,
  Subject,
  takeUntil,
  tap,
} from 'rxjs';

export interface Team {
  color: string;
  name: string;
}
export interface GameSettings {
  sizeX?: number;
  sizeY?: number;
  teams: Team[];
}
export interface Cell {
  id: number;
  res: Record<string, number>;
}
@Injectable({
  providedIn: 'root',
})
export class GameService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  gameSettings = new BehaviorSubject<GameSettings>({
    teams: [],
  });
  worldMapSubject = new BehaviorSubject<Cell[]>([]);
  width = 0;
  // game: GameStore = {
  //   sizeY: 0,
  //   sizeX: 0,
  // };
  constructor(private readonly websocketService: WebsocketService) {
    websocketService
      .on('test', () => ({
        event: 'connect',
        data: 'data',
      }))
      .pipe(tap(console.log))
      .subscribe();
    this.websocketService
      .on('msz')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const { x: sizeX, y: sizeY } = <{ x: number; y: number }>data;
          this.width = sizeX;
          const settings = this.gameSettings.value;
          settings.sizeX = sizeX;
          settings.sizeY = sizeY;
          this.gameSettings.next(settings);
          this.worldMapSubject.next(
            Array.from({ length: sizeX * sizeY }, (_, index) => ({
              id: index,
              res: {},
            }))
          );
        })
      )
      .subscribe();

    websocketService
      .on('bct')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const worldMap = this.worldMapSubject.value;
          const { x, y, resources } = <any>data;
          worldMap[x + y * this.width].res = resources;
          this.worldMapSubject.next(worldMap);
        })
      )
      .subscribe();

    websocketService
      .on<Team>('tna')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const settings = this.gameSettings.value;
          settings.teams?.push(data);
          this.gameSettings.next(settings);
        })
      )
      .subscribe();
  }
  settings(): Observable<GameSettings> {
    return this.gameSettings.asObservable();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  worldMap() {
    return this.worldMapSubject.asObservable();
  }
}
