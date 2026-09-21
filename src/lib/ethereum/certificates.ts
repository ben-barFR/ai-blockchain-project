import { createPublicClient, http, isAddress, type Address, type Hex } from "viem";
import { COMPONENT_INDEX, COMPONENT_KINDS, type ComponentKind } from "@/lib/certificates/constants";
import {
  getCertificateContract,
  getChain,
  getPublicClient,
  getRpcUrl,
  isContractConfigured,
} from "@/lib/ethereum/client";

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

function normalizeBuildingLookup(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function readTokensByBuildingId(buildingId: string) {
  const wanted = normalizeBuildingLookup(buildingId);
  if (!wanted) return [];

  const prefix = buildingId.trim().slice(0, 2).toUpperCase();
  if (/^[A-Z]{2}$/.test(prefix)) {
    const indexed = await readTokensByBuilding(prefix, buildingId.trim());
    if (indexed.length > 0) return indexed;
  }

  const client = getPublicClient();
  const contract = getCertificateContract();
  const tokenIds: bigint[] = [];
  const batchSize = 10n;
  let start = 1n;
  const maxId = 1000n;

  while (start <= maxId) {
    const ids = Array.from({ length: Number(batchSize) }, (_, index) => start + BigInt(index));
    const rows = await Promise.all(
      ids.map(async (tokenId) => {
        try {
          const meta = await client.readContract({
            ...contract,
            functionName: "getCertificateMeta",
            args: [tokenId],
          });
          return { tokenId, buildingId: meta[0] };
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
      if (normalizeBuildingLookup(row.buildingId) === wanted) {
        tokenIds.push(row.tokenId);
      }
    }
    if (reachedEnd) break;
    start += batchSize;
  }

  return tokenIds;
}

export async function readTokensByPostalAddress(postalAddress: string) {
  const wanted = normalizeBuildingLookup(postalAddress);
  if (!wanted) return [];

  const client = getPublicClient();
  const contract = getCertificateContract();
  const tokenIds: bigint[] = [];
  const batchSize = 10n;
  let start = 1n;
  const maxId = 1000n;

  while (start <= maxId) {
    const ids = Array.from({ length: Number(batchSize) }, (_, index) => start + BigInt(index));
    const rows = await Promise.all(
      ids.map(async (tokenId) => {
        try {
          const meta = await client.readContract({
            ...contract,
            functionName: "getCertificateMeta",
            args: [tokenId],
          });
          return { tokenId, postalAddress: meta[2] };
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
      if (normalizeBuildingLookup(row.postalAddress) === wanted) {
        tokenIds.push(row.tokenId);
      }
    }
    if (reachedEnd) break;
    start += batchSize;
  }

  return tokenIds;
}

export async function verifyOnChainHash(tokenId: bigint, kind: ComponentKind, reportHash: Hex) {
  const client = getPublicClient();
  return client.readContract({
    ...getCertificateContract(),
    functionName: "verifyReportHash",
    args: [tokenId, COMPONENT_INDEX[kind], reportHash],
  });
}

export function createBrowserPublicClient() {
  return createPublicClient({
    chain: getChain(),
    transport: http(getRpcUrl()),
  });
}
