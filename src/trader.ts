import { OrderType } from 'coinbase-pro-node';
import { ErrorEvent } from 'reconnecting-websocket';
import { v4 } from 'uuid';
import { Broker } from './broker';
import { CandleStick } from './models';
import { Position } from './models/position';
import { Runner, RunnerProps } from './runner';
import { SignalProps } from './strategies';
import { Tick, Ticker } from './ticker';
import { log } from './utils';

export class Trader extends Runner {
  constructor(props: RunnerProps & { isLive: boolean; funds: number }) {
    super(props);

    this.funds = props.funds;
    this.isLive = props.isLive;
    this.broker = new Broker({
      isLive: props.isLive,
      product: props.product,
      orderType: OrderType.MARKET,
    });
    this.ticker = new Ticker({
      product: props.product,
      onTick: async (tick) => {
        await this.onTick(tick);
      },
      onError: () => this.onError,
    });
  }

  funds: number;
  broker: Broker;
  isLive: boolean;
  history?: {
    candles: CandleStick[];
    analysis: {
      allTimeHigh: number;
      allTimeLow: number | null;
    };
  };
  ticker: Ticker;
  currentCandle: CandleStick | null = null;

  async start() {
    try {
      this.currentCandle = null;
      this.history = await this.historical.getData();

      this.ticker.start();
      this.broker.start();
    } catch (error) {
      this.onError(error);
    }
  }

  async onTick(tick: Tick) {
    const parsedtime = Date.parse(tick.time);
    const time = isNaN(parsedtime) ? Date.now() : parsedtime;
    const price = parseFloat(tick.price);
    const volume = parseFloat(tick.last_size);

    const datetime = `${new Date(time).toLocaleTimeString()} on ${new Date(
      time,
    ).toLocaleDateString()}`;

    log.onInfo(
      `${this.product} - ${this.strategyType} - ${
        this.interval
      }s | Price: ${price.toFixed(5)} | Volume: ${volume.toFixed(
        3,
      )} | Time: ${datetime}`,
    );

    try {
      if (this.currentCandle) {
        this.currentCandle.onPriceChange({ price, volume, time });
      } else {
        this.currentCandle = new CandleStick({
          price,
          high: price,
          low: price,
          open: price,
          volume: volume,
          interval: this.interval,
          productId: tick.product_id,
          base: tick.product_id.split('-')[0],
          counter: tick.product_id.split('-')[1],
          openTimeInMillis: time,
        });
      }

      if (this.history) {
        const sticks = this.history.candles.slice();
        sticks.push(this.currentCandle);

        await this.strategy.run({
          sticks,
          time,
        });

        if (this.currentCandle.state === 'closed') {
          const candle = this.currentCandle;
          this.currentCandle = null;
          this.history.candles.push(candle);

          await this.printAccount();
          this.printPositions();
          this.printProfits();
        }
      }
    } catch (error) {
      this.onError(error);
    }
  }

  onError(error: ErrorEvent) {
    log.onError(error);
  }

  async onBuySignal(trade: SignalProps) {
    try {
      const result = await this.broker.buy({
        price: trade.price,
        funds: trade.size,
      });

      if (!result) {
        return log.onWarning(
          `Trade cannot be completed. ${result} was returned from the Broker`,
        );
      }

      const getSize = () => {
        if ('funds' in result) return +result.funds;
        return trade.size;
      };

      this.strategy?.openPosition(v4(), {
        time: trade.time,
        price: trade.price,
        size: getSize(),
      });
    } catch (error) {
      this.onError(error);
    }
  }

  async onSellSignal(
    trade: SignalProps & { position: Position; size: number },
  ) {
    try {
      const result = await this.broker.sell({
        price: trade.price,
        size: trade.size,
      });

      if (!result) {
        return log.onWarning(
          `Trade cannot be completed. ${result} was returned from the Broker`,
        );
      }

      const getSize = () => {
        if ('funds' in result) return +result.funds;
        return trade.size;
      };

      this.strategy?.closePosition(trade.position.id, {
        time: trade.time,
        price: trade.price,
        size: getSize(),
      });
    } catch (error) {
      this.onError(error);
    }
  }
}
