"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";

const ITEMS = [
  {
    href: "/issuer/customers",
    label: "My customers",
    match: (path: string) => path === "/issuer" || path.startsWith("/issuer/customers"),
  },
  {
    href: "/issuer/issue",
    label: "Issue",
    match: (path: string) => path.startsWith("/issuer/issue"),
  },
  {
    href: "/issuer/company",
    label: "Company",
    match: (path: string) => path.startsWith("/issuer/company"),
  },
] as const;

export function IssuerNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const accountActive = pathname === "/account" || pathname.startsWith("/account/");

  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <nav className="flex items-center gap-1 text-sm" aria-label="Issuer portal">
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
            href="/account"
            aria-current={accountActive ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              accountActive
                ? "bg-[var(--card)] font-medium text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            My account
          </Link>
          <SignOutButton variant="link" email={email} />
        </div>
      </div>
    </header>
  );
}
