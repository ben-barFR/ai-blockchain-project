import { readFile } from "node:fs/promises";
import { config as loadEnv } from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "../src/lib/ethereum/chains";

loadEnv({ path: ".env.local" });

type Artifact = { abi: readonly unknown[]; bytecode: Hex };

async function main() {
  const rawKey = process.env.CERT_MINTER_PRIVATE_KEY?.trim();
  if (!rawKey) {
    throw new Error("CERT_MINTER_PRIVATE_KEY is missing in .env.local");
  }

  const account = privateKeyToAccount(
    (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as Hex,
  );
  const rpc =
    process.env.SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://ethereum-sepolia-rpc.publicnode.com";

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpc),
  });
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpc),
  });

  const artifact = JSON.parse(
    await readFile(
      new URL("../artifacts/contracts/BuildingCertificate.sol/BuildingCertificate.json", import.meta.url),
      "utf8",
    ),
  ) as Artifact;

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Deployer:", account.address);
  console.log("Sepolia balance (wei):", balance.toString());

  if (balance === 0n) {
    throw new Error(
      `This wallet has 0 Sepolia ETH. Send test ETH to ${account.address} from a faucet, then retry.`,
    );
  }

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [account.address],
  });
  console.log("Deploy tx:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error("Deploy succeeded but no contract address was returned");
  }

  console.log("BuildingCertificate deployed:", receipt.contractAddress);
  console.log("Owner / minter:", account.address);
  console.log("Explorer:", `https://sepolia.etherscan.io/address/${receipt.contractAddress}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
