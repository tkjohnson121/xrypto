import { CandleStick, Position, TradeValues } from '../models';
import { privateClient } from './../coinbase';
import { PositionSignal } from './../models/position';
import { Trade } from './../models/trade';
import { getAccountInfo, getDatetime, log } from './../utils';

export type StrategyProps = {
  onBuySignal: OnSignal;
  onSellSignal: OnSignal;
  funds: number;
  product: string;
};

export type SignalProps = TradeValues & {
  position?: Position;
  signal: PositionSignal;
};

export type OnSignal = (options: SignalProps) => any;

export type RunProps = {
  sticks: CandleStick[];
  time: number;
};

export class Strategy {
  constructor({ onBuySignal, onSellSignal, funds, product }: StrategyProps) {
    this.onBuySignal = onBuySignal;
    this.onSellSignal = onSellSignal;
    this.positions = {};
    this.funds = funds;
    this.product = product;
    this.base = product.split('-')[0];
    this.quote = product.split('-')[1];
  }

  onBuySignal: OnSignal;
  onSellSignal: OnSignal;
  positions: { [key: string]: Position };
  funds: number;
  product: string;
  base: string;
  quote: string;

  async run(options: RunProps) {}

  async getTrade(price: number) {
    const base = this.product.split('-')[0];
    const quote = this.product.split('-')[1];

    const totalSpent = this.getOpenPositions().reduce(
      (prev, curr) => prev + curr.pos.enter.size,
      0,
    );

    const { accounts } = await getAccountInfo();
    const quoteBalance = this.funds
      ? this.funds - totalSpent
      : parseFloat(
          accounts?.find((act) => act.currency === this.quote)?.balance ||
            '0.0',
        );
    const baseBalance = parseFloat(
      accounts?.find((act) => act.currency === this.base)?.balance || '0.0',
    );

    const amount = (quoteBalance * 0.2) / price;
    const product = await privateClient.rest.product.getProduct(this.product);
    const minBuy = parseFloat(product?.min_market_funds || '0.00');

    // 0.0001000 -> 0001
    const quoteIncrement = product?.quote_increment || '0.01';
    const incrementLength =
      quoteIncrement.substr(2, quoteIncrement.indexOf('1')).length - 1;
    const preCost = parseFloat((amount * price).toFixed(incrementLength));
    const cost = parseFloat(String(preCost >= minBuy ? preCost : minBuy));

    if (quoteBalance <= 0.0 || quoteBalance < cost) {
      log.onWarning(`Not enough ${quote} to cover Buy:
        ${quote} Balance: ${quoteBalance} ${quote}
        ${base} Balance: ${baseBalance} ${base}
        Price: ${price}
        Total Spent: ${totalSpent} ${quote}
        Trade Cost: ${cost} ${quote}
        Trade Size: ${amount} ${base}
        Min: ${minBuy} ${quote}`);

      return { cost: 0 };
    } else {
      return { cost };
    }
  }

  getAllPositions() {
    return Object.entries(this.positions).map(([id, pos]) => ({
      id,
      pos,
    }));
  }

  getOpenPositions() {
    return this.getAllPositions().filter(({ pos }) => pos.state === 'OPEN');
  }

  openPosition(
    id: string | number,
    tradeValues: TradeValues & { size: number; signal: PositionSignal },
  ) {
    log.onSuccess(`BUY - Opening Position ${id}:
    \tPrice: ${tradeValues.price} ${this.quote}
    \tPaid: ${tradeValues.size} ${this.quote}
    \tAmount: ${
      tradeValues.size < 1
        ? tradeValues.price * tradeValues.size
        : tradeValues.size / tradeValues.price
    } ${this.base}
    \tTime: ${getDatetime(tradeValues.time)}`);

    const trade = new Trade(tradeValues);
    const position = new Position({
      id,
      trade,
      product: this.product,
      signal: tradeValues.signal,
    });

    this.positions[id] = position;
  }

  closePosition(
    id: string | number,
    tradeValues: TradeValues & { size: number },
  ) {
    log.onWarning(`SELL - Closing Position ${id}:
    \tPrice: ${tradeValues.price} ${this.quote}
    \tPaid: ${tradeValues.size} ${this.quote}
    \tAmount: ${
      tradeValues.size < 1
        ? tradeValues.price * tradeValues.size
        : tradeValues.size / tradeValues.price
    } ${this.base}
    \tTime: ${getDatetime(tradeValues.time)}
    \tProfit: ${this.positions[id].getProfitString(tradeValues)} ${
      this.quote
    }`);

    const trade = new Trade(tradeValues);
    const position = this.positions[id];

    if (position) {
      position.close(trade);
    }
  }
}
