import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { GameModule } from '../game/game.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    // ClientsModule.register([{
    //   name: 'HELLO_SERVICE', transport: Transport.TCP, options: {
    //     port: 4242
    //   }
    // }])
    GameModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
