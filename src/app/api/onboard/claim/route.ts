import { NextResponse } from "next/server";
import { ensureProfileWallet } from "@/lib/ethereum/profile-wallet";
import { attachOwnerWalletToCustomers } from "@/lib/issuers/customers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in or register first" }, { status: 401 });
  }

  const body = (await request.json()) as { token?: string };
  const token = (body.token || "").trim();
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email, user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.user_type === "issuer" || profile?.user_type === "admin") {
    return NextResponse.json(
      { error: "Use a building-owner account to receive this certificate" },
      { status: 403 },
    );
  }

  const wallet = await ensureProfileWallet(supabase, user.id);
  const attached = await attachOwnerWalletToCustomers(admin, {
    userId: user.id,
    email: user.email || profile?.email,
    walletAddress: wallet.address,
    token,
  });

  if (!attached) {
    return NextResponse.json({ error: "This onboarding link is invalid or expired" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    walletAddress: wallet.address,
  });
}
