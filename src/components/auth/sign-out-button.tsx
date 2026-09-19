"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({
  variant = "button",
  email,
}: {
  variant?: "button" | "link";
  email?: string | null;
}) {
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState(email || "");

  useEffect(() => {
    if (email) {
      setSessionEmail(email);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setSessionEmail(data.user?.email || "");
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-3">
      {sessionEmail ? (
        <span className="max-w-[16rem] truncate text-sm text-[var(--muted)]" title={sessionEmail}>
          {sessionEmail}
        </span>
      ) : null}
      <button
        type="button"
        onClick={signOut}
        className={
          variant === "link"
            ? "rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            : "rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:border-[var(--muted)] hover:text-[var(--foreground)]"
        }
      >
        Sign out
      </button>
    </span>
  );
}
