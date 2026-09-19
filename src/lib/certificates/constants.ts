export const COMPONENT_KINDS = ["electrical", "energy", "planning"] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export const COMPONENT_INDEX: Record<ComponentKind, number> = {
  electrical: 0,
  energy: 1,
  planning: 2,
};

export const COMPONENT_LABELS: Record<ComponentKind, string> = {
  electrical: "Electrical certificate",
  energy: "Energy consumption certificate",
  planning: "Planning certificate",
};

export const COMPONENT_EXPIRY: Record<ComponentKind, string> = {
  electrical: "Expires after 5 years",
  energy: "Expires after 5 years",
  planning: "Indefinite until invalidated",
};
