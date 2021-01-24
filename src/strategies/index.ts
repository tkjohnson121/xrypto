import { SimpleMACD } from './macd';
import { RSI } from './rsi';
import { Simple } from './simple';
import { StochasticOscillator } from './stoch';
import { StochasticRSI } from './stoch-rsi';
import { StrategyProps } from './strategy';

export * from './macd';
export * from './simple';
export * from './strategy';

export type StrategyTypes = 'SIMPLE' | 'MACD' | 'STOCH' | 'RSI' | 'STOCH-RSI';

export function StratFactory(type: StrategyTypes, data: StrategyProps) {
  switch (type) {
    case 'RSI': {
      return new RSI(data);
    }

    case 'STOCH-RSI': {
      return new StochasticRSI(data);
    }

    case 'STOCH': {
      return new StochasticOscillator(data);
    }

    case 'MACD': {
      return new SimpleMACD(data);
    }

    case 'SIMPLE': {
      return new Simple(data);
    }

    default: {
      return new Simple(data);
    }
  }
}
