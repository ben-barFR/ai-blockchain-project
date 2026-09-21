import {
  COMPONENT_EXPIRY,
  COMPONENT_KINDS,
  COMPONENT_LABELS,
  type ComponentKind,
} from "@/lib/certificates/constants";

export function IssueTypeCheckboxes({
  types,
  disabled,
  onToggle,
}: {
  types: ComponentKind[];
  disabled?: boolean;
  onToggle: (kind: ComponentKind) => void;
}) {
  return (
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
            onChange={() => onToggle(kind)}
            disabled={disabled}
          />
          <span>{COMPONENT_LABELS[kind]}</span>
          <span className="text-[var(--muted)]">· {COMPONENT_EXPIRY[kind]}</span>
        </label>
      ))}
    </fieldset>
  );
}
