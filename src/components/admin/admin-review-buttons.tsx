"use client";

import { useState } from "react";

export function AdminReviewButtons({
  issuerId,
}: {
  issuerId: string;
}) {
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function review(nextStatus: "approved" | "rejected") {
    setLoading(true);
    setStatus(null);
    const response = await fetch(`/api/admin/issuers/${issuerId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, notes }),
    });
    const payload = (await response.json()) as { error?: string; onchainApproved?: boolean };
    setLoading(false);
    if (!response.ok) {
      setStatus(payload.error || "Review failed");
      return;
    }
    setStatus(
      nextStatus === "approved"
        ? `Approved${payload.onchainApproved ? " and registered on-chain" : " in the database"}`
        : "Rejected",
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Review notes (registry check, accreditation, …)"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => review("approved")}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => review("rejected")}
          className="rounded-lg bg-red-800 px-3 py-1.5 text-sm text-white disabled:opacity-60"
        >
          Reject
        </button>
      </div>
      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
