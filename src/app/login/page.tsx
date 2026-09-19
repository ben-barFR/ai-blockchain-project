import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          You will be sent to the issuer, owner, or admin portal for your account.
        </p>

        <Suspense fallback={<p className="mt-8 text-sm text-[var(--muted)]">Loading…</p>}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          New here? Register from the{" "}
          <Link href="/issuer" className="text-[var(--accent-hover)] hover:underline">
            issuer
          </Link>{" "}
          or{" "}
          <Link href="/owner" className="text-[var(--accent-hover)] hover:underline">
            owner
          </Link>{" "}
          portal.
        </p>
        <p className="mt-3 text-center">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            ← Back to welcome
          </Link>
        </p>
      </div>
    </main>
  );
}
