import { Address } from "viem";
import { config } from "./config.js";

export function getUsdcAddressForChain(chainId: number): Address {
  return config[chainId.toString()].usdcAddress as Address;
}