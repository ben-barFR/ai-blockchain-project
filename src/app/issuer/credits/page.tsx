import { redirect } from "next/navigation";
import { DemoCreditCardForm } from "@/components/issuers/demo-credit-card-form";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { CREDIT_PACK_PRICE_EUR, CREDIT_PACK_SIZE } from "@/lib/issuers/credits";
import { createClient } from "@/lib/supabase/server";

export default async function IssuerCreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/issuer");

  const { data: issuer } = await supabase
    .from("issuers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!issuer) redirect("/issuer/company");

  return (
    <IssuerShell email={user.email}>
      <h1 className="text-3xl font-semibold">Add issuance credits</h1>
      <p className="mt-2 text-[var(--muted)]">
        Buy a pack of {CREDIT_PACK_SIZE} credits for {CREDIT_PACK_PRICE_EUR.toLocaleString("en-GB")}€.
      </p>
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <DemoCreditCardForm />
      </div>
    </IssuerShell>
  );
}
