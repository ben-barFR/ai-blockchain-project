import { COMPONENT_LABELS, type ComponentKind } from "@/lib/certificates/constants";

export function CertificatePdfLinks({
  components,
  tokenId,
  issuanceId,
}: {
  components: ComponentKind[];
  tokenId?: string | null;
  issuanceId?: string | null;
}) {
  if (components.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No PDF is stored for this certificate yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {components.map((component) => {
        const params = new URLSearchParams({ component });
        if (issuanceId) params.set("issuanceId", issuanceId);
        if (tokenId) params.set("tokenId", tokenId);
        return (
          <li key={component}>
            <a
              href={`/api/certificates/reports/file?${params.toString()}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--accent-hover)] hover:underline"
            >
              Open {COMPONENT_LABELS[component]} PDF
            </a>
          </li>
        );
      })}
    </ul>
  );
}
