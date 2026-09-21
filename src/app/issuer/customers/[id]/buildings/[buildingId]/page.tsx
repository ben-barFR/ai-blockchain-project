import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArchiveBuildingButton } from "@/components/issuers/archive-building-button";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { COMPONENT_LABELS } from "@/lib/certificates/constants";
import { explorerTxUrl } from "@/lib/ethereum/explorer";
import { buildingTitle, issuanceTypeLabels } from "@/lib/issuers/buildings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerBuildingPage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string }>;
}) {
  const { id, buildingId } = await params;
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
    .select("id, full_name, email, wallet_address")
    .eq("id", id)
    .eq("issuer_id", issuer.id)
    .maybeSingle();
  if (!customer) notFound();

  const { data: building } = await admin
    .from("customer_buildings")
    .select(
      "id, building_identifier, postal_address, country_code, archived_at, created_at",
    )
    .eq("id", buildingId)
    .eq("customer_id", customer.id)
    .eq("issuer_id", issuer.id)
    .maybeSingle();
  if (!building) notFound();

  const { data: issuances } = await admin
    .from("certificate_issuances")
    .select(
      "id, token_id, tx_hash, status, created_at, has_electrical, has_energy, has_planning",
    )
    .eq("customer_building_id", building.id)
    .order("created_at", { ascending: false });

  const name = customer.full_name || customer.email || "Customer";
  const title = buildingTitle(building);

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
        <span>{title}</span>
      </p>
      <div className="mt-3">
        <Link
          href={`/issuer/customers/${customer.id}`}
          className="text-sm text-[var(--accent-hover)] hover:underline"
        >
          ← Back to {name}
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          {building.archived_at ? (
            <p className="mt-2 text-sm text-amber-300">Archived</p>
          ) : null}
          <p className="mt-2 text-sm text-[var(--muted)]">Building ID</p>
          <p>{building.building_identifier || "—"}</p>
          <p className="mt-3 text-sm text-[var(--muted)]">Address</p>
          <p className="whitespace-pre-line">
            {building.postal_address || "—"}
            {building.country_code ? ` (${building.country_code})` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!building.archived_at && customer.wallet_address ? (
            <Link
              href={`/issuer/issue?customer=${customer.id}&building=${building.id}`}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Issue certificate
            </Link>
          ) : null}
          {!building.archived_at ? (
            <ArchiveBuildingButton customerId={customer.id} buildingId={building.id} />
          ) : null}
        </div>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        ID and address cannot be edited. Archive this building if it should no longer be used for new
        certificates.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-medium">Certificates</h2>
        {(issuances || []).length === 0 ? (
          <p className="mt-6 text-sm text-[var(--muted)]">No certificates on this building yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {(issuances || []).map((issuance) => {
              const types = issuanceTypeLabels(issuance)
                .map((kind) => COMPONENT_LABELS[kind])
                .join(" · ");
              const txUrl = issuance.tx_hash ? explorerTxUrl(issuance.tx_hash) : null;
              return (
                <li
                  key={issuance.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium">
                      <Link
                        href={`/issuer/customers/${customer.id}/buildings/${building.id}/certificates/${issuance.id}`}
                        className="hover:underline"
                      >
                        {issuance.token_id ? `Certificate #${issuance.token_id}` : "Certificate pending"}
                      </Link>
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {issuance.status}
                      {issuance.created_at
                        ? ` · ${new Date(issuance.created_at).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{types || "No types recorded"}</p>
                  {issuance.tx_hash ? (
                    <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">
                      {txUrl ? (
                        <a href={txUrl} target="_blank" rel="noreferrer" className="hover:underline">
                          {issuance.tx_hash}
                        </a>
                      ) : (
                        issuance.tx_hash
                      )}
                    </p>
                  ) : null}
                  <Link
                    href={`/issuer/customers/${customer.id}/buildings/${building.id}/certificates/${issuance.id}`}
                    className="mt-3 inline-block text-sm text-[var(--accent-hover)] hover:underline"
                  >
                    View certificate
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </IssuerShell>
  );
}
