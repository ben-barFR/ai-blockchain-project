import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getCertificateContract,
  getPublicClient,
  isContractConfigured,
} from "@/lib/ethereum/client";
import { getMinterClient } from "@/lib/ethereum/minter";

export async function POST(request: Request) {
  if (!isContractConfigured()) {
    return NextResponse.json({ error: "Contract not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { tokenId?: string };
  if (!body.tokenId) {
    return NextResponse.json({ error: "tokenId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: issuer } = await admin
    .from("issuers")
    .select("id, status, wallet_address")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!issuer || issuer.status !== "approved") {
    return NextResponse.json({ error: "Only the issuing company can invalidate planning" }, { status: 403 });
  }

  const publicClient = getPublicClient();
  const meta = await publicClient.readContract({
    ...getCertificateContract(),
    functionName: "getCertificateMeta",
    args: [BigInt(body.tokenId)],
  });
  const onchainIssuer = meta[3];
  if (onchainIssuer.toLowerCase() !== issuer.wallet_address.toLowerCase()) {
    return NextResponse.json({ error: "This certificate was not issued by your company" }, { status: 403 });
  }

  const wallet = getMinterClient();
  const hash = await wallet.writeContract({
    ...getCertificateContract(),
    functionName: "invalidatePlanning",
    args: [BigInt(body.tokenId)],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  return NextResponse.json({ ok: true, txHash: hash });
}
