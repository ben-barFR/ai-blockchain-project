import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { createClient } from "@/lib/supabase/server";

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
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name || profile?.email || user.email;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">Signed in as</p>
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
        </div>
        <SignOutButton />
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          Gemini agent
        </h2>
        <ChatPanel />
      </section>
    </main>
  );
}
