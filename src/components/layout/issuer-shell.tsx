import type { ReactNode } from "react";
import { IssuerNav } from "@/components/layout/issuer-nav";

export function IssuerShell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  return (
    <>
      <IssuerNav email={email} />
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </>
  );
}
