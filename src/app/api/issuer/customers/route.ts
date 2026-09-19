import { NextResponse } from "next/server";
import { createOnboardToken, isWalletAddress, normalizeEmail, normalizeWallet } from "@/lib/issuers/customers";
import { requireApprovedIssuer } from "@/lib/issuers/current-issuer";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { issuer, error, status } = await requireApprovedIssuer();
  if (error || !issuer) {
    return NextResponse.json({ error }, { status });
  }

  const { data, error: queryError } = await issuerClient(issuer.id);
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }
  return NextResponse.json({ customers: data || [] });
}

async function issuerClient(issuerId: string) {
  const admin = createAdminClient();
  return admin
    .from("issuer_customers")
    .select(
      "id, issuer_id, full_name, email, wallet_address, user_id, onboard_sent_at, onboard_claimed_at, created_at, certificate_issuances(id, token_id)",
    )
    .eq("issuer_id", issuerId)
    .order("created_at", { ascending: false });
}

export async function POST(request: Request) {
  const { issuer, error, status } = await requireApprovedIssuer();
  if (error || !issuer) {
    return NextResponse.json({ error }, { status });
  }

  const body = (await request.json()) as {
    fullName?: string;
    email?: string;
    walletAddress?: string;
  };

  const fullName = (body.fullName || "").trim() || null;
  const email = body.email ? normalizeEmail(body.email) : null;
  let walletAddress = body.walletAddress ? normalizeWallet(body.walletAddress) : null;

  if (walletAddress && !isWalletAddress(walletAddress)) {
    return NextResponse.json({ error: "Wallet must be a valid 0x address" }, { status: 400 });
  }
  if (!email && !walletAddress) {
    return NextResponse.json({ error: "Enter an email or a wallet address" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error: insertError } = await admin
    .from("issuer_customers")
    .insert({
      issuer_id: issuer.id,
      full_name: fullName,
      email,
      wallet_address: walletAddress,
      onboard_token: createOnboardToken(),
    })
    .select(
      "id, issuer_id, full_name, email, wallet_address, user_id, onboard_sent_at, onboard_claimed_at, created_at",
    )
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ customer: data });
}
