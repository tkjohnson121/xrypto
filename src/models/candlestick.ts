export class CandleStick {
  constructor(candle: {
    high: number;
    low: number;
    open: number;
    close?: number;
    volume: number;
    interval: number;
    productId: string;
    base: string;
    counter: string;
    openTimeInMillis: number;
    openTimeInIso?: string;
    price?: number;
  }) {
    this.high = candle.price || candle.high;
    this.low = candle.price || candle.low;
    this.open = candle.price || candle.open;
    this.close = candle.price || candle.close;
    this.volume = candle.volume || 1e-5;
    this.interval = candle.interval;
    this.startTime = candle.openTimeInMillis;
    this.startTimeISO = candle.openTimeInIso;
    this.id = candle.productId;
    this.base = candle.base;
    this.counter = candle.counter;
    this.state = candle.close ? 'closed' : 'open';
  }

  high: number;
  low: number;
  open: number;
  close?: number;
  volume: number;
  interval: number;
  startTime: number;
  startTimeISO?: string;
  id: string;
  base: string;
  counter: string;
  state: 'open' | 'closed';

  average = () => this.close && (this.close + this.high + this.low) / 3;

  onPriceChange(options: {
    price: number;
    volume: number;
    time: number;
  }) {
    const { price, volume, time = Date.now() } = options;

    if (this.state === 'closed') {
      throw new Error('Trying to add to closed candle');
    }

    this.volume = this.volume + volume;

    if (price > this.high) {
      this.high = price;
    }
    if (price < this.low) {
      this.low = price;
    }

    this.close = price;

    const delta =
      (new Date(time).getTime() - new Date(this.startTime).getTime()) *
      1e-3;

    if (delta >= this.interval) {
      this.state = 'closed';
    }
  }
}
