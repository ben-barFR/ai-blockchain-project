import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors/injected";
import { getChain, getRpcUrl } from "@/lib/ethereum/client";

const chain = getChain();

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: {
    [chain.id]: http(getRpcUrl()),
  },
  ssr: true,
});
