import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { GameService } from './game.service';
import { WsMessage } from './game.interfaces';

@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly gameService: GameService) {}

  async handleConnection(client: WebSocket): Promise<WsMessage<string>> {
    this.gameService.addClients(client);
    await this.gameService.connect();
    return { event: 'test', data: 'wow' };
  }

  @SubscribeMessage('connect')
  connect(@MessageBody() team: string) {
    // console.log(team);
    return { event: 'test', data: 'wow' };
  }

  handleDisconnect(client: WebSocket): any {
    this.gameService.disconnect();
  }
  @SubscribeMessage('sst')
  changeSpeed(@MessageBody() speed: number) {
    this.gameService.setSpeed(speed);
  }
}
