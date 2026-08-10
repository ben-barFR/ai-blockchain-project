import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Welcome back. Enter your details to continue.
        </p>

        <form className="mt-8 space-y-4" action="#">
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
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Log in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[var(--accent-hover)] hover:underline">
            Sign up
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
