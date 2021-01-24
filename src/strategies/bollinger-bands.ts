import tulind from 'tulind';
import { log } from '../utils';
import { RunProps, Strategy } from './strategy';

export class BollingerBands extends Strategy {
  async run({ sticks, time }: RunProps) {
    const prices = sticks.map((stick) => stick.average());
    const openPositions = this.getOpenPositions();
    const { indicator } = tulind.indicators.bbands;
    const results = await indicator([prices], [20, 2]);

    const bbandsLower = results[0];
    const bbandsMiddle = results[1];
    const bbandsUpper = results[2];

    const length = bbandsUpper.length;
    if (length < 2) return;

    const delta = 1.03; // 3%
    const maxDays = 2;

    const last = {
      upper: bbandsUpper[length - 1],
      middle: bbandsMiddle[length - 1],
      lower: bbandsLower[length - 1],
    };

    const penu = {
      upper: bbandsUpper[length - 2],
      middle: bbandsMiddle[length - 2],
      lower: bbandsLower[length - 2],
    };

    const lastDifference = last.upper - last.lower;
    const penuDifference = penu.upper - penu.lower;
    const isSpreading = lastDifference > penuDifference * 1.1;

    const price =
      sticks[sticks.length - 1].close || sticks[sticks.length - 1].open;

    const highBoundary = 0.95;
    const lowBoundary = 1.05;
    const isHigh = last.upper * highBoundary <= price;
    const isLow = last.lower * lowBoundary >= price;

    log.onInfo(`BBands Value:
      \tUpper: ${last.upper}
      \tMiddle: ${last.middle}
      \tLower: ${last.lower}
      `);

    if (isSpreading && isLow && openPositions.length === 0) {
      const { cost } = await this.getTrade(price);

      if (cost > 0.0) {
        this.onBuySignal({
          price,
          time,
          size: cost,
          signal: { penu: penu.middle, last: last.middle },
        });
      }
    }

    openPositions.forEach(({ pos }) => {
      const startDate = new Date(pos.enter.time);
      const deadline = new Date().setDate(startDate.getDate() + maxDays);

      if (isSpreading && isHigh) {
        this.onSellSignal({
          price,
          time,
          size: pos.enter.size,
          position: pos,
          signal: { penu: penu.middle, last: last.middle },
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
          signal: { penu: penu.middle, last: penu.middle },
        });
      }
    });
  }
}
