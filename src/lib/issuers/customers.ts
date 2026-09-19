import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type IssuerCustomer = {
  id: string;
  issuer_id: string;
  full_name: string | null;
  email: string | null;
  wallet_address: string | null;
  user_id: string | null;
  onboard_token: string | null;
  onboard_sent_at: string | null;
  onboard_claimed_at: string | null;
  created_at: string;
};

export function createOnboardToken() {
  return randomBytes(24).toString("hex");
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeWallet(value: string) {
  return value.trim().toLowerCase();
}

export function isWalletAddress(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}

export async function attachOwnerWalletToCustomers(
  admin: SupabaseClient,
  {
    userId,
    email,
    walletAddress,
    token,
  }: {
    userId: string;
    email?: string | null;
    walletAddress: string;
    token?: string | null;
  },
) {
  const address = normalizeWallet(walletAddress);
  const now = new Date().toISOString();
  const ids = new Set<string>();

  if (token) {
    const { data } = await admin
      .from("issuer_customers")
      .update({
        wallet_address: address,
        user_id: userId,
        onboard_claimed_at: now,
      })
      .eq("onboard_token", token)
      .select("id");
    for (const row of data || []) ids.add(row.id);
  }

  if (email) {
    const { data } = await admin
      .from("issuer_customers")
      .update({
        wallet_address: address,
        user_id: userId,
        onboard_claimed_at: now,
      })
      .eq("email", normalizeEmail(email))
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .select("id");
    for (const row of data || []) ids.add(row.id);
  }

  await admin.from("issuer_customers").update({ wallet_address: address }).eq("user_id", userId);

  if (ids.size > 0) {
    await admin.from("profiles").update({ user_type: "owner" }).eq("id", userId);
  }

  return ids.size;
}

export async function findOwnerWalletByEmail(admin: SupabaseClient, email: string) {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, wallet_address, full_name, user_type")
    .eq("email", email)
    .maybeSingle();

  if (!profile?.wallet_address || (profile.user_type && profile.user_type !== "owner")) {
    return null;
  }

  return {
    userId: profile.id as string,
    walletAddress: normalizeWallet(profile.wallet_address),
    fullName: (profile.full_name as string | null) || null,
  };
}
