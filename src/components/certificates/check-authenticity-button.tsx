"use client";

import { useRef, useState } from "react";
import { COMPONENT_LABELS, type ComponentKind } from "@/lib/certificates/constants";
import { zeroHash } from "@/lib/certificates/format";
import { hashFile } from "@/lib/certificates/hash";
import type { OnChainCertificate } from "@/lib/ethereum/certificates";

export function CheckAuthenticityButton({
  certificate,
}: {
  certificate: OnChainCertificate;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);

  const hashedComponents = certificate.components.filter(
    (component) => component.present && !zeroHash(component.reportHash),
  );

  async function onFileChange(file: File | undefined) {
    setError(null);
    setResult(null);
    setMatched(null);
    if (!file) return;
    if (hashedComponents.length === 0) {
      setError("This token has no report hash to check against.");
      return;
    }

    setLoading(true);
    try {
      const reportHash = await hashFile(file);
      const checks = await Promise.all(
        hashedComponents.map(async (component) => {
          const response = await fetch("/api/certificates/verify-hash", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tokenId: certificate.tokenId,
              component: component.kind,
              reportHash,
            }),
          });
          const payload = (await response.json()) as {
            matches?: boolean;
            error?: string;
          };
          if (!response.ok) {
            throw new Error(payload.error || "Could not read the token hash");
          }
          return { kind: component.kind as ComponentKind, matches: Boolean(payload.matches) };
        }),
      );
      const hit = checks.find((check) => check.matches);
      if (hit) {
        setMatched(true);
        setResult(
          `This file matches the ${COMPONENT_LABELS[hit.kind].toLowerCase()} hash on token #${certificate.tokenId}.`,
        );
      } else {
        setMatched(false);
        setResult("This file does not match the report hash stored on this token.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authenticity check failed");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => void onFileChange(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)] disabled:opacity-60"
      >
        {loading ? "Checking…" : "Check document authenticity"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      {result ? (
        <p className={`mt-2 text-sm ${matched ? "text-emerald-300" : "text-amber-300"}`}>{result}</p>
      ) : null}
    </div>
  );
}
