"use client";

import Link from "next/link";
import { useOwnedCertificates } from "@/components/certificates/use-owned-certificates";
import { onChainBuildingTitle, groupCertificatesByBuilding } from "@/lib/certificates/buildings";

export function OwnerBuildingList({ walletAddress }: { walletAddress: string }) {
  const { certificates, error, loading } = useOwnedCertificates(walletAddress);
  const buildings = groupCertificatesByBuilding(certificates);

  return (
    <div className="space-y-4">
      {loading ? <p className="text-sm text-[var(--muted)]">Reading the chain…</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {!loading && buildings.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No buildings yet. Certificates sent to your wallet will appear here.
        </p>
      ) : null}
      {buildings.map((building) => (
        <article
          key={building.key}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
        >
          <h2 className="text-xl font-semibold">{onChainBuildingTitle(building)}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {[building.countryCode, building.buildingId].filter(Boolean).join(" · ") || "No cadastral id"}
          </p>
          <p className="mt-3 text-sm">
            {building.certificates.length}{" "}
            {building.certificates.length === 1 ? "certificate" : "certificates"}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
            {building.certificates.map((certificate) => (
              <li key={certificate.tokenId}>
                <Link
                  href={`/owner/certificates/${certificate.tokenId}`}
                  className="hover:text-[var(--foreground)] hover:underline"
                >
                  Certificate #{certificate.tokenId}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/owner/certificates?building=${encodeURIComponent(building.key)}`}
            className="mt-4 inline-block text-sm text-[var(--accent-hover)] hover:underline"
          >
            View certificates
          </Link>
        </article>
      ))}
    </div>
  );
}
