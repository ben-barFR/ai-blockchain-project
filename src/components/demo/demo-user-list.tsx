"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { labelForUserType } from "@/lib/auth/portal";
import type { DeletedAccount, DemoUser } from "@/lib/demo/types";
import { explorerAddressUrl } from "@/lib/ethereum/explorer";
import { createClient } from "@/lib/supabase/client";

export function DemoUserList() {
  const router = useRouter();
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [deletedAccounts, setDeletedAccounts] = useState<DeletedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/demo/users")
      .then(async (response) => {
        const payload = (await response.json()) as {
          users?: DemoUser[];
          deletedAccounts?: DeletedAccount[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Could not load users");
        setUsers(payload.users || []);
        setDeletedAccounts(payload.deletedAccounts || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function loginAs(userId: string) {
    setActingId(userId);
    setError(null);
    const response = await fetch("/api/demo/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const payload = (await response.json()) as { portal?: string; error?: string };
    setActingId(null);
    if (!response.ok) {
      setError(payload.error || "Login as failed");
      return;
    }
    router.push(payload.portal || "/");
    router.refresh();
  }

  async function deleteAccount(user: DemoUser) {
    const label = user.fullName || user.email || "this account";
    const confirmed = window.confirm(
      `Delete ${label} from the platform? The wallet still exists on-chain. Its address will be archived at the bottom of this page.`,
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    setError(null);
    const response = await fetch(`/api/demo/users/${user.id}`, { method: "DELETE" });
    const payload = (await response.json()) as {
      error?: string;
      deleted?: { walletAddresses?: string[] };
    };
    setDeletingId(null);
    if (!response.ok) {
      setError(payload.error || "Could not delete account");
      return;
    }

    setUsers((current) => current.filter((item) => item.id !== user.id));
    setDeletedAccounts((current) => [
      {
        id: user.id,
        email: user.email || null,
        fullName: user.fullName || null,
        userType: user.userType,
        walletAddresses: payload.deleted?.walletAddresses || (user.walletAddress ? [user.walletAddress] : []),
        deletedAt: new Date().toISOString(),
      },
      ...current,
    ]);

    const supabase = createClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    if (sessionUser?.id === user.id) {
      await supabase.auth.signOut();
      router.refresh();
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading users…</p>;
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-medium">Accounts</h2>
        <div className="mt-4 space-y-3">
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-[var(--card)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Account</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Wallet</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-medium">{user.fullName || user.email}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{labelForUserType(user.userType)}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{user.email}</td>
                    <td className="px-4 py-3 font-mono text-xs break-all">
                      {user.walletAddress || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => loginAs(user.id)}
                          disabled={actingId === user.id || deletingId === user.id}
                          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
                        >
                          {actingId === user.id ? "Signing in…" : "Login as"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteAccount(user)}
                          disabled={actingId === user.id || deletingId === user.id}
                          className="rounded-lg border border-red-400/40 px-3 py-1.5 text-sm text-red-200 hover:border-red-300 disabled:opacity-60"
                        >
                          {deletingId === user.id ? "Deleting…" : "Delete account"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No accounts on the platform.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium">Deleted accounts</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Archived wallet addresses from accounts removed from the platform. The wallets still exist
          on-chain.
        </p>
        <div className="mt-4">
          {deletedAccounts.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No deleted accounts yet.</p>
          ) : (
            <ul className="space-y-3">
              {deletedAccounts.map((account) => (
                <li
                  key={account.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{account.fullName || account.email || "Deleted account"}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {labelForUserType(account.userType)}
                        {account.email ? ` · ${account.email}` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(account.deletedAt).toLocaleString()}
                    </p>
                  </div>
                  {account.walletAddresses.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">No wallet address on file.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {account.walletAddresses.map((address) => {
                        const explorer = explorerAddressUrl(address);
                        return (
                          <li key={address} className="font-mono text-xs break-all">
                            {explorer ? (
                              <a
                                href={explorer}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[var(--accent-hover)] hover:underline"
                              >
                                {address}
                              </a>
                            ) : (
                              address
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
