"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";

const ITEMS = [
  {
    href: "/registry",
    label: "Public certificate registry",
    match: (path: string) =>
      path === "/registry" ||
      (path.startsWith("/registry/") && !path.startsWith("/registry/verify")),
  },
  {
    href: "/registry/verify",
    label: "Verify a full report",
    match: (path: string) => path === "/registry/verify" || path.startsWith("/registry/verify/"),
  },
] as const;

export function VerificationNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const accountActive = pathname === "/account" || pathname.startsWith("/account/");

  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Verification portal">
          {ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 ${
                  active
                    ? "bg-[var(--card)] font-medium text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            BLDCRT
          </Link>
          {email ? (
            <>
              <Link
                href="/account"
                aria-current={accountActive ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  accountActive
                    ? "bg-[var(--card)] font-medium text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Account
              </Link>
              <SignOutButton variant="link" email={email} />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
