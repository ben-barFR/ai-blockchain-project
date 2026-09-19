"use client";

import { FormEvent, useState } from "react";

export function IssuerRegisterForm({
  defaults,
  profileWallet,
  submitLabel = "Save company details",
  onSaved,
}: {
  defaults?: {
    company_name?: string;
    country_code?: string;
    company_identifier?: string;
    website_url?: string | null;
    accreditation_url?: string | null;
  };
  profileWallet?: string;
  submitLabel?: string;
  onSaved?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      companyName: String(form.get("companyName") || ""),
      countryCode: String(form.get("countryCode") || ""),
      companyIdentifier: String(form.get("companyIdentifier") || ""),
      websiteUrl: String(form.get("websiteUrl") || ""),
      accreditationNumber: String(form.get("accreditationNumber") || ""),
    };
    const response = await fetch("/api/issuers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(result.error || "Could not submit registration");
      return;
    }
    setMessage("Company details saved.");
    onSaved?.();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field label="Company name" name="companyName" defaultValue={defaults?.company_name} required />
      <Field
        label="Country code (ISO)"
        name="countryCode"
        defaultValue={defaults?.country_code || "FR"}
        required
      />
      <Field
        label="Official company identifier"
        name="companyIdentifier"
        placeholder="SIREN, Companies House number, ..."
        defaultValue={defaults?.company_identifier}
        required
      />
      <Field
        label="Company website"
        name="websiteUrl"
        type="url"
        defaultValue={defaults?.website_url || ""}
      />
      <Field
        label="Accreditation number"
        name="accreditationNumber"
        inputMode="numeric"
        pattern="[0-9]+"
        placeholder="Digits only"
        defaultValue={defaults?.accreditation_url || ""}
      />
      {profileWallet ? (
        <p className="text-sm text-[var(--muted)]">
          Company wallet: <span className="font-mono text-[var(--foreground)]">{profileWallet}</span>
          . This was created with your account. Switch it from the account page.
        </p>
      ) : (
        <p className="text-sm text-amber-300">
          No wallet on this account yet. Open Account to create or attach one.
        </p>
      )}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      <button
        type="submit"
        disabled={loading || !profileWallet}
        className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {loading ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  inputMode,
  pattern,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: "numeric";
  pattern?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        inputMode={inputMode}
        pattern={pattern}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}
