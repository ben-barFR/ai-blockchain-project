import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function SiteHeader({
  email,
  showAuth = true,
}: {
  email?: string | null;
  showAuth?: boolean;
}) {
  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          BLDCRT
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
          {showAuth && email ? (
            <>
              <Link href="/account" className="hover:text-[var(--foreground)]">
                Account
              </Link>
              <SignOutButton email={email} />
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
