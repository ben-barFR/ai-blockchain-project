"use client";

import { FormEvent, useState } from "react";

export type CustomerRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  wallet_address: string | null;
  onboard_sent_at: string | null;
  onboard_claimed_at: string | null;
  certificate_issuances?: { id: string; token_id: string | null }[];
};

export function CustomerForm({
  onCreated,
}: {
  onCreated: (customer: CustomerRecord) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");

  async function checkWallet() {
    setError(null);
    if (!email.includes("@")) {
      setLookupNote("Enter an email first, then check for a matching owner wallet.");
      return;
    }
    setChecking(true);
    const response = await fetch(`/api/issuer/customers/lookup?email=${encodeURIComponent(email)}`);
    const payload = (await response.json()) as {
      matched?: boolean;
      walletAddress?: string | null;
      error?: string;
    };
    setChecking(false);
    if (!response.ok) {
      setError(payload.error || "Could not check wallet");
      return;
    }
    if (payload.matched && payload.walletAddress) {
      setWallet(payload.walletAddress);
      setLookupNote("Wallet filled from an existing owner account.");
      return;
    }
    setLookupNote("No matching owner wallet yet. You can still save the email and onboard them later.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const response = await fetch("/api/issuer/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: String(form.get("fullName") || ""),
        email,
        walletAddress: wallet || String(form.get("walletAddress") || ""),
      }),
    });
    const payload = (await response.json()) as { customer?: CustomerRecord; error?: string };
    setLoading(false);
    if (!response.ok || !payload.customer) {
      setError(payload.error || "Could not create customer");
      return;
    }
    formEl.reset();
    setEmail("");
    setWallet("");
    setLookupNote(null);
    onCreated(payload.customer);
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm">
        Name
        <input
          name="fullName"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Email
        <input
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Destination wallet
        <input
          name="walletAddress"
          value={wallet}
          onChange={(event) => setWallet(event.target.value)}
          placeholder="0x… if they already have an account"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm"
        />
      </label>
      <button
        type="button"
        onClick={() => void checkWallet()}
        disabled={checking}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)] disabled:opacity-60"
      >
        {checking ? "Checking…" : "Check wallet"}
      </button>
      {lookupNote ? <p className="text-xs text-[var(--muted)]">{lookupNote}</p> : null}
      <p className="text-xs text-[var(--muted)]">Enter an email, a wallet, or both. Wallet matching only runs when you press Check wallet.</p>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save customer"}
      </button>
    </form>
  );
}
