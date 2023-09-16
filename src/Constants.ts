
type TokenInfo = {
  name: string;
  address: string;
  decimals: number;
};

export const tokens: Record<string, TokenInfo> = {
  'DAI': {
    name: 'DAI',
    address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    decimals: 18,
  },
  'USDC': {
    name: 'USDC',
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    decimals: 6,
  }
};

export const domain = {
  name: 'BebopSettlement',
  version: '1',
  chainId: 137,
  verifyingContract: "0xBeB09000fa59627dc02Bb55448AC1893EAa501A5"
};

export const types = {
  Aggregate: [
    {name: "expiry", type: "uint256"},
    {name: "taker_address", type: "address"},
    {name: "maker_addresses", type: "address[]"},
    {name: "maker_nonces", type: "uint256[]"},
    {name: "taker_tokens", type: "address[][]"},
    {name: "maker_tokens", type: "address[][]"},
    {name: "taker_amounts", type: "uint256[][]"},
    {name: "maker_amounts", type: "uint256[][]"},
    {name: "receiver", type: "address"},
    {name: "commands", type: "bytes"}
  ]
};

export type Data = {
  transactionsSingle?: number;
  transactionsMulti?: number;
  volume?: number;
  fees?: number;
};