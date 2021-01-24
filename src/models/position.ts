import { getDatetime, log } from './../utils';
import { Trade, TradeValues } from './trade';

type PositionProps = {
  trade: Trade;
  id: string | number;
  product: string;
  signal: PositionSignal;
};

export type PositionSignal = { penu: number; last: number };

export class Position {
  constructor({ trade, id, product, signal }: PositionProps) {
    this.state = 'OPEN';
    this.enter = trade;
    this.id = id;
    this.product = product;
    this.signal = signal;
  }

  id: string | number;
  state: 'OPEN' | 'CLOSED';
  enter: Trade;
  exit?: Trade;
  product: string;
  signal: { penu?: number; last: number };

  close(trade: Trade) {
    this.state = 'CLOSED';
    this.exit = trade;
  }

  getProfits(tradeValues?: TradeValues) {
    const fee = 0.005;
    const entrance = (this.enter.size / this.enter.price) * (1 + fee);

    if (this.exit) {
      const exit = (this.exit.size / this.exit.price) * (1 - fee);

      return exit - entrance;
    } else if (tradeValues) {
      const exit = (tradeValues.size / tradeValues.price) * (1 - fee);

      return exit - entrance;
    } else {
      return 0;
    }
  }

  getProfitString(tradeValues?: TradeValues) {
    const profits = this.getProfits(tradeValues);
    const profitStr = String(profits);

    return profitStr.length < 5 ? profits.toFixed(5) : profits.toFixed(10);
  }

  print() {
    let profit = '';
    const base = this.product.split('-')[0];
    const quote = this.product.split('-')[1];
    const tradeAmount =
      this.enter.size < 1
        ? this.enter.size * this.enter.price
        : this.enter.size / this.enter.price;

    if (this.state === 'CLOSED') {
      const profNum = this.getProfitString();
      const color = this.getProfits() > 0 ? log.successColor : log.errorColor;

      profit = color(`${profNum} ${quote}`);
    } else {
      profit = 'N/A';
    }

    log.onInfo(
      `Position: ${this.id}
      \tState: ${this.state}
      \tSize: ${this.enter.size} ${quote}
      \tAmount: ${tradeAmount} ${base}
      \tEnter: ${this.enter.price} ${quote} | ${getDatetime(this.enter.time)}
      \tExit: ${
        this.exit
          ? `${this.exit.price} ${quote} | ${getDatetime(this.exit.time)}`
          : 'N/A'
      }
      \tProfit: ${profit}`,
    );
  }
}
