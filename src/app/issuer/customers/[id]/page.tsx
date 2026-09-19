import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerDetailsForm } from "@/components/issuers/customer-details-form";
import { IssuerShell } from "@/components/layout/issuer-shell";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/ethereum/explorer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function IssuerCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/issuer");

  const { data: issuer } = await supabase
    .from("issuers")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!issuer || issuer.status !== "approved") redirect("/issuer/customers");

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("issuer_customers")
    .select("id, full_name, email, wallet_address")
    .eq("id", id)
    .eq("issuer_id", issuer.id)
    .maybeSingle();
  if (!customer) notFound();

  const { data: issuances } = await admin
    .from("certificate_issuances")
    .select(
      "id, token_id, tx_hash, building_id, postal_address, country_code, status, created_at",
    )
    .eq("issuer_id", issuer.id)
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  const name = customer.full_name || customer.email || "Customer";
  const walletExplorer = customer.wallet_address ? explorerAddressUrl(customer.wallet_address) : null;

  return (
    <IssuerShell email={user.email}>
      <p className="text-sm text-[var(--muted)]">
        <Link href="/issuer/customers" className="hover:text-[var(--foreground)]">
          My customers
        </Link>
        <span className="mx-2">/</span>
        <span>{name}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{name}</h1>
          {customer.email ? <p className="mt-2 text-[var(--muted)]">{customer.email}</p> : null}
          <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">
            {walletExplorer ? (
              <a
                href={walletExplorer}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-hover)] hover:underline"
              >
                {customer.wallet_address}
              </a>
            ) : (
              customer.wallet_address || "No destination wallet yet"
            )}
          </p>
        </div>
        {customer.wallet_address ? (
          <Link
            href={`/issuer/issue?customer=${customer.id}`}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Issue certificate
          </Link>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-medium">Issued certificates</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Building identifier, address, and mint transaction for each token sent to this customer.
        </p>
        {(issuances || []).length === 0 ? (
          <p className="mt-6 text-sm text-[var(--muted)]">No certificates issued to this customer yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {(issuances || []).map((issuance) => {
              const txUrl = issuance.tx_hash ? explorerTxUrl(issuance.tx_hash) : null;
              return (
                <li
                  key={issuance.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium">
                      {issuance.token_id ? (
                        <Link
                          href={`/registry/${issuance.token_id}`}
                          className="hover:underline"
                        >
                          Token #{issuance.token_id}
                        </Link>
                      ) : (
                        "Token pending"
                      )}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {issuance.status}
                      {issuance.created_at
                        ? ` · ${new Date(issuance.created_at).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="text-[var(--muted)]">Building ID</dt>
                      <dd>{issuance.building_id || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Building address</dt>
                      <dd className="whitespace-pre-line">
                        {issuance.postal_address || "—"}
                        {issuance.country_code ? ` (${issuance.country_code})` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Transaction ID</dt>
                      <dd className="break-all font-mono text-xs">
                        {issuance.tx_hash ? (
                          txUrl ? (
                            <a
                              href={txUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--accent-hover)] hover:underline"
                            >
                              {issuance.tx_hash}
                            </a>
                          ) : (
                            issuance.tx_hash
                          )
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <CustomerDetailsForm
        customerId={customer.id}
        initialName={customer.full_name || ""}
        initialEmail={customer.email || ""}
      />
    </IssuerShell>
  );
}
