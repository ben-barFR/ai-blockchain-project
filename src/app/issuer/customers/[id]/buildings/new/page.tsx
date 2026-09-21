import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BuildingCreateForm } from "@/components/issuers/building-create-form";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function NewCustomerBuildingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    buildingId?: string;
    postalAddress?: string;
    countryCode?: string;
    next?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/issuer");

  const { data: issuer } = await supabase
    .from("issuers")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!issuer || issuer.status !== "approved") redirect("/issuer/customers");

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("issuer_customers")
    .select("id, full_name, email")
    .eq("id", id)
    .eq("issuer_id", issuer.id)
    .maybeSingle();
  if (!customer) notFound();

  const name = customer.full_name || customer.email || "Customer";
  const nextHref = query.next && query.next.startsWith("/") ? query.next : undefined;

  return (
    <IssuerShell email={user.email}>
      <p className="text-sm text-[var(--muted)]">
        <Link href="/issuer/customers" className="hover:text-[var(--foreground)]">
          My customers
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/issuer/customers/${customer.id}`} className="hover:text-[var(--foreground)]">
          {name}
        </Link>
        <span className="mx-2">/</span>
        <span>New building</span>
      </p>
      <div className="mt-3">
        <Link
          href={nextHref || `/issuer/customers/${customer.id}`}
          className="text-sm text-[var(--accent-hover)] hover:underline"
        >
          {nextHref ? "← Back to issue" : `← Back to ${name}`}
        </Link>
      </div>
      <h1 className="mt-3 text-3xl font-semibold">Add a building</h1>
      <p className="mt-2 text-[var(--muted)]">
        ID and address are fixed after you save, so later certificates stay aligned with this record.
      </p>
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <BuildingCreateForm
          customerId={customer.id}
          initialIdentifier={query.buildingId || ""}
          initialAddress={query.postalAddress || ""}
          initialCountry={query.countryCode || "FR"}
          nextHref={nextHref}
        />
      </div>
    </IssuerShell>
  );
}
