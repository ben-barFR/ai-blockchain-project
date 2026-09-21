import type { ReactNode } from "react";
import { VerificationShell } from "@/components/layout/verification-shell";
import { createClient } from "@/lib/supabase/server";

export default async function RegistryLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <VerificationShell email={user?.email}>{children}</VerificationShell>;
}
