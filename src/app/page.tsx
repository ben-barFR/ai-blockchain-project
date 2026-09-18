import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-5xl font-bold tracking-tight">welcome</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Get started by creating an account or signing in.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-6 py-3 font-medium transition-colors hover:border-[var(--muted)]"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
