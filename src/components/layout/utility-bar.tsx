import Link from "next/link";

export function UtilityBar() {
  return (
    <div className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-1.5 text-xs text-[var(--muted)]">
        <Link href="/admin" className="hover:text-[var(--foreground)]">
          Admin
        </Link>
        <Link href="/demo" className="hover:text-[var(--foreground)]">
          Demo
        </Link>
      </div>
    </div>
  );
}
