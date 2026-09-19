import { createEthereumWallet } from "@/lib/ethereum/wallet";

export async function ensureProfileWallet(
  client: {
    from: (table: string) => any;
  },
  userId: string,
) {
  const { data: profile } = await client
    .from("profiles")
    .select("wallet_address, generated_wallet_key, wallet_source")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.wallet_address) {
    return {
      address: profile.wallet_address as string,
      privateKey: (profile.generated_wallet_key as string | null) || null,
      source: (profile.wallet_source as string) || "generated",
    };
  }

  const created = createEthereumWallet();
  const { error } = await client
    .from("profiles")
    .update({
      wallet_address: created.address,
      generated_wallet_key: created.privateKey,
      wallet_source: "generated",
    })
    .eq("id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return {
    address: created.address,
    privateKey: created.privateKey,
    source: "generated" as const,
  };
}
