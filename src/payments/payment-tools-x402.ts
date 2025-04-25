import { Address, createWalletClient, Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  createPaymentHeader,
  Money,
  moneySchema,
  PaymentDetails,
  settleResponseHeader,
  SignerWallet,
  useFacilitator,
} from "x402";
import { getUsdcAddressForChain } from "../utils/usdc.js";

interface ITools {
  signTransaction(
    amount: number,
    sellerWalletAddress: string,
    buyerWalletAddress: string,
    resource: `${string}://${string}`
  ): Promise<string>;
  verifyPayment(
    amount: Money,
    address: Address,
    {
      facilitatorUrl,
      paymentHeader,
      resource,
    }: {
      facilitatorUrl: string;
      paymentHeader: string;
      resource: `${string}://${string}`;
    }
  ): Promise<any>;
}

export class PaymentsTools implements ITools {
  constructor() {}

  async signTransaction(
    amount: number,
    sellerWalletAddress: string,
    buyerWalletAddress: string,
    resource: `${string}://${string}`
  ): Promise<string> {
    const privateKey = `0x${buyerWalletAddress}`;
    const wallet = createWalletClient({
      chain: baseSepolia,
      transport: http(),
      account: privateKeyToAccount(privateKey as Hex),
    }) as unknown as SignerWallet;

    const paymentDetails: PaymentDetails = {
      scheme: "exact",
      networkId: "84532",
      maxAmountRequired: BigInt(amount * 10 ** 6),
      resource,
      description: "Payment for order",
      mimeType: "application/json",
      payToAddress: sellerWalletAddress,
      requiredDeadlineSeconds: 3600,
      usdcAddress: getUsdcAddressForChain(84532),
      outputSchema: null,
      extra: null,
    };
    const paymentHeader = await createPaymentHeader(wallet, paymentDetails);

    return paymentHeader;
  }

  /**
   * Sends a payment transaction to a specified destination address.
   *
   * @param {number} amount - The amount to send
   * @param {string} destinationWalletAddress - The recipient's wallet address
   * @returns {Promise<{resultMessage: string, hash: string}>} An object containing:
   *   - resultMessage: A string describing the transaction result or error
   *   - hash: The transaction hash if successful, empty string if failed
   */
  async verifyPayment(
    amount: Money,
    address: Address,
    {
      facilitatorUrl = "https://x402.org/facilitator",
      paymentHeader,
      resource,
    }: any
  ): Promise<any> {
    try {
      const parsedAmount = moneySchema.safeParse(amount);
      if (!parsedAmount.success) {
        throw new Error(
          `Invalid amount (amount: ${amount}). Must be in the form "$3.10", 0.10, "0.001", ${parsedAmount.error}`
        );
      }

      const { verify, settle } = useFacilitator(facilitatorUrl);

      if (!paymentHeader) {
        throw new Error("No payment header found");
      }

      const paymentDetails: PaymentDetails = {
        scheme: "exact",
        networkId: "84532",
        maxAmountRequired: BigInt(parsedAmount.data * 10 ** 6),
        resource,
        description: "Payment for order",
        mimeType: "application/json",
        payToAddress: address,
        requiredDeadlineSeconds: 3600,
        usdcAddress: getUsdcAddressForChain(84532),
        outputSchema: null,
        extra: null,
      };

      try {
        const response = await verify(paymentHeader, paymentDetails);
        if (!response.isValid) {
          console.error("Invalid payment:", response.invalidReason);
          return {
            success: false,
            message: response.invalidReason,
          };
        }
      } catch (error: any) {
        console.error("Error during payment verification:", error.response.data);
        return {
          success: false,
          message: "Error during payment verification",
        };
      }

      try {
        const settleResponse = await settle(paymentHeader, paymentDetails);
        const responseHeader = settleResponseHeader(settleResponse);
        return {
          success: true,
          message: "Payment settled successfully",
          responseHeader,
        };
      } catch (error: any) {
        console.error("Settlement failed:", error.response.data);
        return {
          success: false,
          message: "Settlement failed",
        };
      }
    } catch (error: any) {
      return { resultMessage: "Error: " + error.message, hash: "" };
    }
  }
}
