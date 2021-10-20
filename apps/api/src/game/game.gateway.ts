import {
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { GameService } from './game.service';
import { WsMessage } from './game.interfaces';
import { interval, mapTo, Observable, timer } from 'rxjs';

@WebSocketGateway()
export class GameGateway {
  constructor(private readonly gameService: GameService) {}

  // handleConnection(client: WebSocket): WsMessage<string> {
  //   console.log('message sended');
  //   client.send(JSON.stringify({ event: 'test', data: 'wow' }));
  //   return { event: 'test', data: 'wow' };
  // }
  @SubscribeMessage('connect')
  connect(@MessageBody() team: string) {
    console.log(team);
    return { event: 'test', data: 'wow' };
  }
}
