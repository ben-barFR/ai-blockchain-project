import type { ReactNode } from "react";
import { OwnerNav } from "@/components/layout/owner-nav";

export function OwnerShell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  return (
    <>
      <OwnerNav email={email} />
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </>
  );
}
