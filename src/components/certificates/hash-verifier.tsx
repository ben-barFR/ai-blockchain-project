"use client";

import { FormEvent, useState } from "react";
import { COMPONENT_KINDS, COMPONENT_LABELS, type ComponentKind } from "@/lib/certificates/constants";
import { hashFile } from "@/lib/certificates/hash";

export function HashVerifier() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    const form = new FormData(event.currentTarget);
    const tokenId = String(form.get("tokenId") || "");
    const component = String(form.get("component") || "") as ComponentKind;
    const file = form.get("file");
    if (!(file instanceof File) || !tokenId) {
      setError("Token id and PDF are required");
      return;
    }
    setLoading(true);
    const reportHash = await hashFile(file);
    const response = await fetch("/api/certificates/verify-hash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId, component, reportHash }),
    });
    const payload = (await response.json()) as {
      matches?: boolean;
      error?: string;
      certificate?: { postalAddress?: string; buildingId?: string };
    };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || "Verification failed");
      return;
    }
    if (payload.matches) {
      setResult(
        `This PDF matches token #${tokenId} (${COMPONENT_LABELS[component]}) for ${payload.certificate?.buildingId || "the building"} at ${payload.certificate?.postalAddress || "the on-chain address"}.`,
      );
    } else {
      setResult("This PDF does not match the hash stored on that certificate token.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-lg font-semibold">Verify a full report</h2>
      <p className="text-sm text-[var(--muted)]">
        If someone sent you a PDF, check that its hash is the one stored on a given token.
      </p>
      <input
        name="tokenId"
        required
        placeholder="Token id"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
      />
      <select
        name="component"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
      >
        {COMPONENT_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {COMPONENT_LABELS[kind]}
          </option>
        ))}
      </select>
      <input name="file" type="file" accept="application/pdf" required className="w-full text-sm" />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {loading ? "Checking…" : "Check hash"}
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {result ? <p className="text-sm text-emerald-300">{result}</p> : null}
    </form>
  );
}
