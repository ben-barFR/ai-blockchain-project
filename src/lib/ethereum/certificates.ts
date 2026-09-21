import { isAddress, type Address, type Hex } from "viem";
import { normalizeBuildingField } from "@/lib/certificates/building-normalize";
import { COMPONENT_INDEX, COMPONENT_KINDS, type ComponentKind } from "@/lib/certificates/constants";
import {
  getCertificateContract,
  getPublicClient,
  isContractConfigured,
} from "@/lib/ethereum/client";

/** Free Alchemy JSON-RPC batches of 10 are reliable. Scan getCertificateMeta instead of eth_getLogs (10-block range limit). */
export const TOKEN_SCAN_BATCH_SIZE = BigInt(10);
/** Sequential scan stops here if tokens still exist; raise if mint counts grow past this. */
export const TOKEN_SCAN_MAX_ID = BigInt(1000);

export type OnChainComponent = {
  kind: ComponentKind;
  present: boolean;
  issuedAt: number;
  expiresAt: number;
  invalidated: boolean;
  reportHash: Hex;
  valid: boolean;
};

export type OnChainCertificate = {
  tokenId: string;
  buildingId: string;
  countryCode: string;
  postalAddress: string;
  issuer: Address;
  issuerIdentifier: string;
  issuerRegistryUrl: string;
  mintedAt: number;
  holder: Address;
  components: OnChainComponent[];
};

export async function readCertificate(tokenId: bigint): Promise<OnChainCertificate> {
  const client = getPublicClient();
  const contract = getCertificateContract();
  const [meta, ...components] = await Promise.all([
    client.readContract({
      ...contract,
      functionName: "getCertificateMeta",
      args: [tokenId],
    }),
    ...COMPONENT_KINDS.map((kind) =>
      client.readContract({
        ...contract,
        functionName: "getComponent",
        args: [tokenId, COMPONENT_INDEX[kind]],
      }),
    ),
  ]);

  const [buildingId, countryCode, postalAddress, issuer, issuerIdentifier, issuerRegistryUrl, mintedAt, holder] =
    meta;

  return {
    tokenId: tokenId.toString(),
    buildingId,
    countryCode,
    postalAddress,
    issuer,
    issuerIdentifier,
    issuerRegistryUrl,
    mintedAt: Number(mintedAt),
    holder,
    components: COMPONENT_KINDS.map((kind, index) => {
      const [present, issuedAt, expiresAt, invalidated, reportHash, valid] = components[index];
      return {
        kind,
        present,
        issuedAt: Number(issuedAt),
        expiresAt: Number(expiresAt),
        invalidated,
        reportHash,
        valid,
      };
    }),
  };
}

export async function readTokensOf(holder: Address) {
  const client = getPublicClient();
  return client.readContract({
    ...getCertificateContract(),
    functionName: "tokensOf",
    args: [holder],
  });
}

export async function walletHoldsCertificates(address: string) {
  if (!isContractConfigured() || !isAddress(address)) return false;
  try {
    const tokenIds = await readTokensOf(address);
    return tokenIds.length > 0;
  } catch {
    return false;
  }
}

export async function readTokensByBuilding(countryCode: string, buildingId: string) {
  const client = getPublicClient();
  return client.readContract({
    ...getCertificateContract(),
    functionName: "tokensByBuilding",
    args: [countryCode, buildingId],
  });
}

async function scanTokenMetas(
  matches: (row: { buildingId: string; postalAddress: string }) => boolean,
) {
  const client = getPublicClient();
  const contract = getCertificateContract();
  const tokenIds: bigint[] = [];
  let start = BigInt(1);

  while (start <= TOKEN_SCAN_MAX_ID) {
    const ids = Array.from({ length: Number(TOKEN_SCAN_BATCH_SIZE) }, (_, index) => start + BigInt(index));
    const rows = await Promise.all(
      ids.map(async (tokenId) => {
        try {
          const meta = await client.readContract({
            ...contract,
            functionName: "getCertificateMeta",
            args: [tokenId],
          });
          return { tokenId, buildingId: meta[0], postalAddress: meta[2] };
        } catch {
          return null;
        }
      }),
    );

    let reachedEnd = false;
    for (const row of rows) {
      if (!row) {
        reachedEnd = true;
        break;
      }
      if (matches(row)) tokenIds.push(row.tokenId);
    }
    if (reachedEnd) break;
    start += TOKEN_SCAN_BATCH_SIZE;
  }

  return tokenIds;
}

export async function readTokensByBuildingId(buildingId: string) {
  const wanted = normalizeBuildingField(buildingId);
  if (!wanted) return [];

  const prefix = buildingId.trim().slice(0, 2).toUpperCase();
  if (/^[A-Z]{2}$/.test(prefix)) {
    const indexed = await readTokensByBuilding(prefix, buildingId.trim());
    if (indexed.length > 0) return [...indexed];
  }

  return scanTokenMetas((row) => normalizeBuildingField(row.buildingId) === wanted);
}

export async function readTokensByPostalAddress(postalAddress: string) {
  const wanted = normalizeBuildingField(postalAddress);
  if (!wanted) return [];
  return scanTokenMetas((row) => normalizeBuildingField(row.postalAddress) === wanted);
}

export async function resolveTokenIdsForBuilding(input: {
  countryCode?: string;
  buildingId?: string;
  postalAddress?: string;
}) {
  const countryCode = (input.countryCode || "").trim().toUpperCase();
  const buildingId = (input.buildingId || "").trim();
  const postalAddress = (input.postalAddress || "").trim();

  if (countryCode && buildingId) {
    const indexed = await readTokensByBuilding(countryCode, buildingId);
    if (indexed.length > 0) return [...indexed];
  }
  if (buildingId) {
    const byId = await readTokensByBuildingId(buildingId);
    if (byId.length > 0) return byId;
  }
  if (postalAddress) {
    return readTokensByPostalAddress(postalAddress);
  }
  return [];
}

export async function verifyOnChainHash(tokenId: bigint, kind: ComponentKind, reportHash: Hex) {
  const client = getPublicClient();
  return client.readContract({
    ...getCertificateContract(),
    functionName: "verifyReportHash",
    args: [tokenId, COMPONENT_INDEX[kind], reportHash],
  });
}
