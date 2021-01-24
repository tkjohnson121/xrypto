import { HistoricalService } from './historical';
import {
  SignalProps,
  Strategy,
  StrategyTypes,
  StratFactory,
} from './strategies';
import { getAccountInfo, log } from './utils';

export type RunnerProps = {
  strategyType: StrategyTypes;
  product: string;
  interval: number;
  start: string;
  end: string;
  funds: number;
};

export class Runner {
  constructor(props: RunnerProps) {
    this.product = props.product;
    this.interval = props.interval;
    this.startTime = props.start;
    this.endTime = props.end;
    this.strategyType = props.strategyType;
    this.funds = props.funds;

    this.historical = new HistoricalService({
      product: props.product,
      start: props.start,
      end: props.end,
      interval: props.interval,
    });

    this.strategy = StratFactory(this.strategyType, {
      onBuySignal: async (trade) => await this.onBuySignal(trade),
      onSellSignal: async (trade) => await this.onSellSignal(trade),
      funds: this.funds,
      product: this.product,
    });
  }

  product: string;
  interval: number;
  startTime: string;
  endTime: string;
  funds: number;
  strategyType: StrategyTypes;
  strategy: Strategy;
  historical: HistoricalService;

  async start() {}
  async onBuySignal(trade: SignalProps) {}
  async onSellSignal(trade: SignalProps) {}

  printProfits() {
    const quote = this.product.split('-')[1];
    const positions = this.strategy.getAllPositions();
    const totalProfits = positions?.reduce((prev, { pos }) => {
      return prev + pos.getProfits();
    }, 0);
    const profitStr = totalProfits.toFixed(5);

    log[totalProfits >= 0 ? 'onSuccess' : 'onWarning'](
      `Total Profit: ${profitStr} ${quote}`,
    );
  }

  printPositions() {
    const positions = this.strategy.getAllPositions();
    positions.forEach(({ pos }) => pos.print());
  }

  async printAccount() {
    const { accounts, accountInfo } = await getAccountInfo();
    const quote = this.product.split('-')[1];
    const quoteBalance =
      accounts?.find((act) => act.currency === quote)?.balance || '0.0';

    log.onInfo(
      `Account Info
      \tQuote Available: ${this.funds || (+quoteBalance).toFixed(5)} ${quote}
      \tCurrencies Enabled: ${accountInfo?.tradingEnabledCount}
      \tCurrencies Held: ${
        (accountInfo?.currenciesHeld.length || 0) > 0
          ? accountInfo?.currenciesHeld
              .map((curr) => `\n\t - ${curr.symbol}: ${curr.amount}`)
              .join('')
          : 'none'
      }`,
    );
  }
}
