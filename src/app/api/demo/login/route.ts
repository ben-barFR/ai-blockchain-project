import { NextResponse } from "next/server";
import { portalForUserType } from "@/lib/auth/portal";
import { createAdminClient, isAdminUser } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { userId?: string };
  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(
    body.userId,
  );
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });
  if (linkError || !link.properties?.hashed_token) {
    return NextResponse.json(
      { error: linkError?.message || "Could not create a demo session" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const { error: otpError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.properties.hashed_token,
  });
  if (otpError) {
    return NextResponse.json({ error: otpError.message }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("user_type")
    .eq("id", userData.user.id)
    .maybeSingle();

  const portal = isAdminUser(userData.user.email, profile?.user_type)
    ? "/admin"
    : portalForUserType(profile?.user_type);

  return NextResponse.json({ ok: true, portal });
}
