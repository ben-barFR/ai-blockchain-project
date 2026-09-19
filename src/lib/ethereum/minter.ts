import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChain, getRpcUrl } from "@/lib/ethereum/client";

export function getMinterClient() {
  const key = process.env.CERT_MINTER_PRIVATE_KEY;
  if (!key) {
    throw new Error("CERT_MINTER_PRIVATE_KEY is not set");
  }
  const account = privateKeyToAccount(
    (key.startsWith("0x") ? key : `0x${key}`) as Hex,
  );
  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(getRpcUrl()),
  });
}
