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
abstract paymentMethods(): Promise<PaymentMethodsResponse>
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

## Troubleshooting

### Common Issues

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

## Vibe Integration

If you're using a Vibe coding tool (like Cursor, VS Code, or Claude Code)  to create or modify a MonetizedMCP server, this integration is designed to automatically expose your service logic as monetized tools.

### 🛠 When Creating a New MonetizedMCP Server

When you generate a new MonetizedMCP server using a Vibe tool:

- Each **endpoint** or **API method** you define will be exposed as a separate entry in the `priceListing` tool.
- The **parameters** required by the endpoint will be mapped automatically to the `params` field of each price listing entry.
- Pricing, metadata, and payment method support can be added inline or configured via the Vibe interface.

This allows you to instantly launch a monetized service where agents can discover and call your endpoints programmatically with payment.

### 🔄 When Converting an Existing MCP Server

If you use a Vibe tool to **convert an existing MCP server** into a MonetizedMCP server:

- Each existing MCP **tool** (i.e. RPC method) will be listed as an entry in the `priceListing` tool.
- Vibe will preserve tool names, schemas, and descriptions, and append pricing and monetization metadata.
- Parameters will be preserved as-is, and you’ll be able to set pricing options directly within Vibe.

This enables seamless migration of existing agent services into a monetized environment with minimal changes to your code.

### 📦 Example Generated Price Listing Entry

```json
{
  "name": "getSummary",
  "description": "Returns a summary of a document",
  "price": {
    "amount": 0.25,
    "currency": "USDC"
  },
  "paymentMethod": "USDC_BASE_SEPOLIA",
  "params": {
    "documentUrl": "https://example.com/doc.pdf"
  }
}
```

### License

MIT
