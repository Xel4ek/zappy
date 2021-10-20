import { Controller, Get } from '@nestjs/common';

import { Message } from '@zappy/api-interfaces';

import { AppService } from './app.service';
import { ClientProxy, Client, Transport } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  // @Client({
  //   transport: Transport.TCP,
  //   options: {
  //     port: 4242,
  //   },
  // })
  // client: ClientProxy;
  // async onApplicationBootstrap() {
  //   await this.client.connect();
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
