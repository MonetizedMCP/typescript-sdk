# MonetizedMCP TypeScript SDK 
A TypeScript utility library that enables MCP servers to receive programmatic payments. This library provides abstracts tool definitions for the 3 signature MonetizedMCP tools: price-listing, payment-methods, and make-purchase. It also contains methods signing transactions and verifying/settling payments. 

## Features

- Sign transactions for X402 payments
- Verify and settle payments using the X402 facilitator
- Support for Base Sepolia testnet and Base Mainnet
- Integration with Model Context Protocol (MCP) for monetized services
- Support for USDC payments

## Installation

```bash
npm install @monetizedmcp-sdk
```

## Configuration

Set up your environment variables:

```bash
LOCAL_WALLET_PRIVATE_KEY=your_private_key_here
LOCAL_WALLET_ADDRESS=your_wallet_address_here
```

## Usage

### Basic Payment Operations

```typescript
import { PaymentsTools, PaymentMethods } from '@monetizedmcp-sdk';

const payments = new PaymentsTools();

// Sign a transaction
const paymentHeader = await payments.signTransaction(
  0.01, // amount
  '0x...', // seller address
  '0x...', // buyer private key
  'https://example.com/resource', // resource URL
  PaymentMethods.USDC_BASE_SEPOLIA // payment method
);

// Verify and settle a payment
const verification = await payments.verifyAndSettlePayment(
  "0.01", // amount as Money type
  '0x...', // seller address
  {
    facilitatorUrl: 'https://x402.org/facilitator',
    paymentHeader: paymentHeader,
    resource: 'https://example.com/resource',
    paymentMethod: PaymentMethods.USDC_BASE_SEPOLIA
  }
);
```

### MCP Integration

```typescript
import { MonetizedMCPServer } from '@monetizedmcp-sdk';

class MyMCPServer extends MonetizedMCPServer {
  async pricingListing({ searchQuery }: PricingListingRequest): Promise<PricingListingResponse> {
    return {
      items: [
        {
          name: "Service Name",
          description: "Service Description",
          price: 0.5,
          currency: "USDC",
          params: {
            // Service-specific parameters
          }
        }
      ]
    };
  }

  async paymentMethod(): Promise<PaymentMethodResponse> {
    return {
      walletAddress: "0x...",
      paymentMethod: PaymentMethods.USDC_BASE_SEPOLIA
    };
  }

  async makePurchase(request: MakePurchaseRequest): Promise<MakePurchaseResponse> {
    // Implement purchase logic
  }
}
```

## Supported Networks

### Base Sepolia Testnet
- Chain ID: 84532
- Supported Tokens: USDC

### Base Mainnet
- Chain ID: 8453
- Supported Tokens: USDC

## API Reference

### `PaymentsTools` Class

#### Constructor
```typescript
constructor()
```
Initializes the PaymentsTools instance.

#### `signTransaction`
```typescript
async signTransaction(
  amount: number,
  sellerWalletAddress: string,
  buyerWalletAddress: string,
  resource: `${string}://${string}`,
  paymentMethod: PaymentMethods
): Promise<string>
```
Signs a transaction for X402 payment.

#### `verifyAndSettlePayment`
```typescript
async verifyAndSettlePayment(
  amount: Money,
  address: Address,
  {
    facilitatorUrl,
    paymentHeader,
    resource,
    paymentMethod
  }: {
    facilitatorUrl: `${string}://${string}`;
    paymentHeader: string;
    resource: `${string}://${string}`;
    paymentMethod: PaymentMethods;
  }
): Promise<{ success: boolean; message: string; responseHeader: string }>
```
Verifies and settles a payment using the X402 facilitator.

### `MonetizedMCPServer` Class

Abstract class for implementing monetized MCP services.

#### `pricingListing`
```typescript
abstract pricingListing(
  request: PricingListingRequest
): Promise<PricingListingResponse>
```
Returns available items and their prices.

#### `paymentMethod`
```typescript
abstract paymentMethod(): Promise<PaymentMethodResponse>
```
Returns payment method information.

#### `makePurchase`
```typescript
abstract makePurchase(
  request: MakePurchaseRequest
): Promise<MakePurchaseResponse>
```
Handles the purchase process.

## Types

### PaymentMethods
```typescript
enum PaymentMethods {
  USDC_BASE_SEPOLIA = 'USDC_BASE_SEPOLIA',
  USDC_BASE_MAINNET = 'USDC_BASE_MAINNET'
}
```

### Money
```typescript
type Money = string // Format: "0.01", "1.00", etc.
```

## Future Improvements

- Additional payment methods
- Enhanced error handling
- More network support
- Additional token standards

## License

MIT 
