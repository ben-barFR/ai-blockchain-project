import { NextResponse } from "next/server";
import { listDeletedAccountEmails, listDeletedAccounts } from "@/lib/demo/accounts";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProfileWallet } from "@/lib/ethereum/profile-wallet";

const DEMO_USERS = [
  {
    email: "issuer@bldcrt.demo",
    password: "DemoPass123!",
    user_type: "issuer",
    full_name: "Demo Issuer",
  },
  {
    email: "owner@bldcrt.demo",
    password: "DemoPass123!",
    user_type: "owner",
    full_name: "Demo Owner",
  },
  {
    email: "admin@bldcrt.demo",
    password: "DemoPass123!",
    user_type: "admin",
    full_name: "Demo Admin",
  },
] as const;

async function ensureDemoUsers() {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;

  const existing = new Set((data.users || []).map((user) => user.email?.toLowerCase()));
  const deletedEmails = await listDeletedAccountEmails();
  for (const demo of DEMO_USERS) {
    if (existing.has(demo.email) || deletedEmails.has(demo.email)) continue;
    const created = await admin.auth.admin.createUser({
      email: demo.email,
      password: demo.password,
      email_confirm: true,
      user_metadata: { full_name: demo.full_name, user_type: demo.user_type },
    });
    if (created.data.user) {
      await admin.from("profiles").upsert({
        id: created.data.user.id,
        email: demo.email,
        full_name: demo.full_name,
        user_type: demo.user_type,
      });
      await ensureProfileWallet(admin, created.data.user.id);
    }
  }

  const { data: profiles } = await admin.from("profiles").select("id, wallet_address");
  for (const profile of profiles || []) {
    if (!profile.wallet_address) {
      await ensureProfileWallet(admin, profile.id);
    }
  }
}

export async function GET() {
  try {
    await ensureDemoUsers();
    const admin = createAdminClient();
    const [{ data: authData }, { data: profiles }] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 200 }),
      admin.from("profiles").select("id, email, full_name, user_type, wallet_address"),
    ]);

    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const users = (authData.users || []).map((user) => {
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email,
        fullName: profile?.full_name || user.user_metadata?.full_name || "",
        userType: profile?.user_type || user.user_metadata?.user_type || "owner",
        walletAddress: profile?.wallet_address || null,
      };
    });

    const deletedAccounts = await listDeletedAccounts();
    return NextResponse.json({ users, deletedAccounts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not list users" },
      { status: 500 },
    );
  }
}
