import { CustomerList } from "@/components/issuers/customer-list";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { requireIssuerSession } from "@/lib/issuers/current-issuer";

export default async function IssuerCustomersPage() {
  const { user, issuer } = await requireIssuerSession({ unauthenticatedHref: "/issuer" });

  return (
    <IssuerShell email={user.email}>
      <h1 className="text-3xl font-semibold">My customers</h1>
      <p className="mt-2 text-[var(--muted)]">
        People you send certificates to. Each customer can have several buildings.
      </p>
      {issuer?.status !== "approved" ? (
        <p className="mt-8 text-sm text-amber-300">
          Company registration must be approved before you can add customers.
        </p>
      ) : (
        <div className="mt-8">
          <CustomerList />
        </div>
      )}
    </IssuerShell>
  );
}
