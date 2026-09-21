/**
 * Greenfield Supabase bootstrap for BLDCRT.
 *
 * 1. Applies supabase/init_schema.sql (tables, RLS, triggers, storage bucket)
 * 2. Creates Auth users for every address in ADMIN_EMAILS with a dummy password
 *
 * Usage:
 *   npm run init:supabase
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_EMAILS
 * and one of:
 *   DATABASE_URL / SUPABASE_DB_URL  — Postgres connection string (Dashboard → Database → URI)
 *   or a linked Supabase CLI project (falls back to `supabase db query --linked`)
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_FILE = resolve(ROOT, "supabase/init_schema.sql");

/** Change after first login. Demo flows also cover issuer/owner via /demo. */
const ADMIN_DUMMY_PASSWORD = "ChangeMe123!";

function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function applySchema() {
  const dbUrl =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    "";

  const args = ["supabase", "db", "query", "--file", SCHEMA_FILE, "--yes"];
  if (dbUrl) {
    args.push("--db-url", dbUrl);
    console.log("Applying schema via DATABASE_URL…");
  } else {
    args.push("--linked");
    console.log("Applying schema via linked Supabase project…");
  }

  const result = spawnSync("npx", args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        "Schema apply failed.",
        "Set DATABASE_URL (or SUPABASE_DB_URL) to your Postgres URI,",
        "or run `npx supabase link` and retry.",
        `You can also paste ${SCHEMA_FILE} into the Supabase SQL editor.`,
      ].join(" "),
    );
  }
  console.log("Schema applied.");
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureAdmins() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const emails = adminEmails();

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  if (emails.length === 0) {
    throw new Error("ADMIN_EMAILS is empty — add at least one admin email in .env.local");
  }

  const schema = readFileSync(SCHEMA_FILE, "utf8");
  if (!schema.includes("create table if not exists public.profiles")) {
    throw new Error(`Unexpected schema file at ${SCHEMA_FILE}`);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Ensuring ${emails.length} admin user(s) with password ${ADMIN_DUMMY_PASSWORD}`);

  for (const email of emails) {
    const existing = await findUserByEmail(admin, email);

    if (existing) {
      const { error: updateAuthError } = await admin.auth.admin.updateUserById(existing.id, {
        password: ADMIN_DUMMY_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...existing.user_metadata,
          user_type: "admin",
          full_name: existing.user_metadata?.full_name || "Admin",
        },
      });
      if (updateAuthError) throw updateAuthError;

      const { error: profileError } = await admin.from("profiles").upsert(
        {
          id: existing.id,
          email,
          full_name: existing.user_metadata?.full_name || "Admin",
          user_type: "admin",
        },
        { onConflict: "id" },
      );
      if (profileError) throw profileError;
      console.log(`  updated admin: ${email}`);
      continue;
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: ADMIN_DUMMY_PASSWORD,
      email_confirm: true,
      user_metadata: { user_type: "admin", full_name: "Admin" },
    });
    if (createError) throw createError;
    if (!created.user) throw new Error(`createUser returned no user for ${email}`);

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: created.user.id,
        email,
        full_name: "Admin",
        user_type: "admin",
      },
      { onConflict: "id" },
    );
    if (profileError) throw profileError;
    console.log(`  created admin: ${email}`);
  }
}

async function main() {
  const skipSchema = process.argv.includes("--admins-only");
  if (!skipSchema) {
    applySchema();
  } else {
    console.log("Skipping schema (--admins-only).");
  }
  await ensureAdmins();
  console.log("Done. Sign in with an ADMIN_EMAILS address and ChangeMe123!, or use /demo.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
