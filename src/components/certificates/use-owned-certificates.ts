"use client";

import { useEffect, useState } from "react";
import type { OnChainCertificate } from "@/lib/ethereum/certificates";

export function useOwnedCertificates(walletAddress: string) {
  const [certificates, setCertificates] = useState<OnChainCertificate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setCertificates([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/certificates/owned?address=${walletAddress}`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          certificates?: OnChainCertificate[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Could not read wallet tokens");
        if (!cancelled) setCertificates(payload.certificates || []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  return { certificates, error, loading };
}
