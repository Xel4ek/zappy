import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { ClientsModule } from '@nestjs/microservices';
import { GameController } from './game.controller';
import { GameServerClient } from './game.server';
import { environment } from '../environments/environment';

class Serializer {
  serialize(data) {
    // console.log('serialize', data, data.data);
    return data.data;
  }
}

@Module({
  providers: [GameGateway, GameService, GameController],
  imports: [
    ClientsModule.register([
      {
        name: 'GAME_SERVICE',
        customClass: GameServerClient,
        options: {
          ...environment.gameServer,
          serializer: new Serializer(),
        },
      },
    ]),
  ],
  controllers: [GameController],
})
export class GameModule {}
