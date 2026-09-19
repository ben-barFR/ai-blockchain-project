"use client";

import { useState } from "react";
import type { ComponentKind } from "@/lib/certificates/constants";

export function ReportAccessButton({
  tokenId,
  component,
  issuerWebsite,
}: {
  tokenId: string;
  component: ComponentKind;
  issuerWebsite?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function openReport() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/certificates/reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, component }),
      });
      const payload = (await response.json()) as {
        stored?: boolean;
        url?: string;
        error?: string;
        issuerWebsite?: string | null;
      };
      if (response.status === 404 || payload.stored === false) {
        const website = payload.issuerWebsite || issuerWebsite;
        if (website) {
          window.open(website, "_blank", "noreferrer");
          return;
        }
        setError("No report is stored on this platform. Ask the issuer for the PDF.");
        return;
      }
      if (!response.ok || !payload.url) {
        setError(payload.error || "Could not open report");
        return;
      }
      window.open(payload.url, "_blank", "noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openReport}
        disabled={loading}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)] disabled:opacity-60"
      >
        {loading ? "Opening…" : `Open ${component} report`}
      </button>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
