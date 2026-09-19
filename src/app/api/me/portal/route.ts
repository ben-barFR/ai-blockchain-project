import { NextResponse } from "next/server";
import { portalForUserType } from "@/lib/auth/portal";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  const portal = isAdminUser(user.email, profile?.user_type)
    ? "/admin"
    : portalForUserType(profile?.user_type);

  return NextResponse.json({ portal, userType: profile?.user_type || "owner" });
}
