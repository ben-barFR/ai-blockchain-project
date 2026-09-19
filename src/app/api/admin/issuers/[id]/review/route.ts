import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getCertificateContract,
  getPublicClient,
  isContractConfigured,
} from "@/lib/ethereum/client";
import { getMinterClient } from "@/lib/ethereum/minter";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: "approved" | "rejected";
    notes?: string;
  };

  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await createAdminClient().from("issuers").select("*").eq("id", id).maybeSingle();
  if (!data) {
    return NextResponse.json({ error: "Issuer not found" }, { status: 404 });
  }
  return reviewIssuer(data, body.status, body.notes || "");
}

async function reviewIssuer(
  issuer: {
    id: string;
    wallet_address: string;
  },
  status: "approved" | "rejected",
  notes: string,
) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  let onchainApproved = false;

  if (status === "approved" && isContractConfigured()) {
    const wallet = getMinterClient();
    const publicClient = getPublicClient();
    const hash = await wallet.writeContract({
      ...getCertificateContract(),
      functionName: "setApprovedIssuer",
      args: [issuer.wallet_address as `0x${string}`, true],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    onchainApproved = true;
  }

  const { error } = await admin
    .from("issuers")
    .update({
      status,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
      onchain_approved: onchainApproved,
    })
    .eq("id", issuer.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, onchainApproved });
}
