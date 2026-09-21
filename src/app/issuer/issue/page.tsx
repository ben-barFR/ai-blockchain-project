import { Suspense } from "react";
import { IssueCertificateForm } from "@/components/issuers/issue-certificate-form";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { issuanceCreditsRemaining } from "@/lib/issuers/credits";
import { requireIssuerSession } from "@/lib/issuers/current-issuer";
import { getSupportEmail } from "@/lib/supabase/admin";

export default async function IssuerIssuePage() {
  const { user, issuer } = await requireIssuerSession({ unauthenticatedHref: "/issuer" });

  const contractAddress = process.env.NEXT_PUBLIC_CERTIFICATE_CONTRACT as
    | `0x${string}`
    | undefined;

  return (
    <IssuerShell email={user.email}>
      <h1 className="text-3xl font-semibold">Issue a certificate</h1>
      <p className="mt-2 text-[var(--muted)]">
        Select the customer first, then upload the PDF. We read the building from it, match or
        create a building record, then issue one certificate.
      </p>
      {issuer?.status !== "approved" ? (
        <p className="mt-8 text-sm text-amber-300">
          Company registration must be approved before you can issue certificates.
        </p>
      ) : (
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
            <IssueCertificateForm
              contractAddress={contractAddress || null}
              issuanceCredits={issuanceCreditsRemaining(issuer.issuance_credits)}
              supportEmail={getSupportEmail()}
            />
          </Suspense>
        </div>
      )}
    </IssuerShell>
  );
}
