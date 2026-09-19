import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!token) {
    return NextResponse.json({ error: "Onboarding token required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("issuer_customers")
    .select("id, full_name, email, wallet_address, onboard_claimed_at, issuer_id")
    .eq("onboard_token", token)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json({ error: "This onboarding link is invalid or expired" }, { status: 404 });
  }

  const { data: issuer } = await admin
    .from("issuers")
    .select("company_name, user_id")
    .eq("id", customer.issuer_id)
    .maybeSingle();

  const { data: issuerProfile } = issuer
    ? await admin.from("profiles").select("email").eq("id", issuer.user_id).maybeSingle()
    : { data: null };

  return NextResponse.json({
    companyName: issuer?.company_name || "Your certificate issuer",
    issuerEmail: issuerProfile?.email || null,
    customerEmail: customer.email,
    customerName: customer.full_name,
    hasWallet: Boolean(customer.wallet_address),
    claimed: Boolean(customer.onboard_claimed_at),
    walletAddress: customer.wallet_address,
  });
}
