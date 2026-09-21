export type IssueStep = "issue" | "transfer" | "upload";

const ISSUE_STEPS: { id: IssueStep; label: string }[] = [
  { id: "issue", label: "Issuing certificate" },
  { id: "transfer", label: "Transferring to the client" },
  { id: "upload", label: "Uploading PDF" },
];

export function IssueProgress({
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
