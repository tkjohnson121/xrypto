import { WebSocketChannelName, WebSocketEvent } from 'coinbase-pro-node';
import { RequestSigner } from 'coinbase-pro-node/dist/auth/RequestSigner';
import { ErrorEvent } from 'reconnecting-websocket';
import { authConfig, WebSocketClient } from './coinbase';
import { log } from './utils';

export type Tick = {
  type: string;
  sequence: number;
  product_id: string;
  price: string;
  open_24h: string;
  volume_24h: string;
  low_24h: string;
  high_24h: string;
  volume_30d: string;
  best_bid: string;
  best_ask: string;
  side: string;
  time: string;
  trade_id: number;
  last_size: string;
};

export type TickerProps = {
  product: string;
  onTick: (data: Tick) => Promise<any> | any;
  onError: (error: ErrorEvent) => Promise<any> | any;
};

export class Ticker {
  constructor({ product, onTick, onError }: TickerProps) {
    this.product = product;
    this.onTick = onTick;
    this.onError = onError;
  }

  running = false;
  client?: WebSocketClient;
  product: string;
  onTick: (data: Tick) => Promise<any>;
  onError: (error: ErrorEvent) => Promise<any>;

  getSubscriptions() {
    return [
      {
        name: WebSocketChannelName.TICKER,
        product_ids: [this.product],
      },
      {
        name: WebSocketChannelName.HEARTBEAT,
        product_ids: [this.product],
      },
    ];
  }

  start() {
    this.running = true;
    // open a new client
    this.client = new WebSocketClient(
      process.env.CB_WS_URL || 'wss://ws-feed-public.sandbox.pro.coinbase.com',
      async (requestSetup) =>
        RequestSigner.signRequest(authConfig, requestSetup, 0),
    );

    log.onInfo(
      `Subscribing to ${this.product}: ${this.getSubscriptions()
        .map((sub) => sub.name)
        .join(' | ')}`,
    );

    this.client.connect();

    // subscribe to our ticker
    this.client.on(WebSocketEvent.ON_OPEN, () => {
      // 7. Subscribe to WebSocket channel
      this.client?.subscribe(this.getSubscriptions());
    });

    // tick when new data is available
    this.client.on(WebSocketEvent.ON_MESSAGE, async (data) => {
      if (data.type === 'ticker') await this.onTick(data as Tick);
    });

    // re-connect if the connection is closed by accident
    this.client.on(WebSocketEvent.ON_CLOSE, (event) => {
      log.onWarning('WebSocket has disconnected. Attempting to Reconnect.');
      if (this.running) {
        this.client?.disconnect();
        this.client?.connect();
      }
    });

    // error handling
    this.client.on(WebSocketEvent.ON_ERROR, async (error) => {
      this.running = false;
      await this.onError(error);
    });
  }

  // close the connection
  stop() {
    this.running = false;
    this.client?.disconnect();
  }
}
