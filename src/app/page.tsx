import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/layout/site-header";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <SiteHeader email={user?.email} />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Building certificates
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">
          Issue, hold, and verify building assessments on Ethereum Sepolia.
        </p>

        <section>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <PortalCard
              href="/issuer"
              title="Certificate issuers"
              body="Register your company and issue official certificates for the buildings you assess."
            />
            <PortalCard
              href="/owner"
              title="Building owners"
              body="Create an account and keep every certificate issued for your buildings in one place."
            />
          </div>

          <p className="mt-8 text-sm text-[var(--muted)]">
            Already registered?{" "}
            <Link href="/login" className="text-[var(--accent-hover)] hover:underline">
              Sign in
            </Link>
          </p>
        </section>

        <section className="mt-16">
          <div className="grid gap-4 md:grid-cols-2">
            <PortalCard
              href="/registry"
              title="Verification portal"
              body="Look up a building and confirm a report is authentic, without relying on a paper copy."
            />
          </div>
        </section>
      </main>
    </>
  );
}

function PortalCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-[var(--muted)]"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
    </Link>
  );
}
