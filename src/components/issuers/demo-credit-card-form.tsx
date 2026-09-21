"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CREDIT_PACK_PRICE_EUR, CREDIT_PACK_SIZE } from "@/lib/issuers/credits";

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function DemoCreditCardForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (name.trim().length < 2) {
      setError("Enter the name on the card.");
      return;
    }
    if (number.replace(/\s/g, "").length !== 16) {
      setError("Enter a 16-digit card number.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setError("Enter an expiry as MM/YY.");
      return;
    }
    if (cvc.replace(/\D/g, "").length < 3) {
      setError("Enter a CVC.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/issuer/credits", { method: "POST" });
    const payload = (await response.json()) as {
      error?: string;
      added?: number;
      issuanceCredits?: number;
    };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || "Payment failed");
      return;
    }

    setMessage(
      `Payment recorded. ${payload.added ?? CREDIT_PACK_SIZE} credits added. You now have ${payload.issuanceCredits ?? "updated"} credits.`,
    );
    setName("");
    setNumber("");
    setExpiry("");
    setCvc("");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
        <p className="text-sm text-[var(--muted)]">Pack</p>
        <p className="mt-1 text-lg font-medium">
          {CREDIT_PACK_SIZE} credits · {CREDIT_PACK_PRICE_EUR.toLocaleString("en-GB")}€
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">Demo checkout. No charge is made.</p>
      </div>

      <label className="block text-sm">
        Name on card
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="cc-name"
          placeholder="Jane Issuer"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Card number
        <input
          value={number}
          onChange={(event) => setNumber(formatCardNumber(event.target.value))}
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Expiry
          <input
            value={expiry}
            onChange={(event) => setExpiry(formatExpiry(event.target.value))}
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="12/29"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono"
          />
        </label>
        <label className="block text-sm">
          CVC
          <input
            value={cvc}
            onChange={(event) => setCvc(event.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {loading ? "Paying…" : `Pay ${CREDIT_PACK_PRICE_EUR.toLocaleString("en-GB")}€`}
      </button>
    </form>
  );
}
