import { COMPONENT_KINDS, type ComponentKind } from "@/lib/certificates/constants";

export const MAX_REPORT_PDF_BYTES = 12 * 1024 * 1024;

export function isPdfFile(file: File) {
  const type = file.type.toLowerCase();
  return (
    type === "application/pdf" ||
    type === "application/x-pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export function uniqueComponentKinds(values: unknown): ComponentKind[] {
  const selected = new Set<ComponentKind>();
  if (!Array.isArray(values)) return [];
  for (const value of values) {
    if (typeof value === "string" && COMPONENT_KINDS.includes(value as ComponentKind)) {
      selected.add(value as ComponentKind);
    }
  }
  return COMPONENT_KINDS.filter((kind) => selected.has(kind));
}
