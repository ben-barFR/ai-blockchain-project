import { NextResponse } from "next/server";
import { findOwnerWalletByEmail, normalizeEmail } from "@/lib/issuers/customers";
import { requireApprovedIssuer } from "@/lib/issuers/current-issuer";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { error, status } = await requireApprovedIssuer();
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const email = normalizeEmail(new URL(request.url).searchParams.get("email") || "");
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const match = await findOwnerWalletByEmail(createAdminClient(), email);
  if (!match) {
    return NextResponse.json({ walletAddress: null, fullName: null, matched: false });
  }

  return NextResponse.json({
    walletAddress: match.walletAddress,
    fullName: match.fullName,
    matched: true,
  });
}
