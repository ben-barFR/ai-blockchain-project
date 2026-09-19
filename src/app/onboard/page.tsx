import Link from "next/link";
import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/signup-form";
import { LoginForm } from "@/components/auth/login-form";
import { SiteHeader } from "@/components/layout/site-header";
import { portalForUserType } from "@/lib/auth/portal";
import { ensureProfileWallet } from "@/lib/ethereum/profile-wallet";
import { attachOwnerWalletToCustomers } from "@/lib/issuers/customers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!token) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 py-16">
          <h1 className="text-3xl font-semibold">Certificate onboarding</h1>
          <p className="mt-3 text-[var(--muted)]">
            Open the link from your issuer email to attach your wallet and receive a certificate.
          </p>
        </main>
      </>
    );
  }

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("issuer_customers")
    .select("id, full_name, email, wallet_address, onboard_claimed_at, issuer_id")
    .eq("onboard_token", token)
    .maybeSingle();

  if (!customer) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 py-16">
          <h1 className="text-3xl font-semibold">This link is not valid</h1>
          <p className="mt-3 text-[var(--muted)]">
            Ask your issuer to send the onboarding email again.
          </p>
        </main>
      </>
    );
  }

  const { data: issuer } = await admin
    .from("issuers")
    .select("company_name, user_id")
    .eq("id", customer.issuer_id)
    .maybeSingle();
  const { data: issuerProfile } = issuer
    ? await admin.from("profiles").select("email").eq("id", issuer.user_id).maybeSingle()
    : { data: null };

  const companyName = issuer?.company_name || "your certificate issuer";
  const issuerEmail = issuerProfile?.email || "";
  const next = `/onboard?token=${encodeURIComponent(token)}`;

  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.user_type === "issuer" || profile?.user_type === "admin") {
      return (
        <>
          <SiteHeader email={user.email} />
          <main className="mx-auto max-w-lg px-6 py-16">
            <h1 className="text-3xl font-semibold">Use an owner account</h1>
            <p className="mt-3 text-[var(--muted)]">
              Sign out and sign in (or register) as the building owner this invitation was sent to.
            </p>
          </main>
        </>
      );
    }

    const wallet = await ensureProfileWallet(supabase, user.id);
    await attachOwnerWalletToCustomers(admin, {
      userId: user.id,
      email: user.email || profile?.email,
      walletAddress: wallet.address,
      token,
    });

    const mailBody = `Hello,\n\nMy wallet address for the building certificate is:\n${wallet.address}\n`;
    const mailto = issuerEmail
      ? `mailto:${encodeURIComponent(issuerEmail)}?subject=${encodeURIComponent("My certificate wallet")}&body=${encodeURIComponent(mailBody)}`
      : "";

    return (
      <>
        <SiteHeader email={user.email} />
        <main className="mx-auto max-w-lg px-6 py-16">
          <h1 className="text-3xl font-semibold">You are ready</h1>
          <p className="mt-3 text-[var(--muted)]">
            {companyName} can now issue your certificate to this wallet.
          </p>
          <p className="mt-4 break-all font-mono text-sm">{wallet.address}</p>
          {mailto ? (
            <p className="mt-6 text-sm text-[var(--muted)]">
              If anything was interrupted,{" "}
              <a href={mailto} className="text-[var(--accent-hover)] hover:underline">
                email this wallet to {companyName}
              </a>
              .
            </p>
          ) : null}
          <Link
            href={portalForUserType(profile?.user_type)}
            className="mt-8 inline-flex rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Go to my portal
          </Link>
        </main>
      </>
    );
  }

  const fallbackMailto = issuerEmail
    ? `mailto:${encodeURIComponent(issuerEmail)}?subject=${encodeURIComponent("My certificate wallet")}&body=${encodeURIComponent("Hello,\n\nI could not finish onboarding. Please use the wallet address I send after I sign in.\n")}`
    : "";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-12">
        <h1 className="text-3xl font-semibold">You are ready for a new certificate</h1>
        <p className="mt-3 text-[var(--muted)]">
          {companyName} is preparing a building certificate for you. Sign in or register so we can
          attach your Ethereum wallet as the destination.
        </p>

        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-medium">Sign in</h2>
          <Suspense fallback={<p className="mt-8 text-sm text-[var(--muted)]">Loading…</p>}>
            <LoginForm redirectTo={next} />
          </Suspense>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-medium">Register</h2>
          <SignUpForm
            userType="owner"
            redirectTo={next}
            loginHref={`/login?next=${encodeURIComponent(next)}`}
          />
        </div>

        {fallbackMailto ? (
          <p className="mt-6 text-sm text-[var(--muted)]">
            If this gets interrupted,{" "}
            <a href={fallbackMailto} className="text-[var(--accent-hover)] hover:underline">
              email {companyName}
            </a>{" "}
            your wallet address from the account page after you sign in.
          </p>
        ) : null}
      </main>
    </>
  );
}
