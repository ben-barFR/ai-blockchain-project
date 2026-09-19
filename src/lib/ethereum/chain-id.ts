export function getChainId() {
  return Number(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");
}
