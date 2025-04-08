export enum Currency {
  ETH = 'ETH',
  USDC = 'USDC',
  USDT = 'USDT',
  DAI = 'DAI',
  WETH = 'WETH',
}

export const CURRENCY_DETAILS: Record<Currency, {
  name: string;
  decimals: number;
  isNative: boolean;
  address?: string;
}> = {
  [Currency.ETH]: {
    name: 'Ethereum',
    decimals: 18,
    isNative: true
  },
  [Currency.USDC]: {
    name: 'USD Coin',
    decimals: 6,
    isNative: false,
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base Mainnet USDC
  },
  [Currency.USDT]: {
    name: 'Tether USD',
    decimals: 6,
    isNative: false,
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' // Base Mainnet USDT
  },
  [Currency.DAI]: {
    name: 'Dai Stablecoin',
    decimals: 18,
    isNative: false,
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' // Base Mainnet DAI
  }
};
