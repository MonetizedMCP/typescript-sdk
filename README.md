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
npm install monetizedmcp-sdk
```

## Configuration

```bash
# To use @coinbase/x402 facilitator
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret
```

## Usage

### Basic Payment Operations

```typescript
import { PaymentsTools, PaymentMethods } from "monetizedmcp-sdk";

const payments = new PaymentsTools();

// Sign a transaction
const paymentHeader = await payments.signTransaction(
  0.01, // amount
  "0x...", // seller address
  "0x...", // buyer private key
  "https://example.com/resource", // resource URL
  PaymentMethods.USDC_BASE_SEPOLIA // payment method
);

// Verify and settle a payment
const verification = await payments.verifyAndSettlePayment(
  "0.01", // amount as Money type
  "0x...", // seller address
  {
    facilitatorUrl: "https://x402.org/facilitator",
    paymentHeader: paymentHeader,
    resource: "https://example.com/resource",
    paymentMethod: PaymentMethods.USDC_BASE_SEPOLIA,
  }
);
```

### MCP Integration

```typescript
import { MonetizedMCPServer } from "monetizedmcp-sdk";

class MyMCPServer extends MonetizedMCPServer {
  constructor() {
    super();
    super().runMonetizeMCPServer();
  }

  async priceListing({
    searchQuery,
  }: PriceListingRequest): Promise<PriceListingResponse> {
    return {
      items: [
        {
          name: "Service Name",
          description: "Service Description",
          price: {
            amount: 0.5,
            // PaymentMethods.USDC_BASE_SEPOLIA or PaymentMethods.USDC_BASE_MAINNET
            paymentMethod: ...
          },
          currency: "USDC",
          params: {
            // Service-specific parameters
          },
        },
      ],
    };
  }

  async paymentMethods(): Promise<PaymentMethodsResponse> {
    return {
      walletAddress: "0x...",
      paymentMethod: PaymentMethods.USDC_BASE_SEPOLIA,
    };
  }

  async makePurchase(
    request: MakePurchaseRequest
  ): Promise<MakePurchaseResponse> {
    // Implement purchase logic
  }
}
```

## Supported Payment Networks

### Base Sepolia Testnet

- Contract Address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
- Supported Tokens: USDC

### Base Mainnet

- Contract Address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- Supported Tokens: USDC

## API Reference

### `PaymentsTools` Class

#### Constructor

```typescript
constructor();
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

#### `priceListing`

```typescript
abstract priceListing(
  request: PriceListingRequest
): Promise<PriceListingResponse>
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
  USDC_BASE_SEPOLIA = "USDC_BASE_SEPOLIA",
  USDC_BASE_MAINNET = "USDC_BASE_MAINNET",
}
```

### Money

```typescript
type Money = string; // Format: "0.01", "1.00", etc.
```

## Testing your server locally

To test your MonetizedMCP server locally, follow these steps:

1. **Configure Claude Desktop** - Set up your development environment
2. **Interact with your server** - Test the payment flow and functionality

For detailed instructions, refer to the [Fluora Local Testing Guide](https://www.fluora.ai/alpha/guides/local-testing-guide) and [Getting Started Guide](https://www.fluora.ai/alpha/getting-started).

## Tips

#### Environment Variable Management

- **Keep sensitive data in environment variables**
- **Use a configuration file**: Create a config file that pulls from environment variables to reduce direct access to the environment and import them when it is needed.
- **Example configuration setup**:
  ```typescript
  // config.ts
  export const config = {
    apiKey: process.env.API_KEY || "",
    apiUrl: process.env.API_URL || "https://someapi/api",
  };
  ```

## Future Improvements

- Additional payment methods
- Enhanced error handling
- More network support
- Additional token standards

## Samples

Check out our implementation of a MonetizedMCP server using [PDFShift](https://github.com/MonetizedMCP/monetized-mcp-sample).

#### Network Configuration

- **Test on testnets first**: Always test your implementation on Base Sepolia before deploying to mainnet
- **Environment-specific configs**: Use different configurations for development, staging, and production

## Common Issues

#### ES Modules Configuration

If you encounter module-related errors, ensure your project is using ES Modules:

1. **Update `package.json`**:

   ```json
   {
     "type": "module"
   }
   ```

2. **Configure `tsconfig.json`**:
   ```json
   {
     "compilerOptions": {
       "target": "ESNext",
       "module": "NodeNext",
       "moduleResolution": "NodeNext"
     }
   }
   ```

#### Payment Verification Issues

- Ensure you're using the correct network (Base Sepolia for testing, Base Mainnet for production)
- Verify your wallet has sufficient USDC balance
- Check that the facilitator URL is accessible

#### MCP Server Connection

- Confirm your server is running and accessible
- Verify the MCP server URL is correct
- Check that all required tools are properly implemented

For additional help, open an issue in our repository.

## License

MIT
