import { Socket } from 'net';
import { StringDecoder } from 'string_decoder';
import {
  CLOSE_EVENT,
  CONNECT_EVENT,
  DATA_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
} from '@nestjs/microservices/constants';
import { NetSocketClosedException } from '@nestjs/microservices/errors/net-socket-closed.exception';
import { CorruptedPacketLengthException } from '@nestjs/microservices/errors/corrupted-packet-length.exception';
import { InvalidJSONFormatException } from '@nestjs/microservices/errors/invalid-json-format.exception';

export class CustomSocket {
  private contentLength: number | null = null;
  private isClosed = false;
  private buffer = '';

  private readonly stringDecoder = new StringDecoder();
  private readonly delimiter = '\n';

  public get netSocket() {
    return this.socket;
  }

  constructor(public readonly socket: Socket) {
    this.socket.on(DATA_EVENT, this.onData.bind(this));
    this.socket.on(CONNECT_EVENT, () => (this.isClosed = false));
    this.socket.on(CLOSE_EVENT, () => (this.isClosed = true));
    this.socket.on(ERROR_EVENT, () => (this.isClosed = true));
  }

  public connect(port: number, host: string) {
    this.socket.connect(port, host);
    return this;
  }

  public on(event: string, callback: (err?: any) => void) {
    this.socket.on(event, callback);
    return this;
  }

  public once(event: string, callback: (err?: any) => void) {
    this.socket.once(event, callback);
    return this;
  }

  public end() {
    this.socket.end();
    return this;
  }

  public sendMessage(message: any, callback?: (err?: any) => void) {
    if (this.isClosed) {
      callback && callback(new NetSocketClosedException());
      return;
    }
    this.socket.write(this.formatMessageData(message), 'utf-8', callback);
  }

  private onData(dataRaw: Buffer | string) {
    const data = Buffer.isBuffer(dataRaw)
      ? this.stringDecoder.write(dataRaw)
      : dataRaw;

    try {
      this.handleData(data);
    } catch (e) {
      this.socket.emit(ERROR_EVENT, e.message);
      this.socket.end();
    }
  }

  private handleData(data: string) {
    this.buffer += data;
    if (this.contentLength == null) {
      const i = this.buffer.indexOf(this.delimiter);
      if (i !== -1) {
        const rawContentLength = this.buffer;
        this.contentLength = i + 1;

        if (isNaN(this.contentLength)) {
          this.contentLength = null;
          this.buffer = '';
          throw new CorruptedPacketLengthException(rawContentLength);
        }
      }
    }

    if (this.contentLength !== null) {
      const length = this.buffer.length;

      if (length === this.contentLength) {
        this.handleMessage(this.buffer);
      } else if (length > this.contentLength) {
        const message = this.buffer.substring(0, this.contentLength);
        const rest = this.buffer.substring(this.contentLength);
        this.handleMessage(message);
        this.onData(rest);
      }
    }
  }

  private handleMessage(data: string) {
    this.contentLength = null;
    this.buffer = '';

    let message: Record<string, unknown>;
    try {
      message = { pattern: 'gameSeverMessage', data: data.slice(0, -1) };
    } catch (e) {
      throw new InvalidJSONFormatException(e, data);
    }
    message = message || {};
    this.socket.emit(MESSAGE_EVENT, message);
  }

  private formatMessageData(message: any) {
    return message.toString() + '\n';
  }
}
