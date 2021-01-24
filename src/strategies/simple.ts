import { RunProps, Strategy, StrategyProps } from './strategy';

export class Simple extends Strategy {
  constructor(props: StrategyProps) {
    super(props);
  }

  async run({ sticks, time }: RunProps) {
    const len = sticks.length;
    if (len < 20) return;

    const maxDays = 30; // days
    const penu = sticks[len - 2].close;
    const last = sticks[len - 1].close;
    const currentPrice = last;

    const openPositions = this.getOpenPositions();

    if (last && penu && currentPrice) {
      // price has increased
      if (penu > last) {
        const { cost } = await this.getTrade(currentPrice);

        if (cost > 0.0) {
          await this.onBuySignal({
            price: currentPrice,
            time,
            size: cost,
            signal: { penu, last },
          });
        }
      }

      if (penu < last) {
        await Promise.all(
          openPositions.map(async ({ pos }) => {
            const startDate = new Date(pos.enter.time);
            const endTime = new Date().setDate(startDate.getDate() + maxDays);

            if (
              // the price has increased
              pos.enter.price < currentPrice
            ) {
              return await this.onSellSignal({
                time,
                position: pos,
                price: currentPrice,
                size: pos.enter.size,
                signal: { penu, last },
              });
            } else if (
              // held for maxDays+ days and
              startDate.getTime() < endTime &&
              // price is lower than 3% where we bought
              pos.enter.price > currentPrice
            ) {
              return await this.onSellSignal({
                price: currentPrice,
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
  }
}
