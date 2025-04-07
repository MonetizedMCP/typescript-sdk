# Fluora Payments SDK

A TypeScript SDK for handling payments on the Base network (Sepolia testnet). This SDK provides tools for sending and verifying payments using Web3.

## Installation

```bash
npm install fluora-payments
```

## Configuration

Before using the SDK, you need to set up your environment variables:

```env
LOCAL_WALLET_PRIVATE_KEY=your_private_key_here
```

## Usage

```typescript
import { PaymentsTools } from 'fluora-payments';

// Initialize the payments tools
const payments = new PaymentsTools();

// Get your wallet address
const walletAddress = payments.getWalletAddress();

// Send a payment
const result = await payments.sendPayment(
  1.5, // amount in ETH
  '0xDestinationAddress', // destination wallet address
  walletAddress // sender wallet address
);

// Verify a payment
const isVerified = await payments.verifyPayment(result.hash);
```

## API Reference

### `PaymentsTools`

Main class for handling payments.

#### Constructor
```typescript
constructor()
```
Initializes the Web3 instance and sets up the local wallet using the private key from environment variables.

#### Methods

##### `getWalletAddress()`
Returns the local wallet address.

```typescript
getWalletAddress(): string
```

##### `sendPayment(amount: number, destinationWalletAddress: string, localWalletAddress: string)`
Sends a payment to the specified destination address.

Parameters:
- `amount`: Amount to send in ETH
- `destinationWalletAddress`: Recipient's wallet address
- `localWalletAddress`: Sender's wallet address

Returns:
```typescript
Promise<{
  toolResult: string;
  hash: string;
}>
```

##### `verifyPayment(hash: string)`
Verifies if a payment transaction was successful.

Parameters:
- `hash`: Transaction hash to verify

Returns:
```typescript
Promise<boolean>
```

## Network

This SDK currently operates on the Base Sepolia testnet. The RPC URL is set to `https://sepolia.base.org`.

## Error Handling

The SDK includes basic error handling for transactions. Failed transactions will return appropriate error messages in the `toolResult` field.

## License

MIT 