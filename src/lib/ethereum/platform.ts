import { formatEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getPublicClient, isContractConfigured } from "@/lib/ethereum/client";

export function getPlatformWalletAddress() {
  const key = process.env.CERT_MINTER_PRIVATE_KEY?.trim();
  if (!key) return null;
  return privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as Hex).address;
}

export async function getPlatformWalletBalance(address: string) {
  try {
    const balance = await getPublicClient().getBalance({ address: address as `0x${string}` });
    return `${Number(formatEther(balance)).toFixed(4)} ETH`;
  } catch {
    return null;
  }
}

export function getConfiguredContractAddress() {
  return isContractConfigured() ? process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT || null : null;
}
