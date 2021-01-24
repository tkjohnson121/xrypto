import sgMail from '@sendgrid/mail';
import chalk from 'chalk';
import { Account, privateClient } from './coinbase';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
export const emailClient = sgMail;

export const getDatetime = (val: string | number | Date) => {
  const date = new Date(typeof val === 'number' ? val * 1e-3 : val);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};
export const coinsToWatch = ['BTC-USD', 'BTC-EUR'];
export const memo = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

class Logger {
  errorColor = chalk.bold.red;
  successColor = chalk.bold.keyword('green');
  infoColor = chalk.keyword('cyan');
  warningColor = chalk.bold.keyword('orange');

  stringify = (arg: any) =>
    typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2);
  onError = (error: string | Error | any, forceExit: boolean = true) => {
    // log error message
    if (error.isAxiosError) {
      const {
        status,
        data: { message },
        config: { baseURL, url },
      } = error.response;

      console.error(
        this.errorColor(`❌ ${status} - ${message} at ${baseURL + url}`),
      );
    } else {
      console.error(this.errorColor('❌ - ' + this.stringify(error.message)));
    }

    // log the full error + stack trace
    console.error('\t' + this.errorColor(Object.keys(error)));

    process.exitCode = 1;

    if (forceExit) {
      throw 1;
    }
  };
  onSuccess = (msg: any) =>
    console.log(this.successColor('✅ - ' + this.stringify(msg)));
  onInfo = (msg: any) =>
    console.info(this.infoColor('🚀 - ' + this.stringify(msg)));
  onWarning = (msg: any) =>
    console.info(this.warningColor('🚧 - ' + this.stringify(msg)));
}

export const log = new Logger();

type AccountInfo = {
  tradingEnabledCount: number;
  currenciesHeld: Array<{
    amount: number;
    symbol: string;
  }>;
};

export const getAccountInfo = async () => {
  const accounts = (await privateClient.rest.account.listAccounts()) as
    | Array<Account & { trading_enabled: boolean }>
    | undefined;

  const accountInfo =
    (accounts?.length || 0) > 0 &&
    accounts?.reduce(
      (prev, curr) => {
        if (+curr.balance > 0) {
          prev.currenciesHeld.push({
            amount: +curr.balance,
            symbol: curr.currency,
          });
        }

        if (curr.trading_enabled) {
          prev.tradingEnabledCount += 1;
        }

        return prev;
      },
      {
        tradingEnabledCount: 0,
        currenciesHeld: [],
      } as AccountInfo,
    );

  return { accounts, accountInfo } as {
    accounts?: Account[];
    accountInfo?: AccountInfo;
  };
};
