import {
  MonetizedMCPServer,
  PaymentMethodResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PricingListingResponse,
  PurchaseRequest,
  PurchaseResponse,
} from "../../../src/main.js";

const axios = require("axios");

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
        paymentMethod: "USDC_BASE_SEPOLIA" as any,
      },
    ]);
  }
  async makePurchase(
    purchaseRequest: PurchaseRequest
  ): Promise<PurchaseResponse> {
    try {
      const pdfBuffers: Buffer[] = [];
      for (const item of purchaseRequest.items) {
        await axios
          .request({
            method: "post",
            url: "https://api.pdfshift.io/v3/convert/pdf",
            responseType: "arraybuffer",
            data: {
              source: item.params!.websiteUrl,
            },
            auth: { username: "api", password: process.env.PDFSHIFT_API_KEY },
          })
          .then((response: any) => {
            pdfBuffers.push(response.data);
          })
          .catch((error: any) => {
            console.error(error);
            throw error;
          });
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
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  constructor() {
    super();
    super.runMonetizeMCPServer();
  }
}

new MCPServer();
