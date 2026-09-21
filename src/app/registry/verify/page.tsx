import { HashVerifier } from "@/components/certificates/hash-verifier";

export default function VerifyReportPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Verify a full report</h1>
      <p className="mt-2 text-[var(--muted)]">
        Upload a PDF. We read the building from it, then check the certificate on the chain.
      </p>
      <div className="mt-8">
        <HashVerifier />
      </div>
    </>
  );
}
