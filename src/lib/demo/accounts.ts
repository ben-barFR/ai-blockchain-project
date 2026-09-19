import { createAdminClient } from "@/lib/supabase/admin";
import type { DeletedAccount } from "@/lib/demo/types";

export type { DeletedAccount, DemoUser } from "@/lib/demo/types";

function normalizeWallet(value: string | null | undefined) {
  const address = (value || "").trim().toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(address) ? address : null;
}

function uniqueWallets(values: Array<string | null | undefined>) {
  return [...new Set(values.map(normalizeWallet).filter((value): value is string => Boolean(value)))];
}

export async function listDeletedAccountEmails() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("deleted_accounts").select("email");
  if (error) throw error;
  return new Set(
    (data || [])
      .map((row) => row.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );
}

export async function listDeletedAccounts(): Promise<DeletedAccount[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("deleted_accounts")
    .select("id, email, full_name, user_type, wallet_addresses, deleted_at")
    .order("deleted_at", { ascending: false });
  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    userType: row.user_type,
    walletAddresses: Array.isArray(row.wallet_addresses) ? row.wallet_addresses : [],
    deletedAt: row.deleted_at,
  }));
}

export async function deletePlatformAccount(userId: string) {
  const admin = createAdminClient();
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !userData.user) {
    throw new Error("User not found");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, user_type, wallet_address")
    .eq("id", userId)
    .maybeSingle();
  const { data: issuer } = await admin
    .from("issuers")
    .select("id, wallet_address")
    .eq("user_id", userId)
    .maybeSingle();
  const { data: customerRows } = await admin
    .from("issuer_customers")
    .select("wallet_address")
    .eq("user_id", userId);

  const email = profile?.email || userData.user.email || null;
  const archive = {
    user_id: userId,
    email,
    full_name: profile?.full_name || userData.user.user_metadata?.full_name || null,
    user_type: profile?.user_type || userData.user.user_metadata?.user_type || null,
    wallet_addresses: uniqueWallets([
      profile?.wallet_address,
      issuer?.wallet_address,
      ...(customerRows || []).map((row) => row.wallet_address),
    ]),
  };

  const { data: archived, error: archiveError } = await admin
    .from("deleted_accounts")
    .insert(archive)
    .select("id")
    .single();
  if (archiveError || !archived) {
    throw new Error(archiveError?.message || "Could not archive wallet addresses");
  }

  try {
    await admin.from("certificate_reports").delete().eq("uploaded_by", userId);
    if (issuer) {
      await admin.from("certificate_issuances").delete().eq("issuer_id", issuer.id);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }
  } catch (error) {
    await admin.from("deleted_accounts").delete().eq("id", archived.id);
    throw error;
  }

  return archive;
}
