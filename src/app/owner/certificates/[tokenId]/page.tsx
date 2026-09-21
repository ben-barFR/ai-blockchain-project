import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckAuthenticityButton } from "@/components/certificates/check-authenticity-button";
import { CertificatePdfLinks } from "@/components/certificates/certificate-pdf-links";
import { OwnerShell } from "@/components/layout/owner-shell";
import { COMPONENT_KINDS, COMPONENT_LABELS, type ComponentKind } from "@/lib/certificates/constants";
import { formatTimestamp } from "@/lib/certificates/format";
import { explorerTxUrl } from "@/lib/ethereum/explorer";
import { readCertificate } from "@/lib/ethereum/certificates";
import { isContractConfigured } from "@/lib/ethereum/client";
import { ensureProfileWallet } from "@/lib/ethereum/profile-wallet";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerCertificateDetailPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/owner");

  if (!isContractConfigured() || !/^\d+$/.test(tokenId)) notFound();

  const wallet = await ensureProfileWallet(supabase, user.id);
  let certificate;
  try {
    certificate = await readCertificate(BigInt(tokenId));
  } catch {
    notFound();
  }
  if (certificate.holder.toLowerCase() !== wallet.address.toLowerCase()) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: reports } = await admin
    .from("certificate_reports")
    .select("component")
    .eq("token_id", tokenId);
  const storedComponents = (reports || [])
    .map((row) => row.component as ComponentKind)
    .filter((kind) => COMPONENT_KINDS.includes(kind));

  const { data: issuances } = await admin
    .from("certificate_issuances")
    .select("id, tx_hash")
    .eq("token_id", tokenId)
    .order("created_at", { ascending: false })
    .limit(1);
  const issuance = issuances?.[0] || null;
  const txUrl = issuance?.tx_hash ? explorerTxUrl(issuance.tx_hash) : null;

  return (
    <OwnerShell email={user.email}>
      <p className="text-sm text-[var(--muted)]">
        <Link href="/owner/certificates" className="hover:text-[var(--foreground)]">
          My certificates
        </Link>
        <span className="mx-2">/</span>
        <span>Certificate #{tokenId}</span>
      </p>
      <div className="mt-3">
        <Link href="/owner/certificates" className="text-sm text-[var(--accent-hover)] hover:underline">
          ← Back to my certificates
        </Link>
      </div>
      <h1 className="mt-3 text-3xl font-semibold">Certificate #{tokenId}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {certificate.buildingId || "No building ID"}
        {certificate.countryCode ? ` · ${certificate.countryCode}` : ""}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm">{certificate.postalAddress || "—"}</p>

      <dl className="mt-8 grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Certificate types</dt>
          <dd>
            {certificate.components
              .filter((component) => component.present)
              .map((component) => COMPONENT_LABELS[component.kind])
              .join(" · ") || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Issued</dt>
          <dd>{formatTimestamp(certificate.mintedAt, "—")}</dd>
        </div>
        {issuance?.tx_hash ? (
          <div>
            <dt className="text-[var(--muted)]">Transaction ID</dt>
            <dd className="break-all font-mono text-xs">
              {txUrl ? (
                <a href={txUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-hover)] hover:underline">
                  {issuance.tx_hash}
                </a>
              ) : (
                issuance.tx_hash
              )}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[var(--muted)]">Stored PDF</dt>
          <dd className="mt-1">
            <CertificatePdfLinks
              components={storedComponents}
              tokenId={tokenId}
              issuanceId={issuance?.id}
            />
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <CheckAuthenticityButton certificate={certificate} />
      </div>

      <p className="mt-6 text-sm">
        <Link href={`/registry/${tokenId}`} className="text-[var(--accent-hover)] hover:underline">
          Open in public registry
        </Link>
      </p>
    </OwnerShell>
  );
}
