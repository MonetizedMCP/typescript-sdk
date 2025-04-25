import { describe, it, expect } from "vitest";
import { PaymentsTools } from "../payments/payment-tools-x402.js";
import { Address } from "viem";
import { Money } from "x402";

describe("PaymentTools X402 Integration Tests", () => {
  const paymentTools = new PaymentsTools();
  const sellerAddress = "0x069B0687C879b8E9633fb9BFeC3fea684bc238D5" as Address;
  const buyerWalletPrivateKey = "2028cecae352cc027eaf3dc907bac861da6901fc504e4017ced96ca46122e7f1" as Address;
  const resource = "https://example.com/resource" as const;

  it("should sign a transaction and verify payment successfully", async () => {
    // Step 1: Sign the transaction
    const amount = 0.01; // $0.01
    const paymentHeader = await paymentTools.signTransaction(
      amount,
      sellerAddress,
      buyerWalletPrivateKey,
      resource
    );

    expect(paymentHeader).toBeDefined();
    expect(typeof paymentHeader).toBe("string");

    // Step 2: Verify the payment
    const verificationResult = await paymentTools.verifyPayment(
      "10" as Money,
      sellerAddress,
      {
        facilitatorUrl: "https://x402.org/facilitator",
        paymentHeader,
        resource,
      }
    );

    expect(verificationResult).toBeDefined();
    expect(verificationResult.success).toBe(true);
    expect(verificationResult.message).toBe("Payment settled successfully");
    expect(verificationResult.responseHeader).toBeDefined();
  });

  it("should fail verification with invalid amount", async () => {
    const paymentHeader = await paymentTools.signTransaction(
      10,
      sellerAddress,
      buyerWalletPrivateKey,
      resource
    );

    const verificationResult = await paymentTools.verifyPayment(
      "invalid" as Money,
      sellerAddress,
      {
        facilitatorUrl: "https://x402.org/facilitator",
        paymentHeader,
        resource,
      }
    );

    expect(verificationResult.success).toBe(false);
    expect(verificationResult.message).toContain("Invalid amount");
  });

  it("should fail verification with invalid payment header", async () => {
    const verificationResult = await paymentTools.verifyPayment(
      "10" as Money,
      sellerAddress,
      {
        facilitatorUrl: "https://x402.org/facilitator",
        paymentHeader: "invalid-header",
        resource,
      }
    );

    expect(verificationResult.success).toBe(false);
    expect(verificationResult.message).toContain("Error during payment verification");
  });
}); 