"use client";

import { useState } from "react";
import type { ComponentKind } from "@/lib/certificates/constants";

export type PendingPdfUpload = {
  tokenId: string;
  issuanceId: string;
  contentHash: string;
  types: ComponentKind[];
  file: File;
  customerId: string;
  buildingId: string;
};

function supportMailto(supportEmail: string, supabaseError: string, pending: PendingPdfUpload | null) {
  const body = [
    "The PDF could not be stored after the certificate was issued.",
    "",
    `Supabase error: ${supabaseError}`,
    pending?.tokenId ? `Certificate ID: ${pending.tokenId}` : null,
    pending?.issuanceId ? `Issuance ID: ${pending.issuanceId}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return `mailto:${supportEmail}?subject=${encodeURIComponent("Unexpected PDF upload error")}&body=${encodeURIComponent(body)}`;
}

export function UnexpectedPdfError({
  supabaseError,
  supportEmail,
  pending,
  onRetry,
}: {
  supabaseError: string;
  supportEmail: string;
  pending: PendingPdfUpload | null;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyError() {
    try {
      await navigator.clipboard.writeText(supabaseError);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
      <p className="text-red-200">
        The PDF could not be stored after the certificate was issued. This is not expected.
      </p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-[var(--background)] p-3 text-xs text-red-200">
        {supabaseError}
      </pre>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <a href={supportMailto(supportEmail, supabaseError, pending)} className="text-[var(--accent-hover)] hover:underline">
          Contact support
        </a>
        <button type="button" onClick={() => void copyError()} className="text-[var(--accent-hover)] hover:underline">
          {copied ? "Error copied" : "Copy error message"}
        </button>
        <button type="button" onClick={onRetry} className="text-[var(--accent-hover)] hover:underline">
          Retry
        </button>
      </div>
    </div>
  );
}
