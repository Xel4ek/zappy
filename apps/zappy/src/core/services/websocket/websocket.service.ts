import { Inject, Injectable } from '@angular/core';
import { config } from './websocket.token';
import {
  webSocket,
  WebSocketSubject,
  WebSocketSubjectConfig,
} from 'rxjs/webSocket';
import { MonoTypeOperatorFunction, Observable, ReplaySubject } from 'rxjs';
import { delay, map, retryWhen, share } from 'rxjs/operators';
import { WebSocketConfig, WsMessage } from './websocket.interfaces';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private static readonly baseEvent = 'me.z-wave.';

  private readonly websocket$: WebSocketSubject<WsMessage<unknown>>;
  private readonly configuration: WebSocketSubjectConfig<WsMessage<unknown>>;
  private readonly connect$ = new ReplaySubject<boolean>(1);
  private RECONNECT_INTERVAL = 3_000;
  constructor(@Inject(config) private readonly wsConfig: WebSocketConfig) {
    this.connect$.next(false);
    this.configuration = {
      openObserver: {
        next: () => this.connect$.next(true),
      },
      closeObserver: {
        next: () => this.connect$.next(false),
      },
      url: this.wsConfig.url,
    };
    this.websocket$ = webSocket<WsMessage<unknown>>(this.configuration);
  }

  on<T>(
    event: string,
    subMsg: () => unknown = () => null,
    unsubMsg: () => unknown = () => null
  ): Observable<T> {
    return this.websocket$
      .multiplex(
        subMsg,
        unsubMsg,
        (value) => !!(value.type ?? value.event)?.startsWith(event)
      )
      .pipe(
        share(),
        map((value) => value?.data as T),
        this.reconnect(this.RECONNECT_INTERVAL)
      );
  }

  send<T>(event: string, data: T): void {
    this.websocket$.next({ event, data });
  }

  private reconnect<T>(reconnectInterval: number): MonoTypeOperatorFunction<T> {
    return retryWhen((errors) => errors.pipe(delay(reconnectInterval)));
  }
  isConnect(): Observable<boolean> {
    return this.connect$.asObservable();
  }
}
