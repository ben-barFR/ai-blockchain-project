import { redirect } from "next/navigation";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { AccountWalletCard } from "@/components/account/account-wallet-card";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { OwnerShell } from "@/components/layout/owner-shell";
import { SiteHeader } from "@/components/layout/site-header";
import { ensureProfileWallet } from "@/lib/ethereum/profile-wallet";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, user_type")
    .eq("id", user.id)
    .maybeSingle();

  const wallet = await ensureProfileWallet(supabase, user.id);
  const userType = profile?.user_type || "owner";
  const isOwner = userType === "owner";
  const isIssuer = userType === "issuer";

  const heading = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">My account</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {profile?.full_name || user.email} · {profile?.user_type || "owner"}
        </p>
      </div>
      {isOwner || isIssuer ? <SignOutButton email={user.email} /> : null}
    </div>
  );

  const walletCard = (
    <div className="mt-8">
      <AccountWalletCard
        initialAddress={wallet.address}
        initialPrivateKey={wallet.privateKey}
        initialSource={wallet.source}
      />
    </div>
  );

  const profileCard = (
    <div className="mt-6">
      <AccountProfileForm
        initialName={profile?.full_name || ""}
        initialEmail={profile?.email || user.email || ""}
      />
    </div>
  );

  if (isOwner) {
    return (
      <OwnerShell email={user.email}>
        {heading}
        {walletCard}
        {profileCard}
      </OwnerShell>
    );
  }

  if (isIssuer) {
    return (
      <IssuerShell email={user.email}>
        {heading}
        {walletCard}
        {profileCard}
      </IssuerShell>
    );
  }

  return (
    <>
      <SiteHeader email={user.email} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        {heading}
        {walletCard}
        {profileCard}
      </main>
    </>
  );
}
