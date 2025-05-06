import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import { PaymentMethods } from "../payments/payment-method.js";
import dotenv from "dotenv";

dotenv.config();

export type PricingListingItem = {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  params?: Record<string, any>;
};

export type PricingListingRequest = {
  searchQuery?: string;
};

export type PricingListingResponse = {
  items: PricingListingItem[];
};

export type PaymentMethodResponse = {
  name: string;
  description: string;
  sellerAccountId: string;
  paymentMethod: PaymentMethods;
};

export type PurchaseResponse = {
  items: PricingListingItem[];
  purchaseRequest: PurchaseRequest;
  orderId: string;
  toolResult: string;
};

export type PurchaseRequest = {
  items: PricingListingItem[];
  totalPrice: number;
  signedTransaction: string;
  paymentMethod: PaymentMethods;
};

const app = express();

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
    this.server.tool("payment-method", {}, async () => {
      try {
        const paymentMethod = await this.paymentMethod();
        return {
          content: [{ type: "text", text: JSON.stringify(paymentMethod) }],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting payment method: ${error.message}`,
            },
          ],
        };
      }
    });
    this.server.tool(
      "make-purchase",
      {
        items: z.array(
          z.object({
            name: z.string().trim().min(1),
            description: z.string().trim().min(1),
            price: z.number().min(0),
            currency: z.string().trim().min(1),
            params: z.record(z.string(), z.any()),
          })
        ),
        totalPrice: z.number(),
        buyerAccountId: z.string(),
        signedTransaction: z.string(),
        paymentMethod: z.nativeEnum(PaymentMethods),
      },
      async ({
        items,
        totalPrice,
        buyerAccountId,
        signedTransaction,
        paymentMethod,
      }) => {
        try {
          const purchase = await this.makePurchase({
            items,
            totalPrice,
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

  abstract pricingListing(pricingListingRequest: PricingListingRequest): Promise<PricingListingResponse>;
  abstract paymentMethod(): Promise<PaymentMethodResponse[]>;
  abstract makePurchase(
    purchaseRequest: PurchaseRequest
  ): Promise<PurchaseResponse>;

  public async runMonetizeMCPServer() {
    console.log("Starting monetized MCP server");
    const transports: { [sessionId: string]: SSEServerTransport } = {};

    app.get("/sse", async (_: Request, res: Response) => {
      try {
        console.log("New SSE connection");
        const transport = new SSEServerTransport("/messages", res);
        transports[transport.sessionId] = transport;
        res.on("close", () => {
          delete transports[transport.sessionId];
        });
        await this.server.connect(transport);
      } catch (error: any) {
        console.log("Error handling SSE connection", error);
        res.status(500).send(`Error handling message: ${error.message}`);
      }
    });

    app.post("/messages", async (req: Request, res: Response) => {
      try {
        console.log("New message");
        const sessionId = req.query.sessionId as string;
        const transport = transports[sessionId];
        if (transport) {
          await transport.handlePostMessage(req, res);
        } else {
          res.status(400).send("No transport found for sessionId");
        }
      } catch (error: any) {
        console.log("Error handling message", error);
        res.status(500).send(`Error handling message: ${error.message}`);
      }
    });

    app.listen(process.env.PORT || 8080, () => {
      console.log(`MCP Server listening on port ${process.env.PORT || 8080}`);
    });
  }
}
