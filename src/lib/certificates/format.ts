export function formatTimestamp(seconds: number, fallback = "Indefinite") {
  if (!seconds) return fallback;
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function shortAddress(address: string) {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function zeroHash(hash: string) {
  return !hash || /^0x0+$/.test(hash);
}
