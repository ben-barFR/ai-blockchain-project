import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/signup-form";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function IssuerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-md px-6 py-10">
          <h1 className="text-3xl font-semibold">Issuer portal</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Create an issuer account. We generate an Ethereum wallet for you; see
            or replace it later on the account page.
          </p>
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-medium">Register</h2>
            <SignUpForm
              userType="issuer"
              redirectTo="/issuer/company"
              loginHref="/login?next=/issuer/company"
            />
          </div>
        </main>
      </>
    );
  }

  const { data: issuer } = await supabase
    .from("issuers")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  redirect(issuer?.status === "approved" ? "/issuer/customers" : "/issuer/company");
}
