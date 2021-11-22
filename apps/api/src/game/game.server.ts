import {
  ClientProxy,
  ClientTCP,
  JsonSocket,
  PacketId,
  ReadPacket,
  TcpClientOptions,
  WritePacket,
} from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import {
  CLOSE_EVENT,
  ECONNREFUSED,
  ERROR_EVENT,
  MESSAGE_EVENT,
  TCP_DEFAULT_HOST,
  TCP_DEFAULT_PORT,
} from '@nestjs/microservices/constants';
import { EmptyError, lastValueFrom, share, tap } from 'rxjs';
import * as net from 'net';
import { CustomSocket } from './custom-socket';
import { EventEmitter2 } from '@nestjs/event-emitter';

export class GameServerClient extends ClientProxy {
  protected connection: Promise<any>;
  private readonly logger = new Logger(ClientTCP.name);
  private readonly port: number;
  private readonly host: string;
  private isConnected = false;
  private socket: CustomSocket;
  private emitter: EventEmitter2;
  constructor(
    options: TcpClientOptions['options']
    // private readonly eventEmitter: EventEmitter2
  ) {
    super();
    this.port = this.getOptionsProp(options, 'port') || TCP_DEFAULT_PORT;
    this.host = this.getOptionsProp(options, 'host') || TCP_DEFAULT_HOST;

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }
  public addEmitter(emitter: EventEmitter2) {
    this.emitter = emitter;
  }
  public connect(): Promise<any> {
    if (this.isConnected && this.connection) {
      return this.connection;
    }
    this.socket = this.createSocket();
    this.bindEvents(this.socket);

    const source$ = this.connect$(this.socket.netSocket).pipe(
      tap(() => {
        this.isConnected = true;
        this.socket.on(MESSAGE_EVENT, (buffer: WritePacket & PacketId) =>
          this.handleResponse(buffer)
        );
      }),
      share()
    );

    this.socket.connect(this.port, this.host);
    this.connection = lastValueFrom(source$).catch((err) => {
      if (err instanceof EmptyError) {
        console.error(err);
      }
      // }
      // throw err;
      return;
    });

    return this.connection;
  }

  public async handleResponse(buffer: unknown): Promise<void> {
    if (this.emitter) {
      const { pattern, data } = <{ pattern: string; data: string }>buffer;
      this.emitter.emit(pattern, data);
    }
    const { err, response, isDisposed, id } =
      await this.deserializer.deserialize(buffer);
    const callback = this.routingMap.get(id);
    if (!callback) {
      return undefined;
    }
    if (isDisposed || err) {
      return callback({
        err,
        response,
        isDisposed: true,
      });
    }
    callback({
      err,
      response,
    });
  }

  public createSocket(): CustomSocket {
    return new CustomSocket(new net.Socket());
  }

  public close() {
    this.socket && this.socket.end();
    this.handleClose();
  }

  public bindEvents(socket: CustomSocket) {
    socket.on(
      ERROR_EVENT,
      (err: any) => err.code !== ECONNREFUSED && this.handleError(err)
    );
    socket.on(CLOSE_EVENT, () => this.handleClose());
  }

  public handleError(err: any) {
    this.logger.error(err);
  }

  public handleClose() {
    this.isConnected = false;
    this.socket = null;
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any
  ): () => void {
    try {
      const packet = this.assignPacketId(partialPacket);
      const serializedPacket = this.serializer.serialize(packet);

      this.routingMap.set(packet.id, callback);
      this.socket.sendMessage(serializedPacket);
      return () => this.routingMap.delete(packet.id);
    } catch (err) {
      callback({ err });
    }
  }

  protected async dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket = this.serializer.serialize({
      ...packet,
      pattern,
    });
    return this.socket.sendMessage(serializedPacket);
  }
}
