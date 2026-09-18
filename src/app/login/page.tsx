import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Welcome back. Enter your details to continue.
        </p>

        <Suspense fallback={<p className="mt-8 text-sm text-[var(--muted)]">Loading…</p>}>
          <LoginForm />
        </Suspense>

        <p className="mt-4 text-center">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            ← Back to welcome
          </Link>
        </p>
      </div>
    </main>
  );
}
