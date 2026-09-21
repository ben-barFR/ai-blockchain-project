import type { ReactNode } from "react";
import { AskBldcrtChat } from "@/components/chat/ask-bldcrt";
import { VerificationNav } from "@/components/layout/verification-nav";

export function VerificationShell({
  children,
  email,
}: {
  children: ReactNode;
  email?: string | null;
}) {
  return (
    <>
      <VerificationNav email={email} />
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      <AskBldcrtChat />
    </>
  );
}
