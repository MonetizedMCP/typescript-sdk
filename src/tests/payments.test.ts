import { describe, it, expect } from "vitest";
import { PaymentsTools } from "../payments/payment-tools-x402.js";
import { Address } from "viem";
import { Money } from "x402/types";
import dotenv from "dotenv";
dotenv.config();

describe("PaymentTools X402 Integration Tests", () => {
  const paymentTools = new PaymentsTools();
  const sellerAddress = process.env.LOCAL_WALLET_ADDRESS as Address;
  const buyerWalletPrivateKey = process.env.LOCAL_WALLET_PRIVATE_KEY as Address;
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
      "0.01" as Money,
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
      0.01,
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
      "0.01" as Money,
      sellerAddress,
      {
        facilitatorUrl: "https://x402.org/facilitator",
        paymentHeader: Buffer.from("{}").toString("base64"),
        resource,
      }
    );

    expect(verificationResult.success).toBe(false);
    expect(verificationResult.message).toContain(
      "Error during payment verification"
    );
  });
});
