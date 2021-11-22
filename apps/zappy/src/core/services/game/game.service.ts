import { Injectable, OnDestroy } from '@angular/core';
import { WebsocketService } from '../websocket/websocket.service';
import {
  BehaviorSubject,
  filter,
  of,
  Observable,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { map } from 'rxjs/operators';
import { SoundService } from '../sound/sound.service';
import { LoggerService } from '../logger/logger.service';

export interface Team {
  color: string;
  name: string;
}

export interface GameSettings {
  sizeX?: number;
  sizeY?: number;
  teams: Team[];
  speed: number;
}

export interface Player {
  color: string;
  team: string;
  level: number;
  direction:
    | 'tuiIconArrowDownLarge'
    | 'tuiIconArrowLeftLarge'
    | 'tuiIconArrowRightLarge'
    | 'tuiIconArrowUpLarge';
  id: number;
  inventory: Record<string, number>;
}

export interface Cell {
  id: number;
  res: Record<string, number>;
  players: Player[];
}
export interface ChatMessage {
  team: string;
  color: string;
  id: number;
  text: string;
  timestamp: number;
}
@Injectable({
  providedIn: 'root',
})
export class GameService implements OnDestroy {
  private gameSettings$ = new BehaviorSubject<GameSettings>({
    teams: [],
    speed: 0,
  });
  private messages$ = new BehaviorSubject<ChatMessage[]>([]);
  private worldMap$ = new BehaviorSubject<Cell[]>([]);
  private players$ = new BehaviorSubject<{ [index: number]: Player }>({});
  private info$ = new Subject<{
    id: number;
    type: 'player' | 'cell' | 'empty';
  }>();
  width = 0;
  private readonly destroy$ = new Subject<void>();
  constructor(
    private readonly websocketService: WebsocketService,
    private readonly soundService: SoundService,
    private readonly loggerService: LoggerService
  ) {
    this.websocketService
      .on('msz')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const { x: sizeX, y: sizeY } = <{ x: number; y: number }>data;
          this.width = sizeX;
          const settings = this.gameSettings$.value;
          settings.sizeX = sizeX;
          settings.sizeY = sizeY;
          this.gameSettings$.next(settings);
          this.worldMap$.next(
            Array.from({ length: sizeX * sizeY }, (_, index) => ({
              id: index,
              res: {},
              players: [],
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
          const worldMap = this.worldMap$.value;
          const { x, y, resources } = <any>data;
          worldMap[x + y * this.width].res = resources;
          this.worldMap$.next([...worldMap]);
        })
      )
      .subscribe();

    websocketService
      .on<Team>('tna')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const settings = this.gameSettings$.value;
          settings.teams?.push(data);
          this.gameSettings$.next(settings);
          this.loggerService.addMessage('Team: "' + data.name + '" join game');
        })
      )
      .subscribe();

    websocketService
      .on<Player & { x: number; y: number }>('pnw')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const player = data;
          const { x, y } = data;
          player.color =
            '#' +
              this.gameSettings$.value.teams.find(
                (team) => team.name === player.team
              )?.color ?? '#00000';
          player.inventory = {};
          const worldMap = this.worldMap$.value;
          worldMap[x + y * this.width].players.push(player);
          const players = this.players$.value;
          players[player.id] = player;
          this.players$.next({ ...players });
          this.worldMap$.next([...worldMap]);
          this.loggerService.addMessage(
            'Player: "' + player.id + '" join ' + player.team + ' team'
          );
        })
      )
      .subscribe();

    websocketService
      .on<Pick<Player, 'id' | 'direction'> & { x: number; y: number }>('ppo')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const { x, y, id, direction } = data;
          const worldMap = this.worldMap$.value;
          const cellIndex = worldMap.findIndex((cell) =>
            cell.players.find((pl) => pl.id === id)
          );
          if (cellIndex !== -1) {
            let cellPlayers = worldMap[cellIndex].players;
            const pIndex = cellPlayers.findIndex((pl) => pl.id === id);
            const player = cellPlayers[pIndex];
            cellPlayers = cellPlayers.filter((pl) => pl.id !== id);
            const players = this.players$.value;
            worldMap[cellIndex].players = cellPlayers;
            if (player) {
              player.direction = direction;
              worldMap[x + y * this.width].players.push(player);
              players[player.id] = { ...players[player.id], ...data };
            }
            this.worldMap$.next([...worldMap]);
            this.players$.next({ ...players });
          }
        })
      )
      .subscribe();

    websocketService
      .on<{ id: number; level: number }>('plv')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const worldMap = this.worldMap$.value;
          const players = this.players$.value;
          const player = worldMap
            .find((cell) => cell.players.find((pl) => pl.id === data.id))
            ?.players.find((pl) => pl.id === data.id);
          if (player) {
            player.level = data.level;
            players[player.id].level = data.level;
            this.worldMap$.next([...worldMap]);
            this.players$.next({ ...players });
          }
        })
      )
      .subscribe();

    websocketService
      .on<Player>('pin')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const worldMap = this.worldMap$.value;
          const players = this.players$.value;
          const player = worldMap
            .find((cell) => cell.players.find((pl) => pl.id === data.id))
            ?.players.find((pl) => pl.id === data.id);
          if (player) {
            player.inventory = data.inventory;
            players[player.id].inventory = data.inventory;
            this.worldMap$.next([...worldMap]);
            this.players$.next({ ...players });
          }
        })
      )
      .subscribe();
    websocketService
      .on<ChatMessage>('pbc')
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          const messages = this.messages$.value;
          const players = this.players$.value;
          const message = {
            team: players[data.id].team,
            color: players[data.id].color,
            id: data.id,
            text: data.text,
            timestamp: data.timestamp,
          };
          this.soundService.message();
          this.messages$.next([...messages, message]);
        })
      )
      .subscribe();
    websocketService
      .on<{ speed: number }>('sgt')
      .pipe(
        takeUntil(this.destroy$),
        tap((speed) => {
          this.gameSettings$.next({ ...this.gameSettings$.value, ...speed });
        })
      )
      .subscribe();
    websocketService
      .on<{ id: number }>('pdi')
      .pipe(
        takeUntil(this.destroy$),
        tap(({ id }) => {
          const worldMap = this.worldMap$.value;
          const cellIndex = worldMap.findIndex((cell) =>
            cell.players.find((pl) => pl.id === id)
          );
          if (cellIndex !== -1) {
            let cellPlayers = worldMap[cellIndex].players;
            cellPlayers = cellPlayers.filter((pl) => pl.id !== id);
            const players = this.players$.value;
            worldMap[cellIndex].players = cellPlayers;
            this.loggerService.addMessage(
              'Player ' + id + ' from ' + players[+id].team + ' dead'
            );
            delete players[+id];
            this.worldMap$.next([...worldMap]);
            this.players$.next({ ...players });
          }
        })
      )
      .subscribe();
  }

  settings(): Observable<GameSettings> {
    return this.gameSettings$.asObservable();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  worldMap() {
    return this.worldMap$.asObservable();
  }

  players() {
    return this.players$.asObservable();
  }
  messages() {
    return this.messages$.asObservable();
  }

  info(): Observable<
    { type: 'player'; data: Player } | { type: 'cell'; data: Cell } | undefined
  > {
    return this.info$.pipe(
      switchMap(({ id, type }) => {
        if (type === 'cell')
          return this.worldMap$.asObservable().pipe(
            map((data) => data.find((item) => item.id === id)),
            map((data) => {
              if (data) return { type, data };
              return void 0;
            })
          );
        if (type === 'player')
          return this.players$.asObservable().pipe(
            map((data) => data[id]),
            map((data) => {
              if (data) return { type, data };
              return void 0;
            })
          );
        return of(undefined);
      })
    );
  }
  setInfo(id: number, type: 'player' | 'cell' | 'empty') {
    this.info$.next({ id, type });
  }
  increaseSpeed() {
    this.websocketService.send('sst', this.gameSettings$.value.speed * 2);
  }
  decreaseSpeed() {
    this.websocketService.send('sst', this.gameSettings$.value.speed * 0.5);
  }
}
