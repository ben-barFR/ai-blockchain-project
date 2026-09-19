import { createPublicClient, http, type Address, type Chain } from "viem";
import { hardhat, sepolia } from "viem/chains";
import { certificateAbi } from "@/lib/ethereum/abi";
import { getChainId } from "@/lib/ethereum/chain-id";

export { getChainId };

const CHAINS: Record<number, Chain> = {
  11155111: sepolia,
  31337: hardhat,
};

export function getChain(): Chain {
  const chain = CHAINS[getChainId()];
  if (!chain) {
    throw new Error(`Unsupported chain id ${getChainId()}`);
  }
  return chain;
}

export function getContractAddress(): Address {
  const address = process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT;
  if (!address) {
    throw new Error("NEXT_PUBLIC_CERTIFICATE_CONTRACT is not set");
  }
  return address as Address;
}

export function isContractConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT);
}

export function getRpcUrl() {
  return (
    process.env.NEXT_PUBLIC_RPC_URL ||
    process.env.POLYGON_RPC_URL ||
    process.env.SEPOLIA_RPC_URL ||
    getChain().rpcUrls.default.http[0]
  );
}

export function getPublicClient() {
  return createPublicClient({
    chain: getChain(),
    transport: http(getRpcUrl()),
  });
}

export function getCertificateContract() {
  return {
    address: getContractAddress(),
    abi: certificateAbi,
  } as const;
}
