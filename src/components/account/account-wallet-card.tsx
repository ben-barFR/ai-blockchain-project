"use client";

import { useState } from "react";
import { SwitchWalletButton } from "@/components/account/switch-wallet-button";

export function AccountWalletCard({
  initialAddress,
  initialPrivateKey,
  initialSource,
}: {
  initialAddress: string;
  initialPrivateKey: string | null;
  initialSource: string;
}) {
  const [address, setAddress] = useState(initialAddress);
  const [privateKey, setPrivateKey] = useState(initialPrivateKey);
  const [source, setSource] = useState(initialSource);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(label: string, value: string) {
    void navigator.clipboard.writeText(value);
    setCopied(label);
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-lg font-medium">Ethereum wallet</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {source === "linked"
          ? "This account is linked to a wallet you already control."
          : "A wallet was created for you at registration. Import the private key into MetaMask if you want to use it there."}
      </p>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-[var(--muted)]">Address</p>
          <p className="break-all font-mono">{address}</p>
          <button
            type="button"
            onClick={() => copy("address", address)}
            className="mt-1 text-xs text-[var(--accent-hover)] hover:underline"
          >
            {copied === "address" ? "Copied" : "Copy address"}
          </button>
        </div>
        {privateKey ? (
          <div>
            <p className="text-[var(--muted)]">Private key (generated wallet)</p>
            <p className="break-all font-mono text-xs">{privateKey}</p>
            <button
              type="button"
              onClick={() => copy("key", privateKey)}
              className="mt-1 text-xs text-[var(--accent-hover)] hover:underline"
            >
              {copied === "key" ? "Copied" : "Copy private key"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium">Switch to an existing wallet</p>
        <SwitchWalletButton
          onSwitched={(next) => {
            setAddress(next);
            setPrivateKey(null);
            setSource("linked");
          }}
        />
      </div>
    </section>
  );
}
