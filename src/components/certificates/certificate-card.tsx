import type { ReactNode } from "react";
import Link from "next/link";
import { COMPONENT_LABELS } from "@/lib/certificates/constants";
import { formatTimestamp, shortAddress, zeroHash } from "@/lib/certificates/format";
import type { OnChainCertificate } from "@/lib/ethereum/certificates";

export function CertificateCard({
  certificate,
  revealHolder = true,
  actions,
}: {
  certificate: OnChainCertificate;
  revealHolder?: boolean;
  actions?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">Token #{certificate.tokenId}</p>
          <h2 className="text-xl font-semibold">
            {certificate.buildingId || "No cadastral id"}
          </h2>
          <p className="mt-1 text-sm">{certificate.postalAddress}</p>
          <p className="text-sm text-[var(--muted)]">{certificate.countryCode}</p>
        </div>
        <Link
          href={`/registry/${certificate.tokenId}`}
          className="text-sm text-[var(--accent-hover)] hover:underline"
        >
          Public record
        </Link>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--muted)]">Issuer identifier</dt>
          <dd>{certificate.issuerIdentifier || "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Issuer wallet</dt>
          <dd className="font-mono">{shortAddress(certificate.issuer)}</dd>
        </div>
        {certificate.issuerRegistryUrl ? (
          <div className="sm:col-span-2">
            <dt className="text-[var(--muted)]">Official business record</dt>
            <dd>
              <a
                href={certificate.issuerRegistryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-hover)] hover:underline"
              >
                {certificate.issuerRegistryUrl}
              </a>
            </dd>
          </div>
        ) : null}
        {revealHolder ? (
          <div>
            <dt className="text-[var(--muted)]">Current holder wallet</dt>
            <dd className="font-mono">{shortAddress(certificate.holder)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[var(--muted)]">Minted</dt>
          <dd>{formatTimestamp(certificate.mintedAt, "—")}</dd>
        </div>
      </dl>

      <ul className="mt-5 space-y-3">
        {certificate.components
          .filter((component) => component.present)
          .map((component) => (
            <li
              key={component.kind}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{COMPONENT_LABELS[component.kind]}</p>
                <span
                  className={
                    component.valid
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                >
                  {component.valid ? "Valid" : "Invalid"}
                </span>
              </div>
              <p className="mt-1 text-[var(--muted)]">
                Issued {formatTimestamp(component.issuedAt, "—")} · Expires{" "}
                {component.expiresAt ? formatTimestamp(component.expiresAt) : "Indefinite"}
                {component.invalidated ? " · Invalidated" : ""}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-[var(--muted)]">
                Report hash: {zeroHash(component.reportHash) ? "Not on token" : component.reportHash}
              </p>
            </li>
          ))}
      </ul>

      {actions ? <div className="mt-5">{actions}</div> : null}
    </article>
  );
}
