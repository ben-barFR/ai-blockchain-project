import { Suspense } from "react";
import { redirect } from "next/navigation";
import { OwnerCertificateList } from "@/components/certificates/owner-certificate-list";
import { OwnerShell } from "@/components/layout/owner-shell";
import { ensureProfileWallet } from "@/lib/ethereum/profile-wallet";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerCertificatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/owner");

  const wallet = await ensureProfileWallet(supabase, user.id);

  return (
    <OwnerShell email={user.email}>
      <h1 className="text-3xl font-semibold">My certificates</h1>
      <p className="mt-2 text-[var(--muted)]">
        Certificate tokens held by the wallet on your account.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
          <OwnerCertificateList walletAddress={wallet.address} />
        </Suspense>
      </div>
    </OwnerShell>
  );
}
