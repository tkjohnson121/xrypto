import { NewOrder, OrderAPI } from 'coinbase-pro-node';
import { ErrorEvent } from 'reconnecting-websocket';
import { v1 } from 'uuid';
import { OrderSide, OrderType, privateClient } from './coinbase';
import { log } from './utils';

type BaseOrder = {
  type: 'match' | 'received' | 'done';
  side: 'buy' | 'sell';
  time: string;
  sequence: number;
  profile_id: string;
  user_id: string;
};

type ReceivedOrder = BaseOrder & {
  product_id: string;
  order_id: string;
  order_type: 'market' | 'limit';
  funds: string;
  client_oid: string;
};

export type BrokerProps = {
  isLive: boolean;
  product: string;
  orderType: OrderType;
};

export class Broker {
  constructor(props: BrokerProps) {
    this.product = props.product;
    this.isLive = props.isLive;
    this.orderType = 'LIMIT';
    this.state = 'idle';
    this.orders = {};
    this.tokens = {};
    this.callbacks = {};

    this.client = privateClient.rest.order;
  }

  client: OrderAPI;
  state: 'idle' | 'running' | 'buying' | 'selling';
  product: string;
  orderType: 'LIMIT' | 'MARKET';
  isLive: boolean;
  tokens: { [token: string]: 'buy' | 'sell' };
  orders: { [token: string]: ReceivedOrder };
  callbacks: {
    [token: string]: (order: ReceivedOrder) => any;
  };

  start() {
    this.state = 'running';
  }

  async buy(trade: { price: number; funds: number }) {
    const { price, funds } = trade;

    if (!this.isLive) {
      return { funds, price };
    } else if (this.state !== 'running') {
      return log.onWarning(
        `Broker is ${this.state}. Please wait to place a new order`,
      );
    } else {
      this.state = 'buying';
    }

    try {
      const token = v1();

      const marketOrder = this.generateOrder({ token, funds });

      const order = await this.client.placeOrder({
        ...marketOrder,
        type: OrderType.MARKET,
        side: OrderSide.BUY,
      } as NewOrder);

      return order;
    } catch (error) {
      this.onError(error);
    } finally {
      this.state = 'running';
    }
  }

  async sell(trade: { price: number; size: number }) {
    const { price, size } = trade;

    if (!this.isLive) {
      return { funds: size, price };
    } else if (this.state !== 'running') {
      log.onWarning(
        `Broker is ${this.state}. Please wait to place a new order`,
      );

      return;
    } else {
      this.state = 'selling';
    }

    try {
      const token = v1();
      const product = await privateClient.rest.product.getProduct(this.product);
      const baseIncrement = product?.base_increment.split('.')[1];
      const incrementLength = (baseIncrement || '0.001').length;
      const sellAmount = parseFloat((size / price).toFixed(incrementLength));

      const marketOrder = this.generateOrder({ token, size: sellAmount });

      const order = await this.client.placeOrder({
        ...marketOrder,
        type: OrderType.MARKET,
        side: OrderSide.SELL,
      } as NewOrder);

      return order;
    } catch (error) {
      this.onError(error);
    } finally {
      this.state = 'running';
    }
  }

  generateOrder(options: { token: string; funds?: number; size?: number }) {
    const order = {
      product_id: this.product,
      client_oid: options.token,
      funds: options.funds ? String(options.funds) : undefined,
      size: typeof options.size === 'number' ? String(options.size) : undefined,
    };

    return order;
  }

  onError(error: ErrorEvent) {
    log.onError(error);
  }
}
