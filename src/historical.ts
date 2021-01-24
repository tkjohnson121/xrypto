import CoinbasePro, { Candle, privateClient } from './coinbase';
import { CandleStick } from './models';
import { log, memo } from './utils';

type HistoricalServiceProps = {
  product: string;
  interval: number;
  start: string;
  end: string;
};

export class HistoricalService {
  constructor({
    product = 'BTC-USD',
    interval = 300,
    start = String(Date.now()),
    end = String(new Date().setDate(new Date().getDate() - 1)),
  }: HistoricalServiceProps) {
    this.client = privateClient;

    this.product = product;
    this.interval = interval;
    this.start = start;
    this.end = end;
  }

  client: CoinbasePro;
  product: string;
  interval: number;
  start: string;
  end: string;

  async getData() {
    const intervals = this.createRequestIntervals();
    log.onInfo(`Fetching Intervals: ${intervals.length}`);

    const data = await this.performIntervals(intervals);

    const timestamps: { [key: string]: boolean } = {};

    const candles = data
      .sort((a, b) =>
        new Date(a.openTimeInMillis).getTime() <
        new Date(b.openTimeInMillis).getTime()
          ? -1
          : 1,
      )
      .filter((x, i) => {
        const timestamp = x.open;

        if (timestamps[timestamp] !== undefined) {
          return false;
        }

        timestamps[timestamp] = true;
        return true;
      })
      .map(
        (candle) =>
          new CandleStick({
            ...candle,
            interval: this.interval,
            openTimeInMillis: candle.openTimeInMillis * 1e3,
          }),
      );

    const analysis = candles.reduce(
      (prev, curr) => {
        if (prev.allTimeHigh < curr.high) {
          prev.allTimeHigh = curr.high;
        }

        if (!prev.allTimeLow) {
          prev.allTimeLow = curr.low;
        } else if (prev.allTimeLow > curr.low) {
          prev.allTimeLow = curr.low;
        }

        return prev;
      },
      {
        allTimeHigh: 0,
        allTimeLow: candles[0].low,
      } as {
        allTimeHigh: number;
        allTimeLow: number;
      },
    );

    log.onInfo(
      `From ${new Date(this.start).toLocaleDateString()} to ${new Date(
        this.end,
      ).toLocaleDateString()}; every ${this.interval} seconds, ${this.product}
        ATH: ${analysis.allTimeHigh.toFixed(5)} ${data[0].counter}
        ATL: ${analysis.allTimeLow.toFixed(5)} ${data[0].counter}`,
    );

    return { candles, analysis };
  }

  /**
   * Recursively get candlestick data on an array of intervals
   */
  async performIntervals(
    intervals: Array<{ start: string; end: string }>,
  ): Promise<Candle[]> {
    if (intervals.length === 0) return [];

    const interval = intervals[0];
    const results = (
      await this.client.rest.product.getCandles(this.product, {
        granularity: this.interval,
        ...interval,
      })
    ).reverse();

    await memo(400);

    const next = await this.performIntervals(intervals.slice(1));
    return results.concat(next);
  }

  /**
   * Split up a request so we don't hit the API limit.
   */
  createRequestIntervals() {
    const max = 300;
    const startTime = new Date(this.start).getTime();
    const endTime = new Date(this.end).getTime();

    // the `* 1e-3` converts date from milliseconds to seconds
    const delta = (endTime - startTime) * 1e-3;
    const numberIntervals = Math.ceil(delta / this.interval);
    const numberRequests = Math.ceil(numberIntervals / max);

    // create an empty array and fill it
    const intervals = Array(numberRequests)
      .fill('')
      // map over the array to determine interval based on the max
      .map((_, reqNum) => {
        const size = this.interval * 300 * 1e3;
        const start = new Date(startTime + reqNum * size);
        const end =
          reqNum + 1 === numberRequests
            ? this.end
            : new Date(start.getTime() + size);

        return { start: String(start), end: String(end) };
      });

    return intervals;
  }
}
