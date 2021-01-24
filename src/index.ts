import program from 'commander';
import '../env';
import { Backtester } from './backtester';
import { Trader } from './trader';
import { getAccountInfo, log } from './utils';

const now = new Date();
const yesterday = new Date(new Date().setDate(now.getDate() - 1));

//xrypto-simple
// -t -st simple -i 300 -p BTC-USD
//xrypto-macd
// -t -st macd -i 300 -p BTC-USD
//xrypto-macd-hourly
// -t -st macd -i 3600 -p BTC-USD

// Process command line args with commander
program
  .version('0.0.1')
  .option('-l, --live [live]', 'Run Live')
  .option('-t, --trader [trader]', 'Live Trader')
  .option(
    '-p, --product [product]',
    'Currency Symbol',
    (val) => val.toUpperCase(),
    'BTC-USD',
  )
  .option('-f, --funds [funds]', 'Amount of money to use/test.', (val) => +val)
  .option(
    '-st, --strategyType [strategyType]',
    'Strategy Type',
    (val) => val.toUpperCase(),
    'SIMPLE',
  )
  .option(
    '-i, --interval [interval]',
    'Interval in seconds for candlesticks',
    (val) => parseFloat(val),
    // (ONE_MINUTE = 60),
    // (FIVE_MINUTES = 300),
    // (FIFTEEN_MINUTES = 900),
    // (ONE_HOUR = 3600),
    // (SIX_HOURS = 21600),
    // (ONE_DAY = 86400);
    300, // 5 minutes,
  )
  .option(
    '-s, --start [start]',
    'Start date in seconds',
    (val) => String(new Date(val)),
    String(yesterday),
  )
  .option(
    '-e, --end [end]',
    'End time in seconds',
    (val) => String(new Date(val)),
    String(now),
  )
  .parse(process.argv);

async function main() {
  log.onSuccess(`Starting Xrypto v0.0.1: Greater Ventures! `);

  try {
    const { accounts } = await getAccountInfo();
    const quote = program.product.split('-')[1];
    const quoteBalance =
      accounts?.find((act) => act.currency === quote)?.balance || '0.0';

    const { live, trader } = program;
    const defaultProps = {
      product: program.product,
      interval: program.interval,
      start: program.start,
      end: program.end,
      strategyType: program.strategyType,
      type: program.type,
      funds: program.funds || +quoteBalance,
    };

    let runner: Backtester | Trader;

    if (trader) {
      runner = new Trader({ ...defaultProps, isLive: live });
    } else {
      runner = new Backtester(defaultProps);
    }

    await runner.printAccount();
    await runner.start();
    log.onWarning('Off to the Races: See you next time!');
  } catch (error) {
    log.onError(error);
  }
}

main();
