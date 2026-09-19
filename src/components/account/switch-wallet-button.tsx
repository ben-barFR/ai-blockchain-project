"use client";

import { useAccount, useConnect, useSignMessage } from "wagmi";
import { useState } from "react";
import { switchWalletMessage } from "@/lib/ethereum/wallet";

export function SwitchWalletButton({
  onSwitched,
}: {
  onSwitched: (address: string) => void;
}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { signMessageAsync, isPending: signing } = useSignMessage();
  const [error, setError] = useState<string | null>(null);
  const injected = connectors.find((connector) => connector.id === "injected") || connectors[0];

  async function attach() {
    setError(null);
    if (!address) return;
    try {
      const signature = await signMessageAsync({
        message: switchWalletMessage(address),
      });
      const response = await fetch("/api/account/wallet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });
      const payload = (await response.json()) as { address?: string; error?: string };
      if (!response.ok || !payload.address) {
        setError(payload.error || "Could not switch wallet");
        return;
      }
      onSwitched(payload.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signature rejected");
    }
  }

  return (
    <div className="space-y-2">
      {!isConnected ? (
        <button
          type="button"
          disabled={!injected || isPending}
          onClick={() => injected && connect({ connector: injected })}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--muted)] disabled:opacity-60"
        >
          {isPending ? "Connecting…" : "Connect an existing wallet"}
        </button>
      ) : (
        <button
          type="button"
          disabled={signing}
          onClick={attach}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {signing ? "Confirm in wallet…" : `Use ${address?.slice(0, 6)}…${address?.slice(-4)}`}
        </button>
      )}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
