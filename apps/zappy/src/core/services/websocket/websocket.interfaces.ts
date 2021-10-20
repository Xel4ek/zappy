export interface WsMessage<T> {
  event?: string;
  data: T;
  type?: string;
}
export interface WebSocketConfig {
  url: string;
}
