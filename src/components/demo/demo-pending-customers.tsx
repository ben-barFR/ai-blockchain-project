"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PendingCustomer = {
  id: string;
  fullName: string | null;
  email: string | null;
  link: string | null;
};

export function DemoPendingCustomers() {
  const [customers, setCustomers] = useState<PendingCustomer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/demo/pending-customers")
      .then(async (response) => {
        const payload = (await response.json()) as { customers?: PendingCustomer[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Could not load pending customers");
        setCustomers(payload.customers || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function openOnboarding(customer: PendingCustomer) {
    if (!customer.link) return;
    setError(null);
    setOpeningId(customer.id);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(customer.link);
    router.refresh();
  }

  async function removePending(customer: PendingCustomer) {
    setError(null);
    setRemovingId(customer.id);
    const response = await fetch(`/api/demo/pending-customers/${customer.id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    setRemovingId(null);
    if (!response.ok) {
      setError(payload.error || "Could not remove pending customer");
      return;
    }
    setCustomers((current) => current.filter((item) => item.id !== customer.id));
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Loading pending customers…</p> : null}
      {!loading && customers.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No pending onboarding emails.</p>
      ) : null}
      {customers.length > 0 ? (
        <ul className="space-y-3">
          {customers.map((customer) => (
            <li
              key={customer.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div>
                <p className="font-medium">{customer.fullName || customer.email || "Unnamed customer"}</p>
                {customer.email ? <p className="text-sm text-[var(--muted)]">{customer.email}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {customer.link ? (
                  <button
                    type="button"
                    onClick={() => void openOnboarding(customer)}
                    disabled={openingId === customer.id}
                    className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
                  >
                    {openingId === customer.id ? "Opening…" : "Open onboarding link"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void removePending(customer)}
                  disabled={removingId === customer.id}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)] disabled:opacity-60"
                >
                  {removingId === customer.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
