import { RequestSigner } from 'coinbase-pro-node/dist/auth/RequestSigner';
import { ErrorEvent } from 'reconnecting-websocket';
import {
  authConfig,
  WebSocketChannelName,
  WebSocketClient,
  WebSocketEvent,
  WebSocketResponse,
} from './coinbase';
import { log } from './utils';

export type FeedProps = {
  product: string;
  onUpdate: (data: WebSocketResponse) => any;
  onError: (error: ErrorEvent) => any;
};

export class Feed {
  constructor(props: FeedProps) {
    this.product = props.product;
    this.onUpdate = props.onUpdate;
    this.onError = props.onError;
  }

  running = false;
  product: string;
  onUpdate: (data: WebSocketResponse) => any;
  onError: (error: ErrorEvent) => any;
  client?: WebSocketClient;

  async start() {
    this.running = true;
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

    // subscribe to our sockets on open
    this.client.on(WebSocketEvent.ON_OPEN, () => {
      // 7. Subscribe to WebSocket channel
      this.client?.subscribe(this.getSubscriptions());
    });

    // tick when new data is available
    this.client.on(WebSocketEvent.ON_MESSAGE, async (data) => {
      if (data.type === 'heartbeat') return;
      await this.onUpdate(data);
    });

    this.client.on(WebSocketEvent.ON_CLOSE, (event) => {
      log.onWarning('WebSocket has disconnected. Attempting to Reconnect.');

      // re-connect if the connection is closed by accident
      if (this.running) {
        this.client?.disconnect();
        this.client?.connect();
      }
    });

    // error handling
    this.client.on(WebSocketEvent.ON_ERROR, async (error) => {
      this.onError(error);
    });

    this.client.connect();
  }

  stop() {
    this.running = false;
    this.client?.disconnect();
  }

  getSubscriptions() {
    return [
      {
        name: WebSocketChannelName.USER,
        product_ids: [this.product],
      },
      {
        name: WebSocketChannelName.HEARTBEAT,
        product_ids: [this.product],
      },
    ];
  }
}
