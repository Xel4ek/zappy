import { Controller, Get } from '@nestjs/common';

import { Message } from '@zappy/api-interfaces';

import { AppService } from './app.service';
import {
  ClientProxy,
  Client,
  Transport,
  EventPattern,
  MessagePattern,
} from '@nestjs/microservices';
import { mapTo, timer } from 'rxjs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  // @Client({
  //   transport: Transport.TCP,
  // })
  // client: ClientProxy;
  // // async onApplicationBootstrap() {
  // //   await this.client.connect();
  // // }
  //
  // @EventPattern('gameServer')
  // @MessagePattern('gameServer')
  // async gameServer(data: any) {
  //   console.log('gameServer', data);
  //   return { pattern: 'gameServerResponse', data };
  //   await this.client.connect();
  //   this.client.emit('gameServerResponse', data);
  //   return timer(100).pipe(mapTo(data));
  // }

  // @Get('wow')
  // getHello() {
  //   this.client.emit<any>('message_printed', new Message('Hello World'));
  //   return 'Hello World printed';
  // }
  @Get('hello')
  getData(): any {
    return 'hello';
  }
}
