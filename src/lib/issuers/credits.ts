export const CREDIT_PACK_SIZE = 100;
export const CREDIT_PACK_PRICE_EUR = 1000;
export const DEFAULT_ISSUANCE_CREDITS = 100;

export function issuanceCreditsRemaining(value: number | null | undefined) {
  return value ?? DEFAULT_ISSUANCE_CREDITS;
}
