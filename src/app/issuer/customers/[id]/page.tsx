import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerDetailsForm } from "@/components/issuers/customer-details-form";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { explorerAddressUrl } from "@/lib/ethereum/explorer";
import { issuerBuildingTitle, type CustomerBuildingWithCerts } from "@/lib/issuers/buildings";
import { requireIssuerSession } from "@/lib/issuers/current-issuer";
import { createAdminClient } from "@/lib/supabase/admin";

function BuildingCard({
  customerId,
  building,
}: {
  customerId: string;
  building: CustomerBuildingWithCerts;
}) {
  const certCount = building.certificate_issuances?.length || 0;
  const href = `/issuer/customers/${customerId}/buildings/${building.id}`;
  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            <Link href={href} className="hover:underline">
              {issuerBuildingTitle(building)}
            </Link>
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Building ID: {building.building_identifier || "—"}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-[var(--muted)]">
            {building.postal_address || "—"}
            {building.country_code ? ` (${building.country_code})` : ""}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {certCount} {certCount === 1 ? "certificate" : "certificates"}
          </p>
        </div>
        <Link
          href={href}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)]"
        >
          View building
        </Link>
      </div>
    </li>
  );
}

export default async function IssuerCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, issuer } = await requireIssuerSession({
    approved: true,
    unauthenticatedHref: "/issuer",
    unapprovedHref: "/issuer/customers",
  });
  if (!issuer) redirect("/issuer/customers");

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("issuer_customers")
    .select("id, full_name, email, wallet_address")
    .eq("id", id)
    .eq("issuer_id", issuer.id)
    .maybeSingle();
  if (!customer) notFound();

  const { data: buildings } = await admin
    .from("customer_buildings")
    .select(
      "id, issuer_id, customer_id, building_identifier, postal_address, country_code, archived_at, created_at, certificate_issuances!customer_building_id(id, token_id)",
    )
    .eq("issuer_id", issuer.id)
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  const active = (buildings || []).filter((building) => !building.archived_at);
  const archived = (buildings || []).filter((building) => building.archived_at);
  const name = customer.full_name || customer.email || "Customer";
  const walletExplorer = customer.wallet_address ? explorerAddressUrl(customer.wallet_address) : null;

  return (
    <IssuerShell email={user.email}>
      <p className="text-sm text-[var(--muted)]">
        <Link href="/issuer/customers" className="hover:text-[var(--foreground)]">
          My customers
        </Link>
        <span className="mx-2">/</span>
        <span>{name}</span>
      </p>
      <div className="mt-3">
        <Link href="/issuer/customers" className="text-sm text-[var(--accent-hover)] hover:underline">
          ← Back to My customers
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{name}</h1>
          {customer.email ? <p className="mt-2 text-[var(--muted)]">{customer.email}</p> : null}
          <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">
            {walletExplorer ? (
              <a
                href={walletExplorer}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-hover)] hover:underline"
              >
                {customer.wallet_address}
              </a>
            ) : (
              customer.wallet_address || "No destination wallet yet"
            )}
          </p>
        </div>
        <Link
          href={`/issuer/customers/${customer.id}/buildings/new`}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Add building
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-medium">Buildings</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Each building keeps a fixed ID and address. Certificates are issued on a building, not
          directly on the customer.
        </p>
        {active.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--muted)]">No active buildings yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {active.map((building) => (
              <BuildingCard key={building.id} customerId={customer.id} building={building} />
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 ? (
        <details className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <summary className="cursor-pointer text-lg font-medium">
            Archive ({archived.length})
          </summary>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Archived buildings keep their certificates, but they are not used for new issuances.
          </p>
          <ul className="mt-4 space-y-3">
            {archived.map((building) => (
              <BuildingCard key={building.id} customerId={customer.id} building={building} />
            ))}
          </ul>
        </details>
      ) : null}

      <CustomerDetailsForm
        customerId={customer.id}
        initialName={customer.full_name || ""}
        initialEmail={customer.email || ""}
      />
    </IssuerShell>
  );
}
