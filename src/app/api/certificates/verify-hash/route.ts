import { NextResponse } from "next/server";
import { isHex } from "viem";
import { COMPONENT_KINDS, type ComponentKind } from "@/lib/certificates/constants";
import { isContractConfigured } from "@/lib/ethereum/client";
import { readCertificate, verifyOnChainHash } from "@/lib/ethereum/certificates";

export async function POST(request: Request) {
  if (!isContractConfigured()) {
    return NextResponse.json({ error: "Certificate contract is not configured" }, { status: 503 });
  }

  const body = (await request.json()) as {
    tokenId?: string;
    component?: ComponentKind;
    reportHash?: string;
  };

  if (!body.tokenId || !body.component || !COMPONENT_KINDS.includes(body.component)) {
    return NextResponse.json({ error: "tokenId and component are required" }, { status: 400 });
  }
  if (!body.reportHash || !isHex(body.reportHash) || body.reportHash.length !== 66) {
    return NextResponse.json({ error: "Invalid report hash" }, { status: 400 });
  }

  try {
    const [matches, certificate] = await Promise.all([
      verifyOnChainHash(BigInt(body.tokenId), body.component, body.reportHash),
      readCertificate(BigInt(body.tokenId)),
    ]);
    return NextResponse.json({
      matches,
      certificate: {
        tokenId: certificate.tokenId,
        buildingId: certificate.buildingId,
        postalAddress: certificate.postalAddress,
        countryCode: certificate.countryCode,
      },
    });
  } catch {
    return NextResponse.json({ error: "Certificate not found on-chain" }, { status: 404 });
  }
}
