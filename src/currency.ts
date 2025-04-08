/**
 * Enum representing different currencies supported by the system
 */
export enum Currency {
  ETH = 'ETH',
  USDC = 'USDC',
  USDT = 'USDT',
  SOL = 'SOL'
}

/**
 * Mapping of currency details including contract addresses and decimals
 */
export const CURRENCY_DETAILS: {
  [key in Currency]: {
    address?: string;
    decimals: number;
    isNative: boolean;
  };
} = {
  [Currency.ETH]: {
    decimals: 18,
    isNative: true,
  },
  [Currency.USDC]: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Sepolia USDC
    decimals: 6,
    isNative: false,
  },
  [Currency.USDT]: {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // Base Sepolia USDT
    decimals: 6,
    isNative: false,
  },
  [Currency.SOL]: {
    decimals: 9,
    isNative: true,
  }
};
