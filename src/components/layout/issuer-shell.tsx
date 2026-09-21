import type { ReactNode } from "react";
import Link from "next/link";
import { IssuerNav } from "@/components/layout/issuer-nav";
import { getCurrentIssuer } from "@/lib/issuers/current-issuer";

export async function IssuerShell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  const { issuer } = await getCurrentIssuer();
  const credits = issuer?.issuance_credits ?? 0;

  return (
    <>
      <IssuerNav email={email} />
      {issuer ? (
        <div className="border-b border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-2 text-sm">
            <p>
              Issuance credits remaining: <span className="font-medium">{credits}</span>
            </p>
            <Link href="/issuer/credits" className="text-[var(--accent-hover)] hover:underline">
              Add more
            </Link>
          </div>
        </div>
      ) : null}
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </>
  );
}
