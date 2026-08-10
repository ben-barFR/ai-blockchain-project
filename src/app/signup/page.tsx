import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
        <h1 className="text-2xl font-semibold">Sign up</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create an account to get started.
        </p>

        <form className="mt-8 space-y-4" action="#">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Your name"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent-hover)] hover:underline">
            Log in
          </Link>
        </p>

        <p className="mt-4 text-center">
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            ← Back to welcome
          </Link>
        </p>
      </div>
    </main>
  );
}
