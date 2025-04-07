# Monetized MCP

A TypeScript utility library for handling payments on multiple EVM-compatible networks. This library provides tools for sending and verifying payments using Web3, supporting both native tokens (like ETH) and ERC20 tokens.

## Installation

```bash
npm install monetized-mcp
```

## Configuration

Before using the library, you need to set up your environment variables:

```env
LOCAL_WALLET_PRIVATE_KEY=your_private_key_here
```

## Usage

```typescript
import { PaymentsTools } from 'monetized-mcp';
import { Currency } from 'monetized-mcp';

// Initialize the payments tools
const payments = new PaymentsTools();

// Send a payment
const result = await payments.sendPayment(
  1.5, // amount
  '0xDestinationAddress', // destination wallet address
  '0xYourWalletAddress', // sender wallet address
  Currency.ETH, // currency to send
  'base-sepolia' // optional: chain to use (default: 'base-sepolia')
);

// Verify a payment
const verification = await payments.verifyPayment(
  result.hash, // transaction hash
  1.5, // expected amount
  Currency.ETH, // expected currency
  '0xDestinationAddress' // expected destination address
);
```

## Supported Networks

- Base Sepolia (base-sepolia)
- Base Mainnet (base)
- Ethereum Mainnet (ethereum)
- Ethereum Sepolia (sepolia)

## Supported Currencies

- ETH (Native token)
- USDC (ERC20)
- USDT (ERC20)
- DAI (ERC20)
- WETH (ERC20)

## API Reference

### `PaymentsTools`

Main class for handling payments.

#### Constructor
```typescript
constructor()
```
Initializes the Web3 instance and sets up the local wallet using the private key from environment variables.

#### Methods

##### `sendPayment(amount: number, destinationWalletAddress: string, localWalletAddress: string, currency: Currency, chain?: string)`
Sends a payment to the specified destination address.

Parameters:
- `amount`: Amount to send
- `destinationWalletAddress`: Recipient's wallet address
- `localWalletAddress`: Sender's wallet address
- `currency`: Currency to send (ETH, USDC, etc.)
- `chain`: Optional blockchain network to use (default: 'base-sepolia')

Returns:
```typescript
Promise<{
  resultMessage: string;
  hash: string;
}>
```

##### `verifyPayment(hash: string, amount: number, currency: Currency, destinationWalletAddress: string)`
Verifies if a payment transaction was successful and matches the expected parameters.

Parameters:
- `hash`: Transaction hash to verify
- `amount`: Expected amount that should have been transferred
- `currency`: Expected currency that should have been transferred
- `destinationWalletAddress`: Expected address that should have received the payment

Returns:
```typescript
Promise<{
  success: boolean;
  message: string;
}>
```

## Error Handling

The library includes comprehensive error handling for transactions. Failed transactions or verifications will return appropriate error messages in the response.

## Future Improvements

This is currently a basic utility library. Future improvements could include:
- Support for more networks
- Support for more token standards
- Gas optimization
- Transaction batching
- Testing suite
- More detailed documentation

## License

MIT 