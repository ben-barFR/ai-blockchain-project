import { NextResponse } from "next/server";
import { isHex } from "viem";
import { COMPONENT_LABELS } from "@/lib/certificates/constants";
import { zeroHash } from "@/lib/certificates/format";
import { normalizeBuildingField } from "@/lib/issuers/buildings";
import { isContractConfigured } from "@/lib/ethereum/client";
import {
  readCertificate,
  readTokensByBuilding,
  readTokensByBuildingId,
  readTokensByPostalAddress,
} from "@/lib/ethereum/certificates";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isContractConfigured()) {
    return NextResponse.json({ error: "Certificate contract is not configured" }, { status: 503 });
  }

  const body = (await request.json()) as {
    buildingId?: string;
    postalAddress?: string;
    countryCode?: string;
    reportHash?: string;
  };

  const buildingId = (body.buildingId || "").trim();
  const postalAddress = (body.postalAddress || "").trim();
  const countryCode = (body.countryCode || "").trim().toUpperCase();

  if (!buildingId && !postalAddress) {
    return NextResponse.json({ error: "Building ID or postal address is required" }, { status: 400 });
  }
  if (!body.reportHash || !isHex(body.reportHash) || body.reportHash.length !== 66) {
    return NextResponse.json({ error: "Invalid report hash" }, { status: 400 });
  }

  try {
    let tokenIds: bigint[] = [];
    if (countryCode && buildingId) {
      tokenIds = await readTokensByBuilding(countryCode, buildingId);
    }
    if (tokenIds.length === 0 && buildingId) {
      tokenIds = await readTokensByBuildingId(buildingId);
    }
    if (tokenIds.length === 0 && postalAddress) {
      tokenIds = await readTokensByPostalAddress(postalAddress);
    }

    if (tokenIds.length === 0) {
      return NextResponse.json({ found: false, authentic: false, matches: [] });
    }

    const certificates = await Promise.all(tokenIds.map((tokenId) => readCertificate(tokenId)));
    const wantedAddress = postalAddress ? normalizeBuildingField(postalAddress) : "";
    const addressed = wantedAddress
      ? certificates.filter((certificate) => normalizeBuildingField(certificate.postalAddress) === wantedAddress)
      : [];
    const candidates = addressed.length > 0 ? addressed : certificates;

    const reportHash = body.reportHash.toLowerCase();
    const matches = candidates.flatMap((certificate) =>
      certificate.components
        .filter((component) => component.present && !zeroHash(component.reportHash))
        .filter((component) => component.reportHash.toLowerCase() === reportHash)
        .map((component) => ({
          tokenId: certificate.tokenId,
          buildingId: certificate.buildingId,
          postalAddress: certificate.postalAddress,
          countryCode: certificate.countryCode,
          component: component.kind,
          componentLabel: COMPONENT_LABELS[component.kind],
          valid: component.valid,
          invalidated: component.invalidated,
        })),
    );

    if (matches.length === 0) {
      return NextResponse.json({ found: true, authentic: false, matches: [] });
    }

    return NextResponse.json({ found: true, authentic: true, matches });
  } catch {
    return NextResponse.json({ error: "Could not query the contract" }, { status: 500 });
  }
}
