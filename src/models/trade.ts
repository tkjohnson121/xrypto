export type TradeValues = {
  price: number;
  time: number;
  size: number;
};

export class Trade {
  constructor({ price, time, size }: TradeValues) {
    this.state = 'open';
    this.price = price;
    this.size = size;
    this.time = time;
  }

  state: 'open' | 'closed';
  price: number;
  time: number;
  size: number;
}
