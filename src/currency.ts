import { PaymentMethod } from "./payment-method";

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
 * Mapping of currency details including decimals
 */
export const CURRENCY_DETAILS: {
  [key in Currency]: {
    decimals: number;
    isNative: boolean;
  };
} = {
  [Currency.ETH]: {
    decimals: 18,
    isNative: true,
  },
  [Currency.USDC]: {
    decimals: 6,
    isNative: false,
  },
  [Currency.USDT]: {
    decimals: 6,
    isNative: false,
  },
  [Currency.SOL]: {
    decimals: 9,
    isNative: true,
  }
};

/**
 * Mapping of payment method contract addresses for non-native tokens
 */
export const PAYMENT_METHOD_ADDRESSES: {
  [key in PaymentMethod]?: string;
} = {
  [PaymentMethod.USDC_BASE_SEPOLIA]: '0x6Ac3aB54Dc5019A2e57eCcb214337FF5bbD52897',
  [PaymentMethod.USDT_BASE_SEPOLIA]: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  [PaymentMethod.USDC_BASE_MAINNET]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [PaymentMethod.USDT_BASE_MAINNET]: '0x9f8F72aA9304c8B593d5956a14795C37Eb9B8022',
};
