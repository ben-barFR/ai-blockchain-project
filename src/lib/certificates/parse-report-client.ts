import { uniqueComponentKinds, isPdfFile, MAX_REPORT_PDF_BYTES } from "@/lib/certificates/report-file";
import type { ComponentKind } from "@/lib/certificates/constants";

export type ParsedReportFields = {
  buildingId: string;
  postalAddress: string;
  countryCode: string;
  types: ComponentKind[];
};

export function validateReportPdf(file: File) {
  if (!isPdfFile(file)) return "Upload a PDF report";
  if (file.size > MAX_REPORT_PDF_BYTES) return "PDF must be 12 MB or smaller";
  return null;
}

export async function parseReportPdf(file: File): Promise<ParsedReportFields> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch("/api/certificates/parse-report", {
    method: "POST",
    body: form,
  });
  const payload = (await response.json()) as ParsedReportFields & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Could not read this PDF");
  }
  return {
    buildingId: payload.buildingId || "",
    postalAddress: payload.postalAddress || "",
    countryCode: payload.countryCode || "FR",
    types: uniqueComponentKinds(payload.types || []),
  };
}
