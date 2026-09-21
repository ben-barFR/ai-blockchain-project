import { jsonSchema } from "ai";
import { COMPONENT_KINDS, type ComponentKind } from "@/lib/certificates/constants";

export const reportParseSchema = jsonSchema<{
  buildingId: string;
  postalAddress: string;
  countryCode: string;
  types: ComponentKind[];
}>({
  type: "object",
  additionalProperties: false,
  required: ["buildingId", "postalAddress", "countryCode", "types"],
  properties: {
    buildingId: {
      type: "string",
      description:
        "Official building identifier (cadastre, plot, state record, or labelled building ID). Empty string if not found.",
    },
    postalAddress: {
      type: "string",
      description:
        "Full postal address including street, postal code, and city, on one or two lines. Empty string if not found.",
    },
    countryCode: {
      type: "string",
      description:
        "ISO 3166-1 alpha-2 country code in uppercase. Use FR if the document is French or the country is unclear.",
    },
    types: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", enum: [...COMPONENT_KINDS] },
      description:
        "Every certificate kind this single document covers. electrical = electrical installation; energy = energy performance / consumption; planning = planning / urbanism. A document may cover one, two, or all three kinds.",
    },
  },
});
