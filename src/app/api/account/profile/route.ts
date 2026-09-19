import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    fullName?: string;
    email?: string;
    password?: string;
  };

  const fullName = (body.fullName || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();

  if (!fullName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!email || !email.includes("@") || !email.split("@")[1]?.includes(".")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const currentEmail = (user.email || "").trim().toLowerCase();
  const emailChanged = email !== currentEmail;
  const admin = createAdminClient();

  // Admin update avoids GoTrue rejecting the request when the stored email is already invalid
  // (for example a typo like gmail.coml) and applies the new address immediately.
  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    ...(emailChanged ? { email, email_confirm: true } : {}),
    ...(password ? { password } : {}),
    user_metadata: {
      ...(user.user_metadata ?? {}),
      full_name: fullName,
    },
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, email })
    .eq("id", user.id);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  await admin.from("issuer_customers").update({ email, full_name: fullName }).eq("user_id", user.id);

  return NextResponse.json({
    ok: true,
    fullName,
    email,
    emailConfirmationRequired: false,
  });
}
