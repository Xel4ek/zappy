import { Injectable } from '@angular/core';
import { WebsocketService } from '../websocket/websocket.service';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  constructor(private readonly websocketService: WebsocketService) {
    websocketService
      .on('test', () => ({
        event: 'connect',
        data: 'data',
      }))
      .pipe(tap(console.log))
      .subscribe();
  }
}
