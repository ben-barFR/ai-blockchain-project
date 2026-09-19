import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentIssuer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, issuer: null, supabase };

  const { data: issuer } = await supabase
    .from("issuers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, issuer, supabase };
}

export async function requireApprovedIssuer() {
  const result = await getCurrentIssuer();
  if (!result.user) {
    return { ...result, error: "Unauthorized" as const, status: 401 as const };
  }
  if (!result.issuer || result.issuer.status !== "approved") {
    return { ...result, error: "Issuer is not approved yet" as const, status: 403 as const };
  }
  return { ...result, error: null, status: 200 as const, admin: createAdminClient() };
}
