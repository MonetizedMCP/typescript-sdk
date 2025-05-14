import { Address, createWalletClient, Hex, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createPaymentHeader } from "x402/client";
import { exact } from "x402/schemes";
import { processPriceToAtomicAmount } from "x402/shared";
import {
  Money,
  moneySchema,
  PaymentRequirements,
  settleResponseHeader,
} from "x402/types";
import { useFacilitator } from "x402/verify";
import { getChainFromPaymentMethod, getNetworkFromChain } from "./currency.js";
import { PaymentMethods } from "./payment-method.js";

interface ITools {
  signTransaction(
    amount: number,
    sellerWalletAddress: string,
    buyerWalletAddress: string,
    resource: `${string}://${string}`,
    paymentMethod: PaymentMethods
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
    resource: `${string}://${string}`,
    paymentMethod: PaymentMethods
  ): Promise<string> {
    try {
      const privateKey = `0x${buyerWalletAddress}`;
      const chain = getChainFromPaymentMethod(paymentMethod);
      const wallet = createWalletClient({
        chain,
        transport: http(),
        account: privateKeyToAccount(privateKey as Hex),
      }).extend(publicActions) as any;

      const atomicAmountForAsset = processPriceToAtomicAmount(
        amount,
        getNetworkFromChain(chain)
      );
      if ("error" in atomicAmountForAsset) {
        throw new Error(atomicAmountForAsset.error);
      }
      const { maxAmountRequired, asset } = atomicAmountForAsset;

      const paymentDetails: PaymentRequirements = {
        scheme: "exact",
        network: getNetworkFromChain(chain),
        maxAmountRequired,
        resource,
        description: "Payment for order",
        mimeType: "application/json",
        payTo: sellerWalletAddress,
        maxTimeoutSeconds: 300,
        asset: asset.address,
        outputSchema: undefined,
        extra: asset?.eip712,
      };
      const paymentHeader = await createPaymentHeader(
        wallet,
        1,
        paymentDetails
      );

      return paymentHeader;
    } catch (error: any) {
      return error.message;
    }
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
      paymentMethod,
    }: {
      facilitatorUrl: `${string}://${string}`;
      paymentHeader: string;
      resource: `${string}://${string}`;
      paymentMethod: PaymentMethods;
    }
  ): Promise<{ success: boolean; message: string; responseHeader: string }> {
    try {
      const { verify, settle } = useFacilitator({ url: facilitatorUrl });
      const parsedAmount = moneySchema.safeParse(amount);
      if (!parsedAmount.success) {
        throw new Error(
          `Invalid amount (amount: ${amount}). Must be in the form "$3.10", 0.10, "0.001", ${parsedAmount.error}`
        );
      }

      if (!paymentHeader) {
        throw new Error("No payment header found");
      }
      const chain = getChainFromPaymentMethod(paymentMethod);

      const atomicAmountForAsset = processPriceToAtomicAmount(
        amount,
        getNetworkFromChain(chain)
      );
      if ("error" in atomicAmountForAsset) {
        throw new Error(atomicAmountForAsset.error);
      }
      const { maxAmountRequired, asset } = atomicAmountForAsset;

      const paymentDetails: PaymentRequirements = {
        scheme: "exact",
        network: getNetworkFromChain(chain),
        maxAmountRequired,
        resource,
        description: "Payment for order",
        mimeType: "application/json",
        payTo: address,
        maxTimeoutSeconds: 300,
        asset: asset.address,
        outputSchema: undefined,
        extra: asset?.eip712,
      };

      const decodedPayment = exact.evm.decodePayment(paymentHeader);

      try {
        const response = await verify(decodedPayment, paymentDetails);
        if (!response.isValid) {
          console.error("Invalid payment:", response.invalidReason);
          return {
            success: false,
            message: response.invalidReason || "Invalid payment",
            responseHeader: "",
          };
        }
      } catch (error: any) {
        console.error("Error during payment verification:", error);
        return {
          success: false,
          message: "Error during payment verification",
          responseHeader: "",
        };
      }

      try {
        const settlement = await settle(decodedPayment, paymentDetails);
        const responseHeader = settleResponseHeader(settlement);
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
          responseHeader: "",
        };
      }
    } catch (error: any) {
      return {
        message: "Error during payment verification: " + error.message,
        success: false,
        responseHeader: "",
      };
    }
  }
}
