import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CertificatePdfLinks } from "@/components/certificates/certificate-pdf-links";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { COMPONENT_KINDS, COMPONENT_LABELS, type ComponentKind } from "@/lib/certificates/constants";
import { explorerTxUrl } from "@/lib/ethereum/explorer";
import { issuerBuildingTitle, issuanceTypeLabels } from "@/lib/issuers/buildings";
import { requireIssuerSession } from "@/lib/issuers/current-issuer";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function BuildingCertificatePage({
  params,
}: {
  params: Promise<{ id: string; buildingId: string; issuanceId: string }>;
}) {
  const { id, buildingId, issuanceId } = await params;
  const { user, issuer } = await requireIssuerSession({
    approved: true,
    unauthenticatedHref: "/issuer",
    unapprovedHref: "/issuer/customers",
  });
  if (!issuer) redirect("/issuer/customers");

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("issuer_customers")
    .select("id, full_name, email")
    .eq("id", id)
    .eq("issuer_id", issuer.id)
    .maybeSingle();
  if (!customer) notFound();

  const { data: building } = await admin
    .from("customer_buildings")
    .select("id, building_identifier, postal_address, country_code")
    .eq("id", buildingId)
    .eq("customer_id", customer.id)
    .eq("issuer_id", issuer.id)
    .maybeSingle();
  if (!building) notFound();

  const { data: issuance } = await admin
    .from("certificate_issuances")
    .select(
      "id, token_id, tx_hash, status, created_at, has_electrical, has_energy, has_planning, building_id, postal_address, country_code",
    )
    .eq("id", issuanceId)
    .eq("customer_building_id", building.id)
    .maybeSingle();
  if (!issuance) notFound();

  const { data: reports } = await admin
    .from("certificate_reports")
    .select("component")
    .eq("issuance_id", issuance.id);
  const storedComponents = (reports || [])
    .map((row) => row.component as ComponentKind)
    .filter((kind) => COMPONENT_KINDS.includes(kind));

  const name = customer.full_name || customer.email || "Customer";
  const title = issuerBuildingTitle(building);
  const types = issuanceTypeLabels(issuance);
  const txUrl = issuance.tx_hash ? explorerTxUrl(issuance.tx_hash) : null;
  const buildingHref = `/issuer/customers/${customer.id}/buildings/${building.id}`;
  const certificateLabel = issuance.token_id ? `Certificate #${issuance.token_id}` : "Certificate";

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
        <Link href={buildingHref} className="hover:text-[var(--foreground)]">
          {title}
        </Link>
        <span className="mx-2">/</span>
        <span>{certificateLabel}</span>
      </p>
      <div className="mt-3">
        <Link href={buildingHref} className="text-sm text-[var(--accent-hover)] hover:underline">
          ← Back to {title}
        </Link>
      </div>
      <h1 className="mt-3 text-3xl font-semibold">{certificateLabel}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {issuance.status}
        {issuance.created_at ? ` · ${new Date(issuance.created_at).toLocaleString()}` : ""}
      </p>

      <dl className="mt-8 grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Building ID</dt>
          <dd>{issuance.building_id || building.building_identifier || "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Building address</dt>
          <dd className="whitespace-pre-line">
            {issuance.postal_address || building.postal_address || "—"}
            {(issuance.country_code || building.country_code)
              ? ` (${issuance.country_code || building.country_code})`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Certificate types</dt>
          <dd>
            {types.length > 0
              ? types.map((kind) => COMPONENT_LABELS[kind]).join(" · ")
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Stored PDF</dt>
          <dd className="mt-1">
            <CertificatePdfLinks
              components={storedComponents}
              tokenId={issuance.token_id}
              issuanceId={issuance.id}
            />
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Transaction ID</dt>
          <dd className="break-all font-mono text-xs">
            {issuance.tx_hash ? (
              txUrl ? (
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent-hover)] hover:underline"
                >
                  {issuance.tx_hash}
                </a>
              ) : (
                issuance.tx_hash
              )
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      {issuance.token_id ? (
        <p className="mt-6 text-sm">
          <Link
            href={`/registry/${issuance.token_id}`}
            className="text-[var(--accent-hover)] hover:underline"
          >
            Open in public registry
          </Link>
        </p>
      ) : null}
    </IssuerShell>
  );
}
