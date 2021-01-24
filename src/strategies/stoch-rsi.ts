import tulind from 'tulind';
import { log } from '../utils';
import { RunProps, Strategy } from './strategy';

export class StochasticRSI extends Strategy {
  async run({ sticks, time }: RunProps) {
    const prices = sticks.map((stick) => stick.average());
    const openPositions = this.getOpenPositions();
    const { indicator } = tulind.indicators.stochrsi;
    const results = await indicator([prices], [14]);

    const kValues = results[0];
    const length = kValues.length;
    if (length < 2) return;

    const delta = 1.03; // 3%
    const maxDays = 2;
    const penu = kValues[length - 2];
    const last = kValues[length - 1];
    const price =
      sticks[sticks.length - 1].close || sticks[sticks.length - 1].open;

    const highBoundary = 0.7;
    const lowBoundary = 0.3;
    const isAbove = last > highBoundary;
    const isBelow = last < lowBoundary;
    const wasAbove = penu >= highBoundary;
    const wasBelow = penu <= lowBoundary;

    log.onInfo(`STOCH-RSI Value: ${last}`);

    if (wasBelow && !isBelow && openPositions.length === 0) {
      const { cost } = await this.getTrade(price);

      if (cost > 0.0) {
        this.onBuySignal({
          price,
          time,
          size: cost,
          signal: { penu, last },
        });
      }
    }

    openPositions.forEach(({ pos }) => {
      const startDate = new Date(pos.enter.time);
      const deadline = new Date().setDate(startDate.getDate() + maxDays);

      if (!isAbove && wasAbove) {
        this.onSellSignal({
          price,
          time,
          size: pos.enter.size,
          position: pos,
          signal: { penu, last },
        });
      } else if (
        // held for max days+
        startDate.getTime() < deadline &&
        // price is 3%+ lower than when we bought
        pos.enter.price > price * delta
      ) {
        this.onSellSignal({
          price,
          time,
          position: pos,
          size: pos.enter.size,
          signal: { penu, last },
        });
      }
    });
  }
}
