import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/issuers/customers";
import { requireApprovedIssuer } from "@/lib/issuers/current-issuer";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { issuer, error, status } = await requireApprovedIssuer();
  if (error || !issuer) {
    return NextResponse.json({ error }, { status });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("issuer_customers")
    .select("id, email, wallet_address")
    .eq("id", id)
    .eq("issuer_id", issuer.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    fullName?: string;
    email?: string;
  };

  const fullName = (body.fullName || "").trim() || null;
  const email = body.email ? normalizeEmail(body.email) : null;
  if (email && !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  if (!email && !existing.wallet_address) {
    return NextResponse.json({ error: "Enter an email or keep a destination wallet" }, { status: 400 });
  }

  const { data, error: updateError } = await admin
    .from("issuer_customers")
    .update({
      full_name: fullName,
      email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("issuer_id", issuer.id)
    .select("id, full_name, email, wallet_address")
    .single();

  if (updateError || !data) {
    return NextResponse.json({ error: updateError?.message || "Could not update customer" }, { status: 400 });
  }

  return NextResponse.json({ customer: data });
}
