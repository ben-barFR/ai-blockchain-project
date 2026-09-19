import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("issuer_customers")
    .select("id, onboard_claimed_at")
    .eq("id", id)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json({ error: "Pending customer not found" }, { status: 404 });
  }
  if (customer.onboard_claimed_at) {
    return NextResponse.json({ error: "This customer already completed onboarding" }, { status: 409 });
  }

  const { error } = await admin
    .from("issuer_customers")
    .update({ onboard_sent_at: null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
