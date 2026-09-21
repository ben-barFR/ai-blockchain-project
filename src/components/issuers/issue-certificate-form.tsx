"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  COMPONENT_EXPIRY,
  COMPONENT_KINDS,
  COMPONENT_LABELS,
  type ComponentKind,
} from "@/lib/certificates/constants";
import { hashFile } from "@/lib/certificates/hash";
import { isPdfFile, MAX_REPORT_PDF_BYTES, uniqueComponentKinds } from "@/lib/certificates/report-file";
import type { CustomerRecord } from "@/components/issuers/customer-form";
import {
  findMatchingBuilding,
  type CustomerBuilding,
} from "@/lib/issuers/buildings";

type ParsedReport = {
  buildingId: string;
  postalAddress: string;
  countryCode: string;
  types: ComponentKind[];
};

const ISSUE_DRAFT_KEY = "bldcrt-issue-draft";
const ISSUE_FILE_DB = "bldcrt-issue";
const ISSUE_FILE_STORE = "files";
const ISSUE_FILE_KEY = "pdf";

let issueFileMemory: File | null = null;

function pageWasReloaded() {
  if (typeof performance === "undefined") return false;
  const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return nav?.type === "reload";
}

function readIssueDraft() {
  try {
    const raw = sessionStorage.getItem(ISSUE_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      customerId?: string;
      parsed?: ParsedReport;
      types?: ComponentKind[];
      selectedBuildingId?: string;
      parseError?: string;
    };
  } catch {
    return null;
  }
}

