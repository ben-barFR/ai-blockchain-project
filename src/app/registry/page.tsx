import Link from "next/link";
import { CertificateCard } from "@/components/certificates/certificate-card";
import { isContractConfigured } from "@/lib/ethereum/client";
import { readCertificate, readTokensByBuilding, readTokensByBuildingId, type OnChainCertificate } from "@/lib/ethereum/certificates";

export default async function RegistryPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; country?: string; building?: string }>;
}) {
  const params = await searchParams;
  const configured = isContractConfigured();

  let certificates: OnChainCertificate[] = [];
  let lookupError: string | null = null;

  const tokenQuery = (params.token || "").trim();
  const countryQuery = (params.country || "").trim().toUpperCase();
  const buildingQuery = (params.building || "").trim();

  if (configured && tokenQuery) {
    try {
      certificates = [await readCertificate(BigInt(tokenQuery))];
    } catch {
      lookupError = "No certificate found for that certificate ID.";
    }
  } else if (configured && buildingQuery) {
    try {
      const tokenIds = countryQuery
        ? await readTokensByBuilding(countryQuery, buildingQuery)
        : await readTokensByBuildingId(buildingQuery);
      certificates = await Promise.all(tokenIds.map((tokenId) => readCertificate(tokenId)));
      if (certificates.length === 0) lookupError = "No certificates for that building identifier.";
    } catch {
      lookupError = "Could not query the contract for that building.";
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold">Public certificate registry</h1>
      <p className="mt-2 text-[var(--muted)]">
        Anyone can read on-chain details. Holder identity is not available — only the
        wallet address. Full reports stay private.
      </p>

      {!configured ? (
        <p className="mt-6 text-sm text-amber-300">
          Contract address is not configured. Public lookup will work after deployment.
        </p>
      ) : null}

      <form className="mt-8 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          Certificate ID
          <input
            name="token"
            defaultValue={params.token || ""}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Country
          <input
            name="country"
            defaultValue={params.country || ""}
            placeholder="Optional"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Building identifier
          <input
            name="building"
            defaultValue={params.building || ""}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white sm:col-span-2"
        >
          Search
        </button>
      </form>

      {lookupError ? <p className="mt-6 text-sm text-red-300">{lookupError}</p> : null}

      <div className="mt-6 space-y-4">
        {certificates.map((certificate) => (
          <CertificateCard key={certificate.tokenId} certificate={certificate} />
        ))}
      </div>

      <p className="mt-8 text-sm text-[var(--muted)]">
        Certificate permalink: <Link href="/registry/1">/registry/&lt;certificateId&gt;</Link>
      </p>
    </>
  );
}
