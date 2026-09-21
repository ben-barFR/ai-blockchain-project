import { normalizeBuildingField } from "@/lib/certificates/building-normalize";
import { COMPONENT_KINDS } from "@/lib/certificates/constants";

export { normalizeBuildingField };

export type CustomerBuilding = {
  id: string;
  issuer_id: string;
  customer_id: string;
  building_identifier: string;
  postal_address: string;
  country_code: string;
  archived_at: string | null;
  created_at: string;
};

export type CustomerBuildingWithCerts = CustomerBuilding & {
  certificate_issuances?: { id: string; token_id: string | null }[];
};

export function buildingMatchKey(input: {
  buildingIdentifier?: string | null;
  postalAddress?: string | null;
  countryCode?: string | null;
}) {
  return [
    (input.countryCode || "").trim().toUpperCase(),
    normalizeBuildingField(input.buildingIdentifier || ""),
    normalizeBuildingField(input.postalAddress || ""),
  ].join("|");
}

export function buildingsMatch(
  building: {
    building_identifier: string;
    postal_address: string;
    country_code: string;
  },
  parsed: {
    buildingIdentifier?: string | null;
    postalAddress?: string | null;
    countryCode?: string | null;
  },
) {
  return buildingMatchKey({
    buildingIdentifier: building.building_identifier,
    postalAddress: building.postal_address,
    countryCode: building.country_code,
  }) === buildingMatchKey(parsed);
}

export function findMatchingBuilding<T extends CustomerBuilding>(
  buildings: T[],
  parsed: {
    buildingIdentifier?: string | null;
    postalAddress?: string | null;
    countryCode?: string | null;
  },
) {
  const active = buildings.filter((building) => !building.archived_at);
  return active.find((building) => buildingsMatch(building, parsed)) || null;
}

export function issuerBuildingTitle(building: {
  building_identifier?: string | null;
  postal_address?: string | null;
}) {
  return building.building_identifier?.trim() || building.postal_address?.trim() || "Unnamed building";
}

export function issuanceTypeLabels(issuance: {
  has_electrical?: boolean;
  has_energy?: boolean;
  has_planning?: boolean;
}) {
  return COMPONENT_KINDS.filter((kind) => {
    if (kind === "electrical") return issuance.has_electrical;
    if (kind === "energy") return issuance.has_energy;
    return issuance.has_planning;
  });
}
