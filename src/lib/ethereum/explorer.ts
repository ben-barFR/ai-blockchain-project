import { getChainId } from "@/lib/ethereum/chain-id";

const EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  11155111: "https://sepolia.etherscan.io",
  137: "https://polygonscan.com",
};

export function getExplorerBaseUrl() {
  return EXPLORERS[getChainId()] || null;
}

export function explorerAddressUrl(address: string) {
  const base = getExplorerBaseUrl();
  if (!base || !address) return null;
  return `${base}/address/${address}`;
}

export function explorerTxUrl(hash: string) {
  const base = getExplorerBaseUrl();
  if (!base || !hash) return null;
  return `${base}/tx/${hash}`;
}

export function explorerTokenUrl(contractAddress: string, tokenId: string | number | bigint) {
  const base = getExplorerBaseUrl();
  if (!base || !contractAddress) return null;
  return `${base}/nft/${contractAddress}/${tokenId}`;
}

export function getNetworkLabel() {
  if (getChainId() === 11155111) return "Sepolia";
  if (getChainId() === 31337) return "Hardhat";
  return `Chain ${getChainId()}`;
}

export function googleFaucetUrl(address?: string | null) {
  if (getChainId() !== 11155111) return null;
  const base = "https://cloud.google.com/application/web3/faucet/ethereum/sepolia";
  return address ? `${base}?address=${encodeURIComponent(address)}` : base;
}
