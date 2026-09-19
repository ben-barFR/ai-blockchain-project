import { redirect } from "next/navigation";
import { AdminReviewButtons } from "@/components/admin/admin-review-buttons";
import { SiteHeader } from "@/components/layout/site-header";
import { explorerAddressUrl, getNetworkLabel, googleFaucetUrl } from "@/lib/ethereum/explorer";
import {
  getConfiguredContractAddress,
  getPlatformWalletAddress,
  getPlatformWalletBalance,
} from "@/lib/ethereum/platform";
import { createAdminClient, isAdminUser } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function AddressRow({
  label,
  address,
}: {
  label: string;
  address: string | null;
}) {
  const explorer = address ? explorerAddressUrl(address) : null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      {address ? (
        <p className="mt-1 break-all font-mono text-sm">{address}</p>
      ) : (
        <p className="mt-1 text-sm text-[var(--muted)]">Not configured</p>
      )}
      {explorer ? (
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm text-[var(--accent-hover)] hover:underline"
        >
          View on Etherscan
        </a>
      ) : null}
    </div>
  );
}

export default async function AdminIssuersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();
  if (!isAdminUser(user.email, profile?.user_type)) redirect("/portal");

  const admin = createAdminClient();
  const platformWallet = getPlatformWalletAddress();
  const contractAddress = getConfiguredContractAddress();
  const [{ data: issuers }, issuanceCount, walletBalance] = await Promise.all([
    admin.from("issuers").select("*").order("created_at", { ascending: false }),
    admin
      .from("certificate_issuances")
      .select("id", { count: "exact", head: true })
      .then((result) => result.count ?? 0),
    platformWallet ? getPlatformWalletBalance(platformWallet) : Promise.resolve(null),
  ]);

  const pendingIssuers = (issuers || []).filter((issuer) => issuer.status === "pending").length;
  const approvedIssuers = (issuers || []).filter((issuer) => issuer.status === "approved").length;
  const faucetUrl = googleFaucetUrl(platformWallet);

  return (
    <>
      <SiteHeader email={user.email} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-2 text-[var(--muted)]">
          Platform contract, minter wallet, and issuer review.
        </p>

        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-lg font-medium">Platform</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Network</p>
              <p className="mt-1 text-sm">{getNetworkLabel()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Certificates issued</p>
              <p className="mt-1 text-sm">{issuanceCount}</p>
            </div>
            <AddressRow label="Platform wallet" address={platformWallet} />
            <AddressRow label="Certificate contract" address={contractAddress} />
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Minter balance</p>
              <p className="mt-1 text-sm">{walletBalance || "Unavailable"}</p>
              {faucetUrl ? (
                <a
                  href={faucetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-[var(--accent-hover)] hover:underline"
                >
                  Get Sepolia ETH from Google faucet
                </a>
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Issuers</p>
              <p className="mt-1 text-sm">
                {approvedIssuers} approved · {pendingIssuers} pending
              </p>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-x-4 gap-y-2">
              <a
                href="https://vercel.com/ben-bar/ai-blockchain-project/deployments"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--accent-hover)] hover:underline"
              >
                Vercel deployment
              </a>
              <a
                href="https://supabase.com/dashboard/project/hpsxdjkuvrsvhwcenwvc"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--accent-hover)] hover:underline"
              >
                Supabase account
              </a>
              <a
                href="https://github.com/ben-barFR/ai-blockchain-project"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--accent-hover)] hover:underline"
              >
                GitHub project
              </a>
            </div>
          </div>
        </section>

        <h2 className="mt-10 text-2xl font-semibold">Issuer review</h2>
        <p className="mt-2 text-[var(--muted)]">
          Review each company identifier, then approve or reject. Approval also
          registers the wallet on-chain.
        </p>
        <div className="mt-8 space-y-4">
          {(issuers || []).map((issuer) => (
            <article
              key={issuer.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium">{issuer.company_name}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {issuer.country_code} · {issuer.company_identifier} · {issuer.status}
                  </p>
                </div>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">
                {issuer.wallet_address}
              </p>
              {issuer.status === "pending" ? (
                <AdminReviewButtons issuerId={issuer.id} />
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {issuer.review_notes || "No notes"} · on-chain:{" "}
                  {issuer.onchain_approved ? "yes" : "no"}
                </p>
              )}
            </article>
          ))}
          {issuers?.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No issuer applications yet.</p>
          ) : null}
        </div>
      </main>
    </>
  );
}
