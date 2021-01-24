import tulind from 'tulind';
import { log } from '../utils';
import { RunProps, Strategy } from './strategy';

export class StochasticOscillator extends Strategy {
  async run({ sticks, time }: RunProps) {
    const high = sticks.map((stick) => stick.high);
    const low = sticks.map((stick) => stick.low);
    const close = sticks.map((stick) => stick.close);
    const indicator = tulind.indicators.stoch.indicator;

    const results = await indicator([high, low, close], [5, 3, 3]);
    const openPositions = this.getOpenPositions();

    const kValues = results[0];
    const length = kValues.length;
    if (length < 2) return;

    const penu = kValues[length - 2];
    const last = kValues[length - 1];
    const price =
      sticks[sticks.length - 1].close || sticks[sticks.length - 1].open;

    const delta = 1.03; // days
    const maxDays = 2;
    const highBoundary = 80;
    const lowBoundary = 20;
    const isAbove = last > highBoundary;
    const isBelow = last < lowBoundary;
    const wasAbove = penu > highBoundary;
    const wasBelow = penu < lowBoundary;

    log.onInfo(`Stochastic Value: ${last}`);

    if (wasBelow && !isBelow) {
      const { cost } = await this.getTrade(price);

      if (cost > 0.0) {
        await this.onBuySignal({
          price,
          time,
          size: cost,
        });
      }
    }

    await Promise.all(
      openPositions.map(async ({ pos }) => {
        const startDate = new Date(pos.enter.time);
        const endTime = new Date().setDate(startDate.getDate() + maxDays);

        // price has increased by at least 1%
        if (isAbove && !wasAbove && pos.enter.price * delta < price) {
          await this.onSellSignal({
            price,
            time,
            size: pos.enter.size,
            position: pos,
          });
        } else if (
          // held for max+ days
          startDate.getTime() < endTime &&
          // price is 1+% lower than when we bought
          pos.enter.price > price * delta
        ) {
          await this.onSellSignal({
            price,
            time,
            position: pos,
            size: pos.enter.size,
          });
        }
      }),
    );
  }
}
