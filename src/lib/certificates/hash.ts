import { keccak256, type Hex } from "viem";

export async function hashFile(file: File): Promise<Hex> {
  const buffer = await file.arrayBuffer();
  return keccak256(new Uint8Array(buffer));
}

export function isHexHash(value: string): value is Hex {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}
