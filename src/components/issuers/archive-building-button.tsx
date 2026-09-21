"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ArchiveBuildingButton({
  customerId,
  buildingId,
}: {
  customerId: string;
  buildingId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function archive() {
    setError(null);
    setLoading(true);
    const response = await fetch(`/api/issuer/customers/${customerId}/buildings/${buildingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    const payload = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || "Could not archive building");
      return;
    }
    router.push(`/issuer/customers/${customerId}`);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void archive()}
        disabled={loading}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)] disabled:opacity-60"
      >
        {loading ? "Archiving…" : "Archive building"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
