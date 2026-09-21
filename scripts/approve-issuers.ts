import { config as loadEnv } from "dotenv";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "../src/lib/ethereum/chains";

loadEnv({ path: ".env.local" });

const ISSUERS = [
  "0x9afa5145816ebf5ec1d225b9faba3b276f07a9c5",
  "0x7a69eb65b729e09714d16ab5dbf991729bb11e26",
] as const;

async function main() {
  const rawKey = process.env.CERT_MINTER_PRIVATE_KEY?.trim();
  const contract = process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT as `0x${string}` | undefined;
  if (!rawKey || !contract) {
    throw new Error("CERT_MINTER_PRIVATE_KEY or NEXT_PUBLIC_CERTIFICATE_CONTRACT is missing");
  }

  const account = privateKeyToAccount((rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as Hex);
  const rpc =
    process.env.SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://ethereum-sepolia-rpc.publicnode.com";
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });
  const abi = [
    {
      type: "function",
      name: "setApprovedIssuer",
      stateMutability: "nonpayable",
      inputs: [
        { name: "issuer", type: "address" },
        { name: "approved", type: "bool" },
      ],
      outputs: [],
    },
  ] as const;

  for (const issuer of ISSUERS) {
    const hash = await wallet.writeContract({
      address: contract,
      abi,
      functionName: "setApprovedIssuer",
      args: [issuer, true],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("Approved", issuer, hash);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
