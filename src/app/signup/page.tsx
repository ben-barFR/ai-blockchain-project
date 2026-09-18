import Link from "next/link";
import { SignUpForm } from "@/components/auth/signup-form";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
        <h1 className="text-2xl font-semibold">Sign up</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create an account to get started. Passwords are hashed with bcrypt by
          Supabase Auth.
        </p>

        <SignUpForm />

        <p className="mt-4 text-center">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            ← Back to welcome
          </Link>
        </p>
      </div>
    </main>
  );
}
