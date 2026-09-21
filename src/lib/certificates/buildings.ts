import type { OnChainCertificate } from "@/lib/ethereum/certificates";

export type OwnerBuilding = {
  key: string;
  countryCode: string;
  buildingId: string;
  postalAddress: string;
  certificates: OnChainCertificate[];
};

export function buildingKey(certificate: Pick<OnChainCertificate, "countryCode" | "buildingId" | "postalAddress">) {
  return [certificate.countryCode, certificate.buildingId, certificate.postalAddress]
    .map((value) => value.trim().toLowerCase())
    .join("|");
}

export function onChainBuildingTitle(building: Pick<OwnerBuilding, "buildingId" | "postalAddress">) {
  return building.postalAddress || building.buildingId || "Unnamed building";
}

export function groupCertificatesByBuilding(certificates: OnChainCertificate[]): OwnerBuilding[] {
  const groups = new Map<string, OwnerBuilding>();
  for (const certificate of certificates) {
    const key = buildingKey(certificate);
    const existing = groups.get(key);
    if (existing) {
      existing.certificates.push(certificate);
      continue;
    }
    groups.set(key, {
      key,
      countryCode: certificate.countryCode,
      buildingId: certificate.buildingId,
      postalAddress: certificate.postalAddress,
      certificates: [certificate],
    });
  }
  return [...groups.values()];
}
