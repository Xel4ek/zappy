import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @EventPattern('message_printed')
  async handleMessagePrinted(data: Record<string, unknown>) {
    console.log('from mock services: ', data.text);
  }
  @MessagePattern('data')
  getDate(@Payload() data: any) {
    console.log(`Subject: ${data}`); // e.g. "time.us.east"
    return 'new Date().toLocaleTimeString(...);';
  }
}
