"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AccountProfileForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      emailConfirmationRequired?: boolean;
    };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || "Could not save your details");
      return;
    }
    const passwordInput = formEl.elements.namedItem("password");
    if (passwordInput instanceof HTMLInputElement) passwordInput.value = "";
    setMessage(
      payload.emailConfirmationRequired
        ? "Saved. Confirm the new email if we sent a verification message."
        : "Saved.",
    );
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-lg font-medium">Your details</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        These are the details from registration. Leave the password blank to keep the current one.
      </p>
      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          Name
          <input
            name="name"
            required
            defaultValue={initialName}
            autoComplete="name"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            name="email"
            type="text"
            inputMode="email"
            autoComplete="email"
            required
            defaultValue={initialEmail}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          New password
          <input
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="Leave blank to keep the current password"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save details"}
        </button>
      </form>
    </section>
  );
}
