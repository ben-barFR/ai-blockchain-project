"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  COMPONENT_EXPIRY,
  COMPONENT_KINDS,
  type ComponentKind,
} from "@/lib/certificates/constants";
import { hashFile } from "@/lib/certificates/hash";
import type { CustomerRecord } from "@/components/issuers/customer-form";

export function IssueCertificateForm({
  contractAddress,
  issuanceCredits,
}: {
  contractAddress: `0x${string}` | null;
  issuanceCredits: number;
}) {
  const searchParams = useSearchParams();
  const presetCustomer = searchParams.get("customer") || "";
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customerId, setCustomerId] = useState(presetCustomer);
  const [files, setFiles] = useState<Partial<Record<ComponentKind, File>>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [credits, setCredits] = useState(issuanceCredits);
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<{ mailto: string; link: string } | null>(null);

  useEffect(() => {
    fetch("/api/issuer/customers")
      .then(async (response) => {
        const payload = (await response.json()) as { customers?: CustomerRecord[] };
        setCustomers(payload.customers || []);
      })
      .catch(() => setCustomers([]));
  }, []);

  const selectedCustomer = customers.find((customer) => customer.id === customerId) || null;
  const canIssue = Boolean(selectedCustomer?.wallet_address);

  async function sendOnboard() {
    if (!selectedCustomer) return;
    setError(null);
    const response = await fetch(`/api/issuer/customers/${selectedCustomer.id}/invite`, {
      method: "POST",
    });
    const payload = (await response.json()) as { mailto?: string; link?: string; error?: string };
    if (!response.ok || !payload.mailto || !payload.link) {
      setError(payload.error || "Could not prepare the onboarding email");
      return;
    }
    setInvite({ mailto: payload.mailto, link: payload.link });
    window.location.href = payload.mailto;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canIssue) {
      setError("This customer needs a destination wallet first.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const selected = COMPONENT_KINDS.filter((kind) => form.get(kind) === "on");
    const hashes: Partial<Record<ComponentKind, string>> = {};
    for (const kind of selected) {
      const file = files[kind];
      if (file) hashes[kind] = await hashFile(file);
    }

    const response = await fetch("/api/certificates/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        buildingId: String(form.get("buildingId") || ""),
        countryCode: String(form.get("countryCode") || ""),
        postalAddress: String(form.get("postalAddress") || ""),
        components: selected,
        hashes,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      tokenId?: string;
      txHash?: string;
      issuanceId?: string;
      issuanceCredits?: number;
      customerWallet?: string;
    };
    if (!response.ok) {
      setLoading(false);
      setError(payload.error || "Issuance failed");
      return;
    }

    if (typeof payload.issuanceCredits === "number") {
      setCredits(payload.issuanceCredits);
    }

    if (payload.issuanceId && payload.tokenId) {
      for (const kind of selected) {
        const file = files[kind];
        if (!file || !hashes[kind]) continue;
        const upload = new FormData();
        upload.set("tokenId", payload.tokenId);
        upload.set("issuanceId", payload.issuanceId);
        upload.set("component", kind);
        upload.set("contentHash", hashes[kind]!);
        upload.set("file", file);
        const stored = await fetch("/api/certificates/reports", {
          method: "POST",
          body: upload,
        });
        if (!stored.ok) {
          const storedResult = (await stored.json()) as { error?: string };
          setError(
            `Token minted, but storing the ${kind} PDF failed: ${storedResult.error || "unknown error"}`,
          );
        }
      }
    }

    setLoading(false);
    setResult(
      `Minted token #${payload.tokenId || "?"} to ${payload.customerWallet || "the owner"} in tx ${payload.txHash}`,
    );
  }

  if (!contractAddress) {
    return (
      <p className="text-sm text-[var(--muted)]">
        The certificate contract is not configured yet. Add{" "}
        <code>NEXT_PUBLIC_CERTIFICATE_CONTRACT</code> after deploying.
      </p>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm">
        <p>
          Issuance credits: <span className="font-medium">{credits}</span>
        </p>
        <p className="mt-2 text-[var(--muted)]">
          Fees are billed in fiat. One credit covers minting and delivery to the
          owner. The platform wallet pays the gas.
        </p>
      </div>

      <label className="block text-sm">
        Customer
        <select
          required
          value={customerId}
          onChange={(event) => {
            setCustomerId(event.target.value);
            setInvite(null);
            setError(null);
          }}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        >
          <option value="">Select a customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.full_name || customer.email || "Unnamed"}{" "}
              {customer.wallet_address ? "" : "(no wallet)"}
            </option>
          ))}
        </select>
      </label>

      {selectedCustomer && !canIssue ? (
        <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p>
            This customer has no destination wallet yet. Send them the onboarding link so they can
            sign in or register and attach a wallet.
          </p>
          <button
            type="button"
            onClick={() => void sendOnboard()}
            disabled={!selectedCustomer.email}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            Send onboarding email
          </button>
          {!selectedCustomer.email ? (
            <p className="text-[var(--muted)]">Add an email on the customer record first.</p>
          ) : null}
          {invite ? (
            <p className="text-xs text-[var(--muted)]">
              Draft opened. Link:{" "}
              <a href={invite.link} className="text-[var(--accent-hover)] hover:underline">
                {invite.link}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {selectedCustomer?.wallet_address ? (
        <p className="text-sm text-[var(--muted)]">
          Destination wallet:{" "}
          <span className="font-mono text-[var(--foreground)]">{selectedCustomer.wallet_address}</span>
        </p>
      ) : null}

      <label className="block text-sm">
        Country
        <input
          name="countryCode"
          required
          defaultValue="FR"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Building identifier (cadastre / state record)
        <input
          name="buildingId"
          placeholder="Optional if a postal address is provided"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Postal address
        <textarea
          name="postalAddress"
          required
          rows={3}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Components</legend>
        {COMPONENT_KINDS.map((kind) => (
          <label key={kind} className="flex flex-col gap-2 rounded-xl border border-[var(--border)] p-3 text-sm">
            <span className="flex items-center gap-2">
              <input type="checkbox" name={kind} />
              <span className="capitalize">{kind.replace("-", " ")}</span>
              <span className="text-[var(--muted)]">· {COMPONENT_EXPIRY[kind]}</span>
            </span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) =>
                setFiles((current) => ({
                  ...current,
                  [kind]: event.target.files?.[0],
                }))
              }
            />
            <span className="text-xs text-[var(--muted)]">
              Optional PDF. If uploaded, its keccak256 hash is written on the token and the file is stored on our platform.
            </span>
          </label>
        ))}
      </fieldset>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {result ? <p className="text-sm text-emerald-300">{result}</p> : null}

      <button
        type="submit"
        disabled={loading || credits < 1 || !canIssue}
        className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {loading ? "Minting…" : credits < 1 ? "No issuance credits" : "Issue certificate token"}
      </button>
    </form>
  );
}
