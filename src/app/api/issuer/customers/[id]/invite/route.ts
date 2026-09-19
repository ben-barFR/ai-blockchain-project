import { NextResponse } from "next/server";
import { onboardUrl } from "@/lib/app-url";
import { createOnboardToken } from "@/lib/issuers/customers";
import { requireApprovedIssuer } from "@/lib/issuers/current-issuer";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { issuer, user, error, status } = await requireApprovedIssuer();
  if (error || !issuer || !user) {
    return NextResponse.json({ error }, { status });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("issuer_customers")
    .select("id, email, full_name, wallet_address, onboard_token")
    .eq("id", id)
    .eq("issuer_id", issuer.id)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  if (!customer.email) {
    return NextResponse.json({ error: "Customer has no email to send the onboarding link to" }, { status: 400 });
  }

  const token = customer.onboard_token || createOnboardToken();
  const { data: updated } = await admin
    .from("issuer_customers")
    .update({
      onboard_token: token,
      onboard_sent_at: new Date().toISOString(),
    })
    .eq("id", customer.id)
    .select(
      "id, issuer_id, full_name, email, wallet_address, user_id, onboard_sent_at, onboard_claimed_at, created_at",
    )
    .single();

  const link = onboardUrl(token);
  const subject = `Your building certificate from ${issuer.company_name}`;
  const body = [
    `Hello${customer.full_name ? ` ${customer.full_name}` : ""},`,
    "",
    `${issuer.company_name} is ready to issue a building certificate to you.`,
    "Open this link to sign in or register. That attaches your wallet so the certificate can be sent:",
    "",
    link,
    "",
    "If you already have a wallet, you can also email that address back to us.",
  ].join("\n");

  const mailto = `mailto:${encodeURIComponent(customer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return NextResponse.json({
    ok: true,
    link,
    mailto,
    to: customer.email,
    from: user.email,
    customer: updated,
  });
}
