import CoinbaseProAPI, { CoinbasePro } from 'coinbase-pro-node';

export const authConfig = {
  apiKey: process.env.CB_API_KEY || '',
  apiSecret: process.env.CB_API_SECRET || '',
  passphrase: process.env.CB_API_PASSPHRASE || '',
  useSandbox: process.env.NODE_ENV === 'development',
};

// Unauthenticated
export const publicClient = new CoinbasePro();

// Authenticated
export const privateClient = new CoinbasePro(authConfig);

export * from 'coinbase-pro-node';
export default CoinbaseProAPI;
