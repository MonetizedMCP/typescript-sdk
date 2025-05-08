import { base, baseSepolia, Chain } from "viem/chains";
import { PaymentMethods } from "./payment-method.js";

export const getChainFromPaymentMethod = (paymentMethod: PaymentMethods) => {
  switch (paymentMethod) {
    case PaymentMethods.USDC_BASE_SEPOLIA:
      return baseSepolia;
    case PaymentMethods.USDT_BASE_SEPOLIA:
      return baseSepolia;
    case PaymentMethods.ETH_BASE_SEPOLIA:
      return baseSepolia;
    case PaymentMethods.USDC_BASE_MAINNET:
      return base;
    case PaymentMethods.USDT_BASE_MAINNET:
      return base;
    case PaymentMethods.ETH_BASE_MAINNET:
      return base;
    default:
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
  }
};

export const getNetworkFromChain = (chain: Chain) => {
  switch (chain.id) {
    case base.id:
      return 'base';
    case baseSepolia.id: 
      return 'base-sepolia';
    default:
      throw new Error(`Unsupported chain: ${chain.name}`);
  }
};
