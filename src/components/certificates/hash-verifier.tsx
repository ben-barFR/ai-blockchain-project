"use client";

import { useState } from "react";
import Link from "next/link";
import { hashFile } from "@/lib/certificates/hash";
import { isPdfFile, MAX_REPORT_PDF_BYTES } from "@/lib/certificates/report-file";

type Match = {
  tokenId: string;
  buildingId: string;
  postalAddress: string;
  countryCode: string;
  component: string;
  componentLabel: string;
  valid: boolean;
  invalidated: boolean;
};

function PdfPicker({
  file,
  reading,
  onChange,
}: {
  file: File | null;
  reading: boolean;
  onChange: (file: File | undefined) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--accent)]/70 bg-[var(--accent)]/10 p-4">
      <p className="text-sm font-medium">PDF report</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)]">
          <input
            type="file"
            accept="application/pdf"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => {
              const next = event.target.files?.[0];
              onChange(next);
              event.target.value = "";
            }}
          />
          {file ? "Replace PDF" : "Choose PDF report"}
        </label>
        <span className="text-sm text-[var(--muted)]">
          {reading ? "Reading report…" : file ? file.name : "No file chosen"}
        </span>
      </div>
    </div>
  );
}

export function HashVerifier() {
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState("");
  const [postalAddress, setPostalAddress] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [showFields, setShowFields] = useState(false);
  const [found, setFound] = useState<boolean | null>(null);
  const [authentic, setAuthentic] = useState<boolean | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);

  async function parsePdf(nextFile: File) {
    setReading(true);
    setParseError(null);
    setError(null);
    setFound(null);
    setAuthentic(null);
    setMatches([]);
    try {
      const form = new FormData();
      form.set("file", nextFile);
      const response = await fetch("/api/certificates/parse-report", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as {
        buildingId?: string;
        postalAddress?: string;
        countryCode?: string;
        error?: string;
      };
      if (!response.ok) {
        setBuildingId("");
        setPostalAddress("");
        setCountryCode("");
        setParseError(payload.error || "Could not read this PDF");
        return;
      }
      setBuildingId(payload.buildingId || "");
      setPostalAddress(payload.postalAddress || "");
      setCountryCode(payload.countryCode || "");
    } catch (err) {
      setBuildingId("");
      setPostalAddress("");
      setCountryCode("");
      setParseError(err instanceof Error ? err.message : "Could not read this PDF");
    } finally {
      setShowFields(true);
      setReading(false);
    }
  }

  async function onPdfChange(nextFile: File | undefined) {
    setFile(null);
    setShowFields(false);
    setParseError(null);
    setError(null);
    setFound(null);
    setAuthentic(null);
    setMatches([]);
    setBuildingId("");
    setPostalAddress("");
    setCountryCode("");
    if (!nextFile) return;
    if (!isPdfFile(nextFile)) {
      setError("Upload a PDF report");
      return;
    }
    if (nextFile.size > MAX_REPORT_PDF_BYTES) {
      setError("PDF must be 12 MB or smaller");
      return;
    }
    setFile(nextFile);
    await parsePdf(nextFile);
  }

  async function checkCertificate() {
    if (!file) {
      setError("Upload a PDF report first.");
      return;
    }
    if (!buildingId.trim() && !postalAddress.trim()) {
      setError("Enter a building ID or postal address.");
      return;
    }
    setChecking(true);
    setError(null);
    setFound(null);
    setAuthentic(null);
    setMatches([]);
    try {
      const reportHash = await hashFile(file);
      const response = await fetch("/api/certificates/verify-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildingId: buildingId.trim(),
          postalAddress: postalAddress.trim(),
          countryCode: countryCode.trim(),
          reportHash,
        }),
      });
      const payload = (await response.json()) as {
        found?: boolean;
        authentic?: boolean;
        matches?: Match[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Could not check this certificate");
      }
      setFound(Boolean(payload.found));
      setAuthentic(Boolean(payload.authentic));
      setMatches(payload.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check this certificate");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-4">
      <PdfPicker file={file} reading={reading} onChange={(next) => void onPdfChange(next)} />

      {parseError ? (
        <p className="text-sm text-red-300">
          PDF parsing failed ({parseError}){" "}
          {file ? (
            <button
              type="button"
              onClick={() => void parsePdf(file)}
              disabled={reading}
              className="text-[var(--accent-hover)] hover:underline disabled:opacity-60"
            >
              Retry
            </button>
          ) : null}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {showFields && !reading ? (
        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <label className="block text-sm">
            Building ID
            <input
              value={buildingId}
              onChange={(event) => setBuildingId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Postal address
            <textarea
              value={postalAddress}
              onChange={(event) => setPostalAddress(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() => void checkCertificate()}
            disabled={checking || !file}
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {checking ? "Checking…" : "Check certificate"}
          </button>
        </div>
      ) : null}

      {found === false ? (
        <p className="text-sm text-amber-300">No certificate was found on the chain for this building.</p>
      ) : null}
      {found && authentic === false ? (
        <p className="text-sm text-amber-300">
          We could not confirm the authenticity of this document.
        </p>
      ) : null}
      {found && authentic && matches.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <p className="text-emerald-200">This document matches a certificate on the chain.</p>
          <ul className="space-y-2">
            {matches.map((match) => (
              <li key={`${match.tokenId}-${match.component}`}>
                <Link
                  href={`/registry/${match.tokenId}`}
                  className="text-[var(--accent-hover)] hover:underline"
                >
                  Certificate ID {match.tokenId}
                </Link>
                <span className="text-[var(--muted)]">
                  {" "}
                  · {match.componentLabel} · {match.valid ? "Valid" : "Invalid"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
