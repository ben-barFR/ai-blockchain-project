import { DemoPendingCustomers } from "@/components/demo/demo-pending-customers";
import { DemoUserList } from "@/components/demo/demo-user-list";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function DemoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <SiteHeader email={user?.email} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Demo users</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Switch account without typing a password. Demo issuer, owner, and admin
          accounts are created automatically if they are missing.
        </p>
        <section className="mt-8">
          <h2 className="text-xl font-medium">Pending customers</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Onboarding emails waiting for the owner to register. Opening the link signs out first,
            then opens the same destination as the email.
          </p>
          <div className="mt-4">
            <DemoPendingCustomers />
          </div>
        </section>
        <div className="mt-10">
          <DemoUserList />
        </div>
      </main>
    </>
  );
}
