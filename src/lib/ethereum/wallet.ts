import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export function createEthereumWallet() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address.toLowerCase(),
    privateKey,
  };
}

export function switchWalletMessage(address: string) {
  return `I attach wallet ${address.toLowerCase()} to my BLDCRT account.`;
}
