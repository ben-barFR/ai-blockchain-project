"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PdfPicker } from "@/components/certificates/pdf-picker";
import { IssueBuildingBlock } from "@/components/issuers/issue-building-block";
import { IssueProgress, type IssueStep } from "@/components/issuers/issue-progress";
import { IssueTypeCheckboxes } from "@/components/issuers/issue-type-checkboxes";
import {
  UnexpectedPdfError,
  type PendingPdfUpload,
} from "@/components/issuers/unexpected-pdf-error";
import type { CustomerRecord } from "@/components/issuers/customer-form";
import { type ComponentKind } from "@/lib/certificates/constants";
import { hashFile } from "@/lib/certificates/hash";
import { parseReportPdf, validateReportPdf } from "@/lib/certificates/parse-report-client";
import { uniqueComponentKinds } from "@/lib/certificates/report-file";
import {
  findMatchingBuilding,
  type CustomerBuilding,
} from "@/lib/issuers/buildings";
import {
  clearIssueDraft,
  pageWasReloaded,
  readIssueDraft,
  readIssueFile,
  saveIssueFile,
  writeIssueDraft,
  type IssueParsedReport,
} from "@/lib/issuers/issue-draft";

type ParsedReport = IssueParsedReport;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      const nextParsed = await parseReportPdf(nextFile);
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
    const invalid = validateReportPdf(nextFile);
    if (invalid) {
      setError(invalid);
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
        <IssueTypeCheckboxes types={types} disabled={reading} onToggle={toggleType} />
      ) : null}

      {showAfterPdf ? (
        <IssueBuildingBlock
          selectedBuilding={selectedBuilding}
          parsed={parsed}
          changingBuilding={changingBuilding}
          pickerBuildingId={pickerBuildingId}
          activeBuildings={activeBuildings}
          newBuildingHref={newBuildingHref}
          onPickerChange={setPickerBuildingId}
          onSelect={() => {
            setManualBuildingId(pickerBuildingId);
            setSelectedBuildingId(pickerBuildingId);
            setChangingBuilding(false);
          }}
          onStartChange={() => {
            setPickerBuildingId(selectedBuildingId);
            setChangingBuilding(true);
          }}
          onPersistDraft={() => {
            void persistDraft();
          }}
        />
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
