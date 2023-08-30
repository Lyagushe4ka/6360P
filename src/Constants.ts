
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
  'UDSC': {
    name: 'USDC',
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    decimals: 6,
  }
};

export const domain = {
  name: 'BebopAggregationContract',
  version: '1',
  chainId: 137,
  verifyingContract: "0xbeb09beb09e95e6febf0d6eeb1d0d46d1013cc3c"
};

export const types = {
  "AggregateOrder": [
    {
      "name": "expiry",
      "type": "uint256"
    },
    {
      "name": "taker_address",
      "type": "address"
    },
    {
      "name": "maker_addresses",
      "type": "address[]"
    },
    {
      "name": "maker_nonces",
      "type": "uint256[]"
    },
    {
      "name": "taker_tokens",
      "type": "address[][]"
    },
    {
      "name": "maker_tokens",
      "type": "address[][]"
    },
    {
      "name": "taker_amounts",
      "type": "uint256[][]"
    },
    {
      "name": "maker_amounts",
      "type": "uint256[][]"
    },
    {
      "name": "receiver",
      "type": "address"
    }
  ]
};

export type Data = {
  transactionsSingle?: number;
  transactionsMulti?: number;
  volume?: number;
  fees?: number;
};