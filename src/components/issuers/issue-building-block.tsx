import Link from "next/link";
import type { CustomerBuilding } from "@/lib/issuers/buildings";

function buildingOptionLabel(building: CustomerBuilding) {
  const identifier = building.building_identifier?.trim() || "No ID";
  const address = building.postal_address?.replace(/[\s\n]+/g, " ").trim() || "No address";
  return `${identifier} · ${address}`;
}

export function IssueBuildingBlock({
  selectedBuilding,
  parsed,
  changingBuilding,
  pickerBuildingId,
  activeBuildings,
  newBuildingHref,
  onPickerChange,
  onSelect,
  onStartChange,
  onPersistDraft,
}: {
  selectedBuilding: CustomerBuilding | null;
  parsed: { buildingId: string; postalAddress: string; countryCode: string } | null;
  changingBuilding: boolean;
  pickerBuildingId: string;
  activeBuildings: CustomerBuilding[];
  newBuildingHref: (options?: { empty?: boolean }) => string;
  onPickerChange: (id: string) => void;
  onSelect: () => void;
  onStartChange: () => void;
  onPersistDraft: () => void;
}) {
  const showPicker = changingBuilding || (!selectedBuilding && !parsed);

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] p-4 text-sm">
      {showPicker ? (
        <>
          <p className="font-medium">Building</p>
          <select
            value={pickerBuildingId}
            onChange={(event) => onPickerChange(event.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
          >
            <option value="">Select a building</option>
            {activeBuildings.map((building) => (
              <option key={building.id} value={building.id}>
                {buildingOptionLabel(building)}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!pickerBuildingId}
              onClick={onSelect}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              Select
            </button>
            <Link
              href={newBuildingHref({ empty: true })}
              onClick={onPersistDraft}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--background)]"
            >
              Add new building
            </Link>
          </div>
        </>
      ) : selectedBuilding ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">Selected building</p>
            <button
              type="button"
              onClick={onStartChange}
              className="shrink-0 text-sm text-[var(--accent-hover)] hover:underline"
            >
              Change building
            </button>
          </div>
          <p>
            <span className="text-[var(--muted)]">Building ID:</span>{" "}
            {selectedBuilding.building_identifier || "—"}
          </p>
          <p className="whitespace-pre-line">
            <span className="text-[var(--muted)]">Address:</span>{" "}
            {selectedBuilding.postal_address || "—"}
            {selectedBuilding.country_code ? ` (${selectedBuilding.country_code})` : ""}
          </p>
        </>
      ) : (
        <>
          <p className="font-medium">Building</p>
          <p className="text-[var(--muted)]">No existing building matches this PDF.</p>
          <p>
            <span className="text-[var(--muted)]">Building ID:</span> {parsed?.buildingId || "—"}
          </p>
          <p className="whitespace-pre-line">
            <span className="text-[var(--muted)]">Address:</span> {parsed?.postalAddress || "—"}
            {parsed?.countryCode ? ` (${parsed.countryCode})` : ""}
          </p>
          <Link
            href={newBuildingHref()}
            onClick={onPersistDraft}
            className="inline-block text-sm text-[var(--accent-hover)] hover:underline"
          >
            Create a new building with this PDF data
          </Link>
        </>
      )}
    </div>
  );
}
