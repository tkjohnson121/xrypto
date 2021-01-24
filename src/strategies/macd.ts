import tulind from 'tulind';
import { log } from '../utils';
import { RunProps, Strategy } from './strategy';

export class SimpleMACD extends Strategy {
  async run({ sticks, time }: RunProps) {
    const prices = sticks.map((stick) => stick.average());

    const shortPeriod = 5;
    const longPeriod = 35;
    const signalPeriod = 5;
    const indicator = tulind.indicators.macd.indicator;

    const results = await indicator(
      [prices],
      [shortPeriod, longPeriod, signalPeriod],
    );

    const histogram = results[2];

    const length = histogram.length;
    if (length < 2) return;

    const penu = histogram[length - 2];
    const last = histogram[length - 1];

    const boundary = 0.3;
    const wasAbove = penu > boundary;
    const wasBelow = penu < -boundary;
    const isAbove = last > boundary;
    const isBelow = last < -boundary;

    const openPositions = this.getOpenPositions();

    const price =
      sticks[sticks.length - 1].close || sticks[sticks.length - 1].open;

    log.onInfo(`MACD Value: ${last}`);

    if (wasAbove && isBelow) {
      const { cost } = await this.getTrade(price);

      if (cost > 0.0) {
        await this.onBuySignal({
          price,
          time,
          size: cost,
          signal: { penu, last },
        });
      }
    }

    await Promise.all(
      openPositions.map(async ({ pos }) => {
        const max = 30; // days
        const startDate = new Date(pos.enter.time);
        const endTime = new Date().setDate(startDate.getDate() + max);

        // price has increased by at least 1%
        if (wasBelow && isAbove && pos.enter.price * 1.01 < price) {
          await this.onSellSignal({
            price,
            time,
            size: pos.enter.size,
            position: pos,
            signal: { penu, last },
          });
        } else if (
          // held for max+ days
          startDate.getTime() < endTime &&
          // price is 1+% lower than when we bought
          pos.enter.price > price * 1.01
        ) {
          await this.onSellSignal({
            price,
            time,
            position: pos,
            size: pos.enter.size,
            signal: { penu, last },
          });
        }
      }),
    );
  }
}
