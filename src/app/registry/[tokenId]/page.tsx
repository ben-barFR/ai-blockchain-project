import { notFound } from "next/navigation";
import { CertificateCard } from "@/components/certificates/certificate-card";
import { HashVerifier } from "@/components/certificates/hash-verifier";
import { SiteHeader } from "@/components/layout/site-header";
import { isContractConfigured } from "@/lib/ethereum/client";
import { readCertificate } from "@/lib/ethereum/certificates";
import { createClient } from "@/lib/supabase/server";

export default async function RegistryTokenPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { tokenId } = await params;

  if (!isContractConfigured()) notFound();

  try {
    const certificate = await readCertificate(BigInt(tokenId));
    return (
      <>
        <SiteHeader email={user?.email} />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <h1 className="mb-6 text-3xl font-semibold">Certificate #{tokenId}</h1>
          <CertificateCard certificate={certificate} />
          <div className="mt-10">
            <HashVerifier />
          </div>
        </main>
      </>
    );
  } catch {
    notFound();
  }
}
