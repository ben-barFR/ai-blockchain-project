import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/supabase/admin";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, user_type")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name || profile?.email || user.email;
  const admin = isAdminUser(user.email, profile?.user_type);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">Signed in as</p>
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
        </div>
        <SignOutButton email={user.email} />
      </header>

      <section className="mb-10 grid gap-3 sm:grid-cols-2">
        <Link className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4" href="/issuer">
          Issuer portal
        </Link>
        <Link className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4" href="/owner">
          Owner portal
        </Link>
        <Link className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4" href="/registry">
          Public registry
        </Link>
        {admin ? (
          <Link className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4" href="/admin">
            Admin review
          </Link>
        ) : null}
      </section>

      <section className="flex min-h-0 flex-1 flex-col">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          Gemini assistant
        </h2>
        <ChatPanel />
      </section>
    </main>
  );
}
