import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { PaymentMethods } from "../payments/payment-method.js";

dotenv.config();

export type ItemPrice = {
  amount: number;
  paymentMethod: PaymentMethods;
};
export type PurchasableItem = {
  id: string;
  name: string;
  description?: string;
  price: ItemPrice;
  params?: Record<string, any>;
};
export type PriceListingRequest = {
  searchQuery?: string;
};
export type PriceListingResponse = {
  items: PurchasableItem[];
};
export type PaymentMethodsResponse = {
  walletAddress: string;
  paymentMethod: PaymentMethods;
};
export type MakePurchaseRequest = {
  itemId: string;
  params: Record<string, any>;
  signedTransaction: string;
  paymentMethod: PaymentMethods;
};
export type MakePurchaseResponse = {
  purchasableItemId: string;
  makePurchaseRequest: MakePurchaseRequest;
  orderId: string;
  toolResult: string;
};

const app = express();
app.use(express.json());

export abstract class MonetizedMCPServer {
  protected server: McpServer;
  constructor() {
    this.server = new McpServer({
      name: "Demo",
      version: "1.0.0",
    });
    this.registerMonetizeTools();
  }

  private registerMonetizeTools() {
    this.server.tool("pricing-listing", {
      searchQuery: z.string().optional(),
    }, async ({ searchQuery }) => {
        try {
          const pricingListing = await this.pricingListing({ searchQuery });
          return {
            content: [{ type: "text", text: JSON.stringify(pricingListing) }],
          };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting pricing listing: ${error.message}`,
            },
          ],
        };
      }
    });
    this.server.tool("payment-methods", {}, async () => {
      try {
        const paymentMethods = await this.paymentMethods();
        return {
          content: [{ type: "text", text: JSON.stringify(paymentMethods) }],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting payment methods: ${error.message}`,
            },
          ],
        };
      }
    });
    this.server.tool(
      "make-purchase",
      {
        itemId: z.string(),
        params: z.record(z.string(), z.any()),
        signedTransaction: z.string(),
        paymentMethod: z.nativeEnum(PaymentMethods),
      },
      async ({ itemId, params, signedTransaction, paymentMethod }) => {
        try {
          const purchase = await this.makePurchase({
            itemId,
            params,
            signedTransaction,
            paymentMethod,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(purchase) }],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error making purchase: ${error.message}`,
              },
            ],
          };
        }
      }
    );
  }

  abstract pricingListing(pricingListingRequest: PriceListingRequest): Promise<PriceListingResponse>;
  abstract paymentMethods(): Promise<PaymentMethodsResponse[]>;
  abstract makePurchase(
    purchaseRequest: MakePurchaseRequest
  ): Promise<MakePurchaseResponse>;

  public async runMonetizeMCPServer() {
    console.log("Starting monetized MCP server");
    const transports: { [sessionId: string]: StreamableHTTPServerTransport } =
      {};

    app.post("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            transports[sessionId] = transport;
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
          }
        };

        await this.server.connect(transport);
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    });

    const handleSessionRequest = async (req: express.Request, res: express.Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    };

    app.get("/mcp", handleSessionRequest);
    app.delete("/mcp", handleSessionRequest);

    app.listen(process.env.PORT || 8080, () => {
      console.log(`MCP Server listening on port ${process.env.PORT || 8080}`);
    });
  }
}
