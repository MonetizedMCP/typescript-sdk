import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Currency } from "../payments/currency";

export type PricingListingItem = {
    name: string;
    description: string;
    price: number;
    currency: string;
}

export type PricingListingResponse = {
    items: PricingListingItem[];
}

export type PaymentMethodResponse = {
    name: string;
    chain: string;
    description: string;
    sellerAccountId: string;
    currency: Currency;
}

export type PurchaseResponse = {
    items: PricingListingItem[];
    purchaseRequest: PurchaseRequest;
    orderId: string;
}

export type PurchaseRequest = {
    items: PricingListingItem[];
    totalPrice: number;
    buyerAccountId: string;
    transactionHash: string;
    currency: Currency;
}

export abstract class MonetizedMCPServer {
    protected server: McpServer;
    constructor() {
        this.server = new McpServer({
            name: "Demo",
            version: "1.0.0"
        });
        this.registerMonetizeTools();
    }

    private registerMonetizeTools() {
        this.server.tool("pricing-listing",
            {},
            async () => {
                try {
                    const pricingListing = await this.pricingListing();
                    return { content: [{ type: "text", text: JSON.stringify(pricingListing) }] };
                } catch (error: any) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error getting pricing listing: ${error.message}`
                        }]
                    };
                }
            }
        );
        this.server.tool("payment-method",
            {},
            async () => {
                try {
                    const paymentMethod = await this.paymentMethod();
                    return { content: [{ type: "text", text: JSON.stringify(paymentMethod) }] };
                } catch (error: any) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error getting payment method: ${error.message}`
                        }]
                    };
                }
            }
        );
        this.server.tool("make-purchase",
            { filePath: z.string() },
            async ({ filePath }) => {
                try {
                    const purchase = await this.makePurchase();
                    return { content: [{ type: "text", text: JSON.stringify(purchase) }] };
                } catch (error: any) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error making purchase: ${error.message}`
                        }]
                    };
                }
            }
        );
    }

    abstract pricingListing(): Promise<PricingListingResponse>;
    abstract paymentMethod(): Promise<PaymentMethodResponse[]>;
    abstract makePurchase(): Promise<PurchaseResponse>;
    
    public async runMonetizeMCPServer() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}