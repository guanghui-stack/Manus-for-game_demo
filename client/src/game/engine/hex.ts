export interface HexCoord { q: number; r: number }

export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
] as const;

export const hexKey = ({ q, r }: HexCoord): string => `${q},${r}`;
export const hexDistance = (a: HexCoord, b: HexCoord): number => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
export const hexNeighbors = (hex: HexCoord): HexCoord[] => HEX_DIRECTIONS.map((direction) => ({ q: hex.q + direction.q, r: hex.r + direction.r }));
export const axialToWorld = ({ q, r }: HexCoord, size: number): { x: number; z: number } => ({ x: size * Math.sqrt(3) * (q + r / 2), z: size * 1.5 * r });

export function isStraightHexLine(from: HexCoord, to: HexCoord): boolean {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  return dq === 0 || dr === 0 || dq + dr === 0;
}
