export function normalizeBuildingField(value: string) {
  return value
    .trim()
    .replace(/[\n\r,]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}
