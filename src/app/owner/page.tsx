import { SignUpForm } from "@/components/auth/signup-form";
import { OwnerBuildingList } from "@/components/certificates/owner-building-list";
import { SiteHeader } from "@/components/layout/site-header";
import { OwnerShell } from "@/components/layout/owner-shell";
import { ensureProfileWallet } from "@/lib/ethereum/profile-wallet";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-md px-6 py-10">
          <h1 className="text-3xl font-semibold">Building owner portal</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Register to get an Ethereum wallet and view certificates sent to it.
          </p>
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-medium">Register</h2>
            <SignUpForm
              userType="owner"
              redirectTo="/owner"
              loginHref="/login?next=/owner"
            />
          </div>
        </main>
      </>
    );
  }

  const wallet = await ensureProfileWallet(supabase, user.id);

  return (
    <OwnerShell email={user.email}>
      <h1 className="text-3xl font-semibold">My buildings</h1>
      <p className="mt-2 text-[var(--muted)]">
        Buildings that have certificates on the wallet linked to your account.
      </p>
      <div className="mt-8">
        <OwnerBuildingList walletAddress={wallet.address} />
      </div>
    </OwnerShell>
  );
}
