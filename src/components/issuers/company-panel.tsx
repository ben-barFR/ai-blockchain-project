"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IssuerRegisterForm } from "@/components/issuers/issuer-register-form";

type IssuerRecord = {
  company_name: string;
  country_code: string;
  company_identifier: string;
  website_url: string | null;
  accreditation_url: string | null;
  status: string;
  issuance_credits?: number | null;
};

export function CompanyPanel({
  issuer,
  profileWallet,
}: {
  issuer: IssuerRecord | null;
  profileWallet: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!issuer);

  if (editing) {
    return (
      <div>
        {issuer ? (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Edit company details</h2>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <h2 className="mb-4 text-lg font-medium">Register your company</h2>
        )}
        <IssuerRegisterForm
          defaults={issuer || undefined}
          profileWallet={profileWallet}
          submitLabel={issuer ? "Save company details" : "Save and continue"}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  if (!issuer) return null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{issuer.company_name}</h2>
          <p className="mt-1 text-sm text-emerald-300">Approved</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)]"
        >
          Edit
        </button>
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Country" value={issuer.country_code} />
        <Detail label="Company identifier" value={issuer.company_identifier} />
        <Detail
          label="Accreditation number"
          value={issuer.accreditation_url || "—"}
        />
        <div className="sm:col-span-2">
          <dt className="text-[var(--muted)]">Website</dt>
          <dd>
            {issuer.website_url ? (
              <a
                href={issuer.website_url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-[var(--accent-hover)] hover:underline"
              >
                {issuer.website_url}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[var(--muted)]">Company wallet</dt>
          <dd className="break-all font-mono text-xs">{profileWallet}</dd>
        </div>
      </dl>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
