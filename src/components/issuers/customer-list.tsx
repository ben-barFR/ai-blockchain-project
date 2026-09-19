"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CustomerForm, type CustomerRecord } from "@/components/issuers/customer-form";

export function CustomerList() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/issuer/customers")
      .then(async (response) => {
        const payload = (await response.json()) as { customers?: CustomerRecord[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Could not load customers");
        setCustomers(payload.customers || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function sendOnboard(customer: CustomerRecord) {
    setError(null);
    setSendingId(customer.id);
    const response = await fetch(`/api/issuer/customers/${customer.id}/invite`, { method: "POST" });
    const payload = (await response.json()) as {
      mailto?: string;
      customer?: CustomerRecord;
      error?: string;
    };
    setSendingId(null);
    if (!response.ok || !payload.mailto) {
      setError(payload.error || "Could not prepare the onboarding email");
      return;
    }
    setCustomers((current) =>
      current.map((item) =>
        item.id === customer.id
          ? {
              ...item,
              ...(payload.customer || {}),
              onboard_sent_at: payload.customer?.onboard_sent_at || new Date().toISOString(),
            }
          : item,
      ),
    );
    window.location.href = payload.mailto;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          Destination wallets are stored on each customer. A certificate can be issued only when a wallet is present.
        </p>
        <button
          type="button"
          onClick={() => setCreating((open) => !open)}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          {creating ? "Close" : "New customer"}
        </button>
      </div>

      {creating ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-medium">New customer</h2>
          <div className="mt-4">
            <CustomerForm
              onCreated={(customer) => {
                setCustomers((current) => [customer, ...current]);
                setCreating(false);
              }}
            />
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-[var(--muted)]">Loading customers…</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {!loading && customers.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No customers yet. Add someone to send a certificate to.</p>
      ) : null}

      <ul className="space-y-3">
        {customers.map((customer) => {
          const certCount = customer.certificate_issuances?.length || 0;
          const inviteSent = Boolean(customer.onboard_sent_at) && !customer.wallet_address;
          return (
            <li
              key={customer.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    <Link href={`/issuer/customers/${customer.id}`} className="hover:underline">
                      {customer.full_name || customer.email || "Unnamed customer"}
                    </Link>
                  </p>
                  {customer.email ? (
                    <p className="text-sm text-[var(--muted)]">{customer.email}</p>
                  ) : null}
                  <p className="mt-1 break-all font-mono text-xs text-[var(--muted)]">
                    {customer.wallet_address || "No destination wallet yet"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    <Link href={`/issuer/customers/${customer.id}`} className="hover:underline">
                      {certCount} {certCount === 1 ? "certificate" : "certificates"}
                    </Link>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/issuer/customers/${customer.id}`}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)]"
                  >
                    View details
                  </Link>
                  {customer.wallet_address ? (
                    <Link
                      href={`/issuer/issue?customer=${customer.id}`}
                      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
                    >
                      Issue certificate
                    </Link>
                  ) : customer.email ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void sendOnboard(customer)}
                        disabled={sendingId === customer.id}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)] disabled:opacity-60"
                      >
                        {sendingId === customer.id
                          ? "Sending…"
                          : inviteSent
                            ? "Re-send onboarding email"
                            : "Send onboarding email"}
                      </button>
                      {inviteSent ? (
                        <p className="text-xs text-[var(--muted)]">Onboarding email sent</p>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
