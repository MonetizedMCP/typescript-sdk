/**
 * Enum representing different payment methods available in the system
 * Format: CURRENCY_CHAIN
 */
export enum PaymentMethods {
  // Base Sepolia
  ETH_BASE_SEPOLIA = 'ETH_BASE_SEPOLIA',
  USDC_BASE_SEPOLIA = 'USDC_BASE_SEPOLIA',
  USDT_BASE_SEPOLIA = 'USDT_BASE_SEPOLIA',
  
  // Base Mainnet
  ETH_BASE_MAINNET = 'ETH_BASE_MAINNET',
  USDC_BASE_MAINNET = 'USDC_BASE_MAINNET',
  USDT_BASE_MAINNET = 'USDT_BASE_MAINNET',
  
  // Solana
  SOL_SOLANA = 'SOL_SOLANA',
  USDC_SOLANA = 'USDC_SOLANA',
  USDT_SOLANA = 'USDT_SOLANA'
} 