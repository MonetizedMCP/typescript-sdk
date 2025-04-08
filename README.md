# TypeScript SDK for Base Sepolia Payments

A TypeScript utility library for handling payments on the Base Sepolia testnet. This library provides tools for sending and verifying payments, supporting both native tokens and ERC20 tokens.

## Features

- Send payments in native tokens (ETH) and ERC20 tokens
- Automatic gas estimation for transactions
- Dynamic gas price calculation based on network conditions
- Verify payment transactions
- Support for Base Sepolia testnet

## Installation

```bash
npm install @fluora/typescript-sdk
```

## Configuration

Set up your environment variables:

```bash
LOCAL_WALLET_PRIVATE_KEY=your_private_key_here
```

## Usage

```typescript
import { PaymentsTools, Currency } from '@fluora/typescript-sdk';

const payments = new PaymentsTools();

// Send a payment
const result = await payments.sendPayment(
  0.1, // amount
  '0x...', // destination address
  '0x...', // sender address
  Currency.ETH // currency
);

// Verify a payment
const verification = await payments.verifyPayment(
  '0x...', // transaction hash
  0.1, // amount
  Currency.ETH, // currency
  '0x...' // destination address
);
```

## Network

This SDK is configured to work with the Base Sepolia testnet:
- RPC URL: `https://sepolia.base.org`
- Chain ID: 84532
- Native Currency: ETH

## Gas Handling

The SDK automatically handles gas calculations:
- For native token transfers: Uses standard 21000 gas limit
- For ERC20 token transfers: Estimates required gas based on contract interaction
- Gas price is dynamically obtained from the current network conditions

## Supported Currencies

- Native token (ETH)
- ERC20 tokens (USDC, etc.)

## API Reference

### `PaymentsTools` Class

#### Constructor
```typescript
constructor()
```
Initializes the PaymentsTools instance with Web3 connection to Base Sepolia.

#### `sendPayment`
```typescript
async sendPayment(
  amount: number,
  destinationWalletAddress: string,
  localWalletAddress: string,
  currency: Currency,
  chain?: string
): Promise<{ resultMessage: string; hash: string }>
```
Sends a payment transaction with automatic gas calculation.

#### `verifyPayment`
```typescript
async verifyPayment(
  hash: string,
  amount: number,
  currency: Currency,
  destinationWalletAddress: string
): Promise<{ success: boolean; message: string }>
```
Verifies if a payment transaction was successful.

## Future Improvements

- Support for Base Mainnet
- Additional token standards
- Enhanced error handling
- Gas optimization strategies

## License

MIT 