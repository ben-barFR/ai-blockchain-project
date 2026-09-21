import { Suspense } from "react";
import { redirect } from "next/navigation";
import { IssueCertificateForm } from "@/components/issuers/issue-certificate-form";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { getSupportEmail } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function IssuerIssuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/issuer");

  const { data: issuer } = await supabase
    .from("issuers")
    .select("status, issuance_credits")
    .eq("user_id", user.id)
    .maybeSingle();

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
              issuanceCredits={issuer.issuance_credits ?? 100}
              supportEmail={getSupportEmail()}
            />
          </Suspense>
        </div>
      )}
    </IssuerShell>
  );
}
