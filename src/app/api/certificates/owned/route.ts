import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { isContractConfigured } from "@/lib/ethereum/client";
import { readCertificate, readTokensOf } from "@/lib/ethereum/certificates";

export async function GET(request: NextRequest) {
  if (!isContractConfigured()) {
    return NextResponse.json({ error: "Certificate contract is not configured" }, { status: 503 });
  }
  const address = request.nextUrl.searchParams.get("address");
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Valid wallet address required" }, { status: 400 });
  }

  const tokenIds = await readTokensOf(address);
  const certificates = await Promise.all(tokenIds.map((tokenId) => readCertificate(tokenId)));
  return NextResponse.json({ certificates });
}
