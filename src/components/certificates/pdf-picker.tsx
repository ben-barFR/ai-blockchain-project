"use client";

export function PdfPicker({
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
