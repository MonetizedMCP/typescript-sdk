import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import { z } from "zod";
import { PaymentMethods } from "../payments/payment-method.js";
import { PaymentsTools } from "../payments/payment-tools.js";

export type PricingListingItem = {
  name: string;
  description: string;
  price: number;
  currency: string;
  params: Record<string, any>;
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

export type PlaceOrderRequest = {
  items: PricingListingItem[];
};

export type PlaceOrderResponse = {
  items: PricingListingItem[];
  orderId: string;
  totalPrice: number;
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
  buyerAccountId: string;
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
    this.server.tool("pricing-listing", {}, async () => {
      try {
        const pricingListing = await this.pricingListing();
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
      "place-order",
      {
        items: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            price: z.number(),
            currency: z.string(),
            params: z.record(z.any()),
          })
        ),
      },
      async ({ items }) => {
        try {
          const purchase = await this.placeOrder({ items });
          return {
            content: [{ type: "text", text: JSON.stringify(purchase) }],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error placing order: ${error.message}`,
              },
            ],
          };
        }
      }
    );
    this.server.tool(
      "make-purchase",
      {
        items: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            price: z.number(),
            currency: z.string(),
            params: z.record(z.any()),
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
          const paymentTools = new PaymentsTools();
          const result = await paymentTools.sendPayment(
            totalPrice,
            buyerAccountId,
            paymentMethod,
            signedTransaction
          );
          if (result.hash) {
            const purchase = await this.makePurchase({
              items,
              totalPrice,
              buyerAccountId,
              signedTransaction,
              paymentMethod,
            });
            return {
              content: [{ type: "text", text: JSON.stringify(purchase) }],
            };
          } else {
            throw new Error(result.resultMessage);
          }
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

  abstract pricingListing(): Promise<PricingListingResponse>;
  abstract paymentMethod(): Promise<PaymentMethodResponse[]>;
  abstract placeOrder(
    placeOrderRequest: PlaceOrderRequest
  ): Promise<PlaceOrderResponse>;
  abstract makePurchase(
    purchaseRequest: PurchaseRequest
  ): Promise<PurchaseResponse>;

  public async runMonetizeMCPServer() {
    const transports: { [sessionId: string]: SSEServerTransport } = {};

    app.get("/sse", async (_: Request, res: Response) => {
      const transport = new SSEServerTransport("/messages", res);
      transports[transport.sessionId] = transport;
      res.on("close", () => {
        delete transports[transport.sessionId];
      });
      await this.server.connect(transport);
    });

    app.post("/messages", async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports[sessionId];
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send("No transport found for sessionId");
      }
    });

    app.listen(3020, () => {
      console.error("MCP Server listening on port 3020");
    });
  }
}
