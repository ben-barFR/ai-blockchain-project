import { NextResponse } from "next/server";
import { CREDIT_PACK_SIZE, issuanceCreditsRemaining } from "@/lib/issuers/credits";
import { getCurrentIssuer } from "@/lib/issuers/current-issuer";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const { user, issuer } = await getCurrentIssuer();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!issuer) {
    return NextResponse.json({ error: "Register your company first" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("issuers")
    .update({ issuance_credits: issuanceCreditsRemaining(issuer.issuance_credits) + CREDIT_PACK_SIZE })
    .eq("id", issuer.id)
    .select("issuance_credits")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Could not add credits" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    added: CREDIT_PACK_SIZE,
    issuanceCredits: data.issuance_credits,
  });
}
