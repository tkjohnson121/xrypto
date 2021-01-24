import { v4 } from 'uuid';
import { Position } from './models/position';
import { Runner, RunnerProps } from './runner';
import { SignalProps } from './strategies';
import { log } from './utils';

export class Backtester extends Runner {
  constructor(props: RunnerProps) {
    super(props);
  }

  async start() {
    try {
      const { candles } = await this.historical.getData();

      await Promise.all(
        candles.map(async (stick, i) => {
          const sticks = candles.slice(0, i + 1);
          await this.strategy.run({
            sticks,
            time: stick.startTime,
          });
        }),
      );

      this.printPositions();
      this.printProfits();
    } catch (error) {
      log.onError(error);
    }
  }

  async onBuySignal(trade: SignalProps & { size: number }) {
    this.strategy.openPosition(v4(), trade);
  }

  async onSellSignal(
    trade: SignalProps & { size: number; position: Position },
  ) {
    this.strategy.closePosition(trade.position.id, trade);
  }
}
