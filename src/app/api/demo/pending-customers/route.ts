import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("issuer_customers")
    .select("id, full_name, email, onboard_token, onboard_sent_at, onboard_claimed_at")
    .not("onboard_sent_at", "is", null)
    .is("onboard_claimed_at", null)
    .order("onboard_sent_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    customers: (data || []).map((customer) => ({
      id: customer.id,
      fullName: customer.full_name,
      email: customer.email,
      link: customer.onboard_token ? `/onboard?token=${encodeURIComponent(customer.onboard_token)}` : null,
      sentAt: customer.onboard_sent_at,
    })),
  });
}
