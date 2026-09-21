import { CompanyPanel } from "@/components/issuers/company-panel";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { ensureProfileWallet } from "@/lib/ethereum/profile-wallet";
import { requireIssuerSession } from "@/lib/issuers/current-issuer";

export default async function IssuerCompanyPage() {
  const { user, issuer, supabase } = await requireIssuerSession({ unauthenticatedHref: "/issuer" });

  const wallet = await ensureProfileWallet(supabase, user.id);

  return (
    <IssuerShell email={user.email}>
      <h1 className="text-3xl font-semibold">Company</h1>
      <p className="mt-2 text-[var(--muted)]">
        Company details used on certificates you issue. You can edit them at any time.
      </p>

      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <CompanyPanel issuer={issuer} profileWallet={wallet.address} />
      </section>
    </IssuerShell>
  );
}
