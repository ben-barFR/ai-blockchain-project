import { config as loadEnv } from "dotenv";
import { defineConfig } from "hardhat/config";

loadEnv({ path: ".env.local" });

const accounts = process.env.CERT_MINTER_PRIVATE_KEY
  ? [process.env.CERT_MINTER_PRIVATE_KEY]
  : [];

const rpcUrl =
  process.env.SEPOLIA_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

export default defineConfig({
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    sepolia: {
      type: "http",
      chainId: 11155111,
      url: rpcUrl,
      accounts,
    },
  },
});
