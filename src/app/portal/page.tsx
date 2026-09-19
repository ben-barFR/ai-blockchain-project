import { redirect } from "next/navigation";
import { portalForUserType } from "@/lib/auth/portal";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/supabase/admin";

export default async function PortalRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (isAdminUser(user.email, profile?.user_type)) {
    redirect("/admin");
  }
  redirect(portalForUserType(profile?.user_type));
}
