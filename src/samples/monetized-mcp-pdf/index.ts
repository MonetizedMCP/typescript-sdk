import {
  MonetizedMCPServer,
  PaymentMethodResponse,
  PaymentMethods,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PricingListingResponse,
  PurchaseRequest,
  PurchaseResponse,
} from "../../main.js";

export class MCPServer extends MonetizedMCPServer {
  placeOrder(
    placeOrderRequest: PlaceOrderRequest
  ): Promise<PlaceOrderResponse> {
    throw new Error("Method not implemented.");
  }
  pricingListing(): Promise<PricingListingResponse> {
    return Promise.resolve({
      items: [
        {
          name: "Convert to PDF",
          description: "Convert a website to a PDF",
          price: 0.5,
          currency: "USDC",
          params: {
            websiteUrl: "Example: https://en.wikipedia.org/wiki/PDF",
          },
        },
      ],
    });
  }
  paymentMethod(): Promise<PaymentMethodResponse[]> {
    return Promise.resolve([
      {
        name: "USDC",
        description: "USDC",
        sellerAccountId: "0x069B0687C879b8E9633fb9BFeC3fea684bc238D5",
        paymentMethod: PaymentMethods.USDC_BASE_SEPOLIA,
      },
    ]);
  }
  async makePurchase(
    purchaseRequest: PurchaseRequest
  ): Promise<PurchaseResponse> {
    const fetch = require("node-fetch");
    const pdfBuffers: Buffer[] = [];
    for (const item of purchaseRequest.items) {
      const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`api:${process.env.PDFSHIFT_API_KEY}`).toString(
              "base64"
            ),
        },
        body: JSON.stringify({
          source: item.params.websiteUrl,
        }),
      });
      const pdfBuffer = await response.buffer();
      pdfBuffers.push(pdfBuffer);
    }

    return Promise.resolve({
      items: [
        {
          name: "Convert to PDF",
          description: "Convert a website to a PDF",
          price: 0.5,
          currency: "USDC",
          params: {},
        },
      ],
      purchaseRequest: purchaseRequest,
      orderId: "123",
      toolResult: JSON.stringify(
        pdfBuffers.map((buffer) => ({
          type: "pdf",
          data: buffer,
        }))
      ),
    });
  }
  constructor() {
    super();
    super.runMonetizeMCPServer();
  }
}

new MCPServer();