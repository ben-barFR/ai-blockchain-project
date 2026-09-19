import { createPublicClient, http, type Address, type Hex } from "viem";
import { COMPONENT_INDEX, COMPONENT_KINDS, type ComponentKind } from "@/lib/certificates/constants";
import {
  getCertificateContract,
  getChain,
  getPublicClient,
  getRpcUrl,
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

export async function readTokensByBuilding(countryCode: string, buildingId: string) {
  const client = getPublicClient();
  return client.readContract({
    ...getCertificateContract(),
    functionName: "tokensByBuilding",
    args: [countryCode, buildingId],
  });
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
