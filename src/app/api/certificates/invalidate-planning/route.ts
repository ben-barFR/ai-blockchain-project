import { NextResponse } from "next/server";
import {
  getCertificateContract,
  getPublicClient,
  isContractConfigured,
} from "@/lib/ethereum/client";
import { getMinterClient } from "@/lib/ethereum/minter";
import { requireApprovedIssuer } from "@/lib/issuers/current-issuer";

export async function POST(request: Request) {
  if (!isContractConfigured()) {
    return NextResponse.json({ error: "Contract not configured" }, { status: 503 });
  }

  const { issuer, error: issuerError, status: issuerStatus } = await requireApprovedIssuer();
  if (issuerError || !issuer) {
    return NextResponse.json(
      { error: issuerError === "Unauthorized" ? "Unauthorized" : "Only the issuing company can invalidate planning" },
      { status: issuerStatus },
    );
  }
  if (!issuer.wallet_address) {
    return NextResponse.json({ error: "Issuer wallet is missing" }, { status: 400 });
  }

  const body = (await request.json()) as { tokenId?: string };
  if (!body.tokenId) {
    return NextResponse.json({ error: "tokenId required" }, { status: 400 });
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