function writeIssueDraft(draft: {
  customerId: string;
  parsed?: ParsedReport;
  types: ComponentKind[];
  selectedBuildingId?: string;
  parseError?: string;
}) {
  try {
    sessionStorage.setItem(ISSUE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

function openIssueFileDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(ISSUE_FILE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ISSUE_FILE_STORE)) {
        request.result.createObjectStore(ISSUE_FILE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveIssueFile(file: File) {
  issueFileMemory = file;
  try {
    const db = await openIssueFileDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ISSUE_FILE_STORE, "readwrite");
      tx.objectStore(ISSUE_FILE_STORE).put(file, ISSUE_FILE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* Keep the in-memory copy if IndexedDB is unavailable. */
  }
}

async function readIssueFile() {
  if (issueFileMemory) return issueFileMemory;
  try {
    const db = await openIssueFileDb();
    const file = await new Promise<File | null>((resolve, reject) => {
      const tx = db.transaction(ISSUE_FILE_STORE, "readonly");
      const request = tx.objectStore(ISSUE_FILE_STORE).get(ISSUE_FILE_KEY);
      request.onsuccess = () => resolve((request.result as File) || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    issueFileMemory = file;
    return file;
  } catch {
    return null;
  }
}

function clearIssueDraft() {
  issueFileMemory = null;
  try {
    sessionStorage.removeItem(ISSUE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
  void openIssueFileDb()
    .then(async (db) => {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(ISSUE_FILE_STORE, "readwrite");
        tx.objectStore(ISSUE_FILE_STORE).delete(ISSUE_FILE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    })
    .catch(() => {
      /* ignore */
    });
}

type IssueStep = "issue" | "transfer" | "upload";

const ISSUE_STEPS: { id: IssueStep; label: string }[] = [
  { id: "issue", label: "Issuing certificate" },
  { id: "transfer", label: "Transferring to the client" },
  { id: "upload", label: "Uploading PDF" },
];

type PendingPdfUpload = {
  tokenId: string;
  issuanceId: string;
  contentHash: string;
  types: ComponentKind[];
  file: File;
  customerId: string;
  buildingId: string;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildingOptionLabel(building: CustomerBuilding) {
  const identifier = building.building_identifier?.trim() || "No ID";
  const address = building.postal_address?.replace(/[\s\n]+/g, " ").trim() || "No address";
  return `${identifier} · ${address}`;
}

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

function IssueProgress({
  current,
  failed,
}: {
  current: IssueStep | null;
  failed: IssueStep | null;
}) {
  const currentIndex = current ? ISSUE_STEPS.findIndex((step) => step.id === current) : -1;
  const failedIndex = failed ? ISSUE_STEPS.findIndex((step) => step.id === failed) : -1;
  const fillPercent = failed
    ? Math.round(((failedIndex + 1) / ISSUE_STEPS.length) * 100)
    : currentIndex < 0
      ? 0
      : Math.round(((currentIndex + 0.55) / ISSUE_STEPS.length) * 100);

  return (
    <div className="space-y-3">
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--border)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(fillPercent, 100)}
        aria-label="Issuance progress"
      >
        <div
          className={`h-full rounded-full transition-all ${failed ? "bg-red-400" : "bg-[var(--accent)]"}`}
          style={{ width: `${Math.min(Math.max(fillPercent, 8), 100)}%` }}
        />
      </div>
      <ol className="space-y-1.5 text-sm">
        {ISSUE_STEPS.map((step, index) => {
          let status: "done" | "current" | "error" | "pending" = "pending";
          if (failed && index === failedIndex) status = "error";
          else if (failed && index < failedIndex) status = "done";
          else if (currentIndex >= 0 && index < currentIndex) status = "done";
          else if (index === currentIndex && !failed) status = "current";

          const color =
            status === "error"
              ? "text-red-300"
              : status === "current"
                ? "text-[var(--foreground)]"
                : status === "done"
                  ? "text-[var(--muted)]"
                  : "text-[var(--muted)]";

          return (
            <li key={step.id} className={`flex items-center gap-2 ${color}`}>
              <span className="w-4 text-center text-xs">
                {status === "done" ? "✓" : status === "error" ? "!" : status === "current" ? "●" : "○"}
              </span>
              <span className={status === "current" ? "font-medium" : undefined}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function UnexpectedPdfError({
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

export function IssueCertificateForm({
  contractAddress,
  issuanceCredits,
  supportEmail,
}: {
  contractAddress: `0x${string}` | null;
  issuanceCredits: number;
  supportEmail: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomer = searchParams.get("customer") || "";
  const presetBuilding = searchParams.get("building") || "";
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customerId, setCustomerId] = useState(presetCustomer);
  const [buildings, setBuildings] = useState<CustomerBuilding[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(presetBuilding);
  const [manualBuildingId, setManualBuildingId] = useState(presetBuilding);
  const [changingBuilding, setChangingBuilding] = useState(false);
  const [pickerBuildingId, setPickerBuildingId] = useState(presetBuilding);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedReport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [types, setTypes] = useState<ComponentKind[]>([]);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [credits, setCredits] = useState(issuanceCredits);
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<{ mailto: string; link: string } | null>(null);
  const [issueStep, setIssueStep] = useState<IssueStep | null>(null);
  const [failedStep, setFailedStep] = useState<IssueStep | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingPdfUpload | null>(null);

  useEffect(() => {
    if (pageWasReloaded()) {
      clearIssueDraft();
      setCustomerId("");
      setSelectedBuildingId("");
      setManualBuildingId("");
      setChangingBuilding(false);
      setPickerBuildingId("");
      setFile(null);
      setParsed(null);
      setParseError(null);
      setTypes([]);
      setInvite(null);
      setError(null);
      setResult(null);
      setIssueStep(null);
      setFailedStep(null);
      setSupabaseError(null);
      setPendingUpload(null);
      if (window.location.search) {
        router.replace("/issuer/issue");
      }
    } else {
      const draft = readIssueDraft();
      void readIssueFile().then((savedFile) => {
        if (!savedFile || (!draft?.parsed && !draft?.parseError)) return;
        setFile(savedFile);
        if (draft.parseError) {
          setParseError(draft.parseError);
          setParsed(null);
          setTypes(uniqueComponentKinds(draft.types || []));
        } else if (draft.parsed) {
          setParsed(draft.parsed);
          setTypes(uniqueComponentKinds(draft.types || draft.parsed.types));
        }
        if (draft.customerId && !presetCustomer) setCustomerId(draft.customerId);
        if (draft.selectedBuildingId && !presetBuilding) {
          setManualBuildingId(draft.selectedBuildingId);
        }
      });
    }
    fetch("/api/issuer/customers")
      .then(async (response) => {
        const payload = (await response.json()) as { customers?: CustomerRecord[] };
        setCustomers(payload.customers || []);
      })
      .catch(() => setCustomers([]));
  }, [presetBuilding, presetCustomer, router]);

  function resetReport() {
    clearIssueDraft();
    setFile(null);
    setParsed(null);
    setParseError(null);
    setTypes([]);
    setResult(null);
    setError(null);
    setInvite(null);
    setIssueStep(null);
    setFailedStep(null);
    setSupabaseError(null);
    setPendingUpload(null);
  }

  useEffect(() => {
    if (!customerId) {
      setBuildings([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/issuer/customers/${customerId}/buildings`)
      .then(async (response) => {
        const payload = (await response.json()) as { buildings?: CustomerBuilding[] };
        if (!cancelled) setBuildings(payload.buildings || []);
      })
      .catch(() => {
        if (!cancelled) setBuildings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    const active = buildings.filter((building) => !building.archived_at);
    if (manualBuildingId && active.some((building) => building.id === manualBuildingId)) {
      setSelectedBuildingId(manualBuildingId);
      return;
    }
    if (presetBuilding && active.some((building) => building.id === presetBuilding)) {
      setSelectedBuildingId(presetBuilding);
      return;
    }
    if (parsed) {
      const matched = findMatchingBuilding(active, {
        buildingIdentifier: parsed.buildingId,
        postalAddress: parsed.postalAddress,
        countryCode: parsed.countryCode,
      });
      setSelectedBuildingId(matched?.id || "");
      return;
    }
    setSelectedBuildingId("");
  }, [buildings, parsed, presetBuilding, manualBuildingId]);

  const selectedCustomer = customers.find((customer) => customer.id === customerId) || null;
  const selectedBuilding = buildings.find((building) => building.id === selectedBuildingId) || null;
  const activeBuildings = buildings.filter((building) => !building.archived_at);
  const canIssue = Boolean(selectedCustomer?.wallet_address);
  const canMint = Boolean(file) && types.length > 0 && Boolean(selectedBuilding) && canIssue;
  const showAfterPdf = Boolean(customerId && file && !reading);

  function newBuildingHref(options?: { empty?: boolean }) {
    const params = new URLSearchParams();
    if (parsed && !options?.empty) {
      params.set("buildingId", parsed.buildingId);
      params.set("postalAddress", parsed.postalAddress);
      params.set("countryCode", parsed.countryCode);
    }
    params.set("next", `/issuer/issue?customer=${customerId}`);
    return `/issuer/customers/${customerId}/buildings/new?${params.toString()}`;
  }

  function persistDraft() {
    if (!customerId || !file) return Promise.resolve();
    writeIssueDraft({
      customerId,
      parsed: parsed || undefined,
      types,
      selectedBuildingId: selectedBuildingId || pickerBuildingId || undefined,
      parseError: parseError || undefined,
    });
    return saveIssueFile(file);
  }

  async function parsePdf(nextFile: File) {
    setReading(true);
    setError(null);
    setParseError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set("file", nextFile);
      const response = await fetch("/api/certificates/parse-report", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as ParsedReport & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not read this PDF");
      }
      const nextParsed: ParsedReport = {
        buildingId: payload.buildingId || "",
        postalAddress: payload.postalAddress || "",
        countryCode: payload.countryCode || "FR",
        types: uniqueComponentKinds(payload.types),
      };
      setParsed(nextParsed);
      setParseError(null);
      setTypes(nextParsed.types);
      if (customerId) {
        writeIssueDraft({
          customerId,
          parsed: nextParsed,
          types: nextParsed.types,
          selectedBuildingId: selectedBuildingId || undefined,
        });
        void saveIssueFile(nextFile);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not read this PDF";
      setParsed(null);
      setTypes([]);
      setParseError(message);
      if (customerId) {
        writeIssueDraft({
          customerId,
          types: [],
          parseError: message,
        });
        void saveIssueFile(nextFile);
      }
    } finally {
      setReading(false);
    }
  }

  async function onPdfChange(nextFile: File | undefined) {
    setFile(null);
    setParsed(null);
    setParseError(null);
    setTypes([]);
    setManualBuildingId("");
    setChangingBuilding(false);
    setError(null);
    setResult(null);
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

  function toggleType(kind: ComponentKind) {
    setTypes((current) =>
      current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind],
    );
  }

  async function sendOnboard() {
    if (!selectedCustomer) return;
    setError(null);
    const response = await fetch(`/api/issuer/customers/${selectedCustomer.id}/invite`, {
      method: "POST",
    });
    const payload = (await response.json()) as { mailto?: string; link?: string; error?: string };
    if (!response.ok || !payload.mailto || !payload.link) {
      setError(payload.error || "Could not prepare the onboarding email");
      return;
    }
    setInvite({ mailto: payload.mailto, link: payload.link });
    window.location.href = payload.mailto;
  }

  async function uploadPdfReports(pending: PendingPdfUpload) {
    for (const kind of pending.types) {
      const upload = new FormData();
      upload.set("tokenId", pending.tokenId);
      upload.set("issuanceId", pending.issuanceId);
      upload.set("component", kind);
      upload.set("contentHash", pending.contentHash);
      upload.set("file", pending.file);
      const stored = await fetch("/api/certificates/reports", {
        method: "POST",
        body: upload,
      });
      if (!stored.ok) {
        const storedResult = (await stored.json()) as { error?: string };
        return {
          ok: false as const,
          error: storedResult.error || "Supabase storage upload failed",
        };
      }
    }
    return { ok: true as const };
  }

  function finishIssuance(pending: PendingPdfUpload) {
    clearIssueDraft();
    router.push(`/issuer/customers/${pending.customerId}/buildings/${pending.buildingId}`);
    router.refresh();
  }

  async function retryPdfUpload() {
    if (!pendingUpload) return;
    setError(null);
    setSupabaseError(null);
    setFailedStep(null);
    setLoading(true);
    setIssueStep("upload");
    const uploaded = await uploadPdfReports(pendingUpload);
    if (!uploaded.ok) {
      setLoading(false);
      setFailedStep("upload");
      setSupabaseError(uploaded.error);
      return;
    }
    setPendingUpload(null);
    finishIssuance(pendingUpload);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingUpload) {
      await retryPdfUpload();
      return;
    }
    if (!file) {
      setError("Upload the PDF report first.");
      return;
    }
    if (types.length === 0) {
      setError("Select at least one certificate type.");
      return;
    }
    if (!selectedBuilding) {
      setError("Create or select a building that matches this report.");
      return;
    }
    if (!canIssue) {
      setError("This customer needs a destination wallet first.");
      return;
    }
    setError(null);
    setResult(null);
    setSupabaseError(null);
    setFailedStep(null);
    setPendingUpload(null);
    setLoading(true);
    setIssueStep("issue");
    const contentHash = await hashFile(file);
    const hashes = Object.fromEntries(types.map((kind) => [kind, contentHash])) as Partial<
      Record<ComponentKind, string>
    >;

    const response = await fetch("/api/certificates/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        customerBuildingId: selectedBuilding.id,
        components: types,
        hashes,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      tokenId?: string;
      txHash?: string;
      issuanceId?: string;
      issuanceCredits?: number;
      customerWallet?: string;
    };
    if (!response.ok) {
      setLoading(false);
      setFailedStep("issue");
      setError(payload.error || "Issuance failed");
      return;
    }

    if (typeof payload.issuanceCredits === "number") {
      setCredits(payload.issuanceCredits);
    }

    setIssueStep("transfer");
    await wait(400);

    if (!payload.issuanceId || !payload.tokenId) {
      setLoading(false);
      setFailedStep("upload");
      setSupabaseError(
        payload.error ||
          "Certificate was issued, but the app did not receive an issuance id for the PDF upload.",
      );
      return;
    }

    const pending: PendingPdfUpload = {
      tokenId: payload.tokenId,
      issuanceId: payload.issuanceId,
      contentHash,
      types,
      file,
      customerId,
      buildingId: selectedBuilding.id,
    };
    setPendingUpload(pending);
    setIssueStep("upload");
    const uploaded = await uploadPdfReports(pending);
    if (!uploaded.ok) {
      setLoading(false);
      setFailedStep("upload");
      setSupabaseError(uploaded.error);
      router.refresh();
      return;
    }

    setPendingUpload(null);
    finishIssuance(pending);
  }

  if (!contractAddress) {
    return (
      <p className="text-sm text-[var(--muted)]">
        The certificate contract is not configured yet. Add{" "}
        <code>NEXT_PUBLIC_CERTIFICATE_CONTRACT</code> after deploying.
      </p>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm">
        Customer
        <select
          required
          value={customerId}
          disabled={loading || Boolean(pendingUpload)}
          onChange={(event) => {
            setCustomerId(event.target.value);
            setSelectedBuildingId("");
            setManualBuildingId("");
            setChangingBuilding(false);
            setPickerBuildingId("");
            resetReport();
          }}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
        >
          <option value="">Select a customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.full_name || customer.email || "Unnamed"}{" "}
              {customer.wallet_address ? "" : "(no wallet)"}
            </option>
          ))}
        </select>
      </label>

      {selectedCustomer && !canIssue ? (
        <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p>
            This customer has no destination wallet yet. Send them the onboarding link so they can
            sign in or register and attach a wallet.
          </p>
          <button
            type="button"
            onClick={() => void sendOnboard()}
            disabled={!selectedCustomer.email}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            Send onboarding email
          </button>
          {!selectedCustomer.email ? (
            <p className="text-[var(--muted)]">Add an email on the customer record first.</p>
          ) : null}
          {invite ? (
            <p className="text-xs text-[var(--muted)]">
              Draft opened. Link:{" "}
              <a href={invite.link} className="text-[var(--accent-hover)] hover:underline">
                {invite.link}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {selectedCustomer?.wallet_address ? (
        <p className="text-sm text-[var(--muted)]">
          Destination wallet:{" "}
          <span className="font-mono text-[var(--foreground)]">{selectedCustomer.wallet_address}</span>
        </p>
      ) : null}

      {customerId ? (
        <PdfPicker key={customerId} file={file} reading={reading} onChange={(next) => void onPdfChange(next)} />
      ) : (
        <p className="text-sm text-[var(--muted)]">Select a customer first to attach a PDF.</p>
      )}

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

      {showAfterPdf ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Certificate types in this document</legend>
          <p className="text-xs text-[var(--muted)]">
            This PDF can cover one, two, or all three types. The same file is hashed once and written
            on the certificate.
          </p>
          {COMPONENT_KINDS.map((kind) => (
            <label
              key={kind}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={types.includes(kind)}
                onChange={() => toggleType(kind)}
                disabled={reading}
              />
              <span>{COMPONENT_LABELS[kind]}</span>
              <span className="text-[var(--muted)]">· {COMPONENT_EXPIRY[kind]}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {showAfterPdf ? (
        <div className="space-y-3 rounded-xl border border-[var(--border)] p-4 text-sm">
          {changingBuilding || (!selectedBuilding && !parsed) ? (
            <>
              <p className="font-medium">Building</p>
              <select
                value={pickerBuildingId}
                onChange={(event) => setPickerBuildingId(event.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              >
                <option value="">Select a building</option>
                {activeBuildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {buildingOptionLabel(building)}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!pickerBuildingId}
                  onClick={() => {
                    setManualBuildingId(pickerBuildingId);
                    setSelectedBuildingId(pickerBuildingId);
                    setChangingBuilding(false);
                  }}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
                >
                  Select
                </button>
                <Link
                  href={newBuildingHref({ empty: true })}
                  onClick={() => {
                    void persistDraft();
                  }}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--background)]"
                >
                  Add new building
                </Link>
              </div>
            </>
          ) : selectedBuilding ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">Selected building</p>
                <button
                  type="button"
                  onClick={() => {
                    setPickerBuildingId(selectedBuildingId);
                    setChangingBuilding(true);
                  }}
                  className="shrink-0 text-sm text-[var(--accent-hover)] hover:underline"
                >
                  Change building
                </button>
              </div>
              <p>
                <span className="text-[var(--muted)]">Building ID:</span>{" "}
                {selectedBuilding.building_identifier || "—"}
              </p>
              <p className="whitespace-pre-line">
                <span className="text-[var(--muted)]">Address:</span>{" "}
                {selectedBuilding.postal_address || "—"}
                {selectedBuilding.country_code ? ` (${selectedBuilding.country_code})` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Building</p>
              <p className="text-[var(--muted)]">No existing building matches this PDF.</p>
              <p>
                <span className="text-[var(--muted)]">Building ID:</span> {parsed?.buildingId || "—"}
              </p>
              <p className="whitespace-pre-line">
                <span className="text-[var(--muted)]">Address:</span> {parsed?.postalAddress || "—"}
                {parsed?.countryCode ? ` (${parsed.countryCode})` : ""}
              </p>
              <Link
                href={newBuildingHref()}
                onClick={() => {
                  void persistDraft();
                }}
                className="inline-block text-sm text-[var(--accent-hover)] hover:underline"
              >
                Create a new building with this PDF data
              </Link>
            </>
          )}
        </div>
      ) : customerId && !file && !reading ? (
        <p className="text-sm text-[var(--muted)]">
          Upload a PDF to match or create a building for this customer.
        </p>
      ) : null}

      {issueStep || failedStep ? (
        <IssueProgress current={issueStep} failed={failedStep} />
      ) : null}

      {failedStep === "upload" && supabaseError ? (
        <UnexpectedPdfError
          supabaseError={supabaseError}
          supportEmail={supportEmail}
          pending={pendingUpload}
          onRetry={() => void retryPdfUpload()}
        />
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : null}
      {result ? <p className="text-sm text-emerald-300">{result}</p> : null}

      <button
        type="submit"
        disabled={loading || reading || credits < 1 || (!canMint && !pendingUpload)}
        className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {loading
          ? issueStep === "upload"
            ? "Uploading PDF…"
            : issueStep === "transfer"
              ? "Transferring…"
              : "Issuing certificate…"
          : reading
            ? "Reading report…"
            : pendingUpload
              ? "Retry PDF upload"
              : credits < 1
                ? "No issuance credits"
                : "Issue certificate"}
      </button>
    </form>
  );
}
