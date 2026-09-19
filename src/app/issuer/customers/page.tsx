import { redirect } from "next/navigation";
import { CustomerList } from "@/components/issuers/customer-list";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { createClient } from "@/lib/supabase/server";

export default async function IssuerCustomersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/issuer");

  const { data: issuer } = await supabase
    .from("issuers")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <IssuerShell email={user.email}>
      <h1 className="text-3xl font-semibold">My customers</h1>
      <p className="mt-2 text-[var(--muted)]">
        People you send certificates to. Each record keeps the destination wallet.
      </p>
      {issuer?.status !== "approved" ? (
        <p className="mt-8 text-sm text-amber-300">
          Company registration must be approved before you can add customers.
        </p>
      ) : (
        <div className="mt-8">
          <CustomerList />
        </div>
      )}
    </IssuerShell>
  );
}
