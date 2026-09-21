"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CertificateCard } from "@/components/certificates/certificate-card";
import { CheckAuthenticityButton } from "@/components/certificates/check-authenticity-button";
import { useOwnedCertificates } from "@/components/certificates/use-owned-certificates";
import { buildingKey, buildingTitle } from "@/lib/certificates/buildings";

export function OwnerCertificateList({ walletAddress }: { walletAddress: string }) {
  const searchParams = useSearchParams();
  const buildingFilter = searchParams.get("building");
  const { certificates, error, loading } = useOwnedCertificates(walletAddress);

  const visible = useMemo(() => {
    if (!buildingFilter) return certificates;
    return certificates.filter((certificate) => buildingKey(certificate) === buildingFilter);
  }, [buildingFilter, certificates]);

  const filterTitle = visible[0]
    ? buildingTitle(visible[0])
    : null;

  return (
    <div className="space-y-4">
      {buildingFilter && filterTitle ? (
        <p className="text-sm text-[var(--muted)]">Certificates for {filterTitle}</p>
      ) : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Reading the chain…</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {buildingFilter
            ? "No certificates for this building."
            : "This wallet does not hold any building certificates."}
        </p>
      ) : null}
      {visible.map((certificate) => (
        <CertificateCard
          key={certificate.tokenId}
          certificate={certificate}
          detailHref={`/owner/certificates/${certificate.tokenId}`}
          actions={
            <div className="flex flex-wrap items-start gap-2">
              <Link
                href={`/owner/certificates/${certificate.tokenId}`}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)]"
              >
                View PDF document associated with this certificate
              </Link>
              <CheckAuthenticityButton certificate={certificate} />
            </div>
          }
        />
      ))}
    </div>
  );
}
