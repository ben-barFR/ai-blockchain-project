import { notFound } from "next/navigation";
import { CertificateCard } from "@/components/certificates/certificate-card";
import { isContractConfigured, getContractAddress } from "@/lib/ethereum/client";
import { readCertificate } from "@/lib/ethereum/certificates";
import { explorerTokenUrl } from "@/lib/ethereum/explorer";

export default async function RegistryTokenPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;

  if (!isContractConfigured()) notFound();

  try {
    const certificate = await readCertificate(BigInt(tokenId));
    const etherscanUrl = explorerTokenUrl(getContractAddress(), tokenId);
    return (
      <>
        <h1 className="text-3xl font-semibold">Certificate #{tokenId}</h1>
        {etherscanUrl ? (
          <p className="mt-2 text-sm">
            <a
              href={etherscanUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-hover)] hover:underline"
            >
              View token on Etherscan
            </a>
          </p>
        ) : null}
        <div className="mt-6">
          <CertificateCard certificate={certificate} />
        </div>
      </>
    );
  } catch {
    notFound();
  }
}
