"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function BuildingCreateForm({
  customerId,
  initialIdentifier = "",
  initialAddress = "",
  initialCountry = "FR",
  nextHref,
}: {
  customerId: string;
  initialIdentifier?: string;
  initialAddress?: string;
  initialCountry?: string;
  nextHref?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch(`/api/issuer/customers/${customerId}/buildings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingIdentifier: String(data.get("buildingIdentifier") || ""),
        postalAddress: String(data.get("postalAddress") || ""),
        countryCode: String(data.get("countryCode") || ""),
      }),
    });
    const payload = (await response.json()) as { building?: { id: string }; error?: string };
    setLoading(false);
    if (!response.ok || !payload.building) {
      setError(payload.error || "Could not add building");
      return;
    }

    if (nextHref) {
      const url = new URL(nextHref, window.location.origin);
      url.searchParams.set("customer", customerId);
      url.searchParams.set("building", payload.building.id);
      router.push(`${url.pathname}${url.search}`);
      router.refresh();
      return;
    }

    router.push(`/issuer/customers/${customerId}/buildings/${payload.building.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm">
        Country
        <input
          name="countryCode"
          required
          defaultValue={initialCountry}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Building identifier (cadastre / state record)
        <input
          name="buildingIdentifier"
          defaultValue={initialIdentifier}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Postal address
        <textarea
          name="postalAddress"
          required
          rows={3}
          defaultValue={initialAddress}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        />
      </label>
      <p className="text-xs text-[var(--muted)]">
        Building ID and address cannot be edited later, so certificates always match this record.
      </p>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {loading ? "Saving…" : "Add building"}
      </button>
    </form>
  );
}
