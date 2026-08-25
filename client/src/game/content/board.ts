import { axialToWorld, hexDistance, hexKey, type HexCoord } from "@/game/engine/hex";

export type TileKind = "plain" | "village" | "forest" | "pass" | "ford" | "fortress" | "academy" | "mountain";
export type TileOwner = "player" | "bot" | "neutral" | "mountain";

export interface BoardTileDefinition {
  id: string;
  name: string;
  coord: HexCoord;
  kind: TileKind;
  owner: TileOwner;
  pointValue: 0 | 1 | 2 | 3;
  world: { x: number; z: number };
}

const NAMES = ["Hàm Cốc", "Lạc Dương", "Hợp Phì", "Xích Bích", "Kinh Châu", "Ích Châu", "Nam Trung", "Quan Độ", "Nhai Đình", "Kỳ Sơn", "Trường Bản", "Hán Trung", "Tân Dã", "Uyển Thành", "Nhữ Nam", "Bành Thành", "Thọ Xuân", "Giang Hạ", "Giang Lăng", "Ba Đông", "Vũ Lăng", "Linh Lăng", "Quế Dương", "Tương Dương", "Định Quân", "Tà Cốc", "Dương Bình", "Thiên Thủy", "Vũ Đô", "Lũng Tây", "Tây Lương", "Lạc Thành", "Miên Trúc", "Thành Đô", "Kiến Nghiệp", "Sài Tang", "Lư Giang", "Hạ Khẩu", "Bạch Đế", "Di Lăng", "Tương Phàn", "Mạch Thành", "Phàn Thành", "Ngõa Khẩu", "Đương Dương", "Nghi Đô", "Vĩnh An", "Tử Ngọ", "Từ Châu", "Bắc Hải", "Bộc Dương", "Hà Đông", "Hổ Lao", "Thái Nguyên", "Tấn Dương", "Lạc Khẩu", "Hạ Bi", "Cư Dung", "Hợp Dương", "Nghiệp Thành", "Lương Châu"] as const;
const KIND_SEQUENCE: TileKind[] = [
  ...Array<TileKind>(26).fill("plain"), ...Array<TileKind>(10).fill("village"), ...Array<TileKind>(8).fill("forest"), ...Array<TileKind>(6).fill("pass"), ...Array<TileKind>(4).fill("ford"), ...Array<TileKind>(4).fill("fortress"), ...Array<TileKind>(3).fill("academy"),
];
const POINTS: Record<TileKind, 0 | 1 | 2 | 3> = { plain: 1, village: 1, forest: 1, pass: 2, ford: 1, fortress: 3, academy: 1, mountain: 0 };

const hexesAtRadius = (radius: number): HexCoord[] => {
  const result: HexCoord[] = [];
  for (let q = -radius; q <= radius; q += 1) for (let r = -radius; r <= radius; r += 1) if (hexDistance({ q, r }, { q: 0, r: 0 }) <= radius) result.push({ q, r });
  return result.sort((a, b) => a.r - b.r || a.q - b.q);
};

export function createBoard(): BoardTileDefinition[] {
  const all = hexesAtRadius(5);
  const playable = all.filter((coord) => hexDistance(coord, { q: 0, r: 0 }) <= 4);
  const active = playable.map((coord, index) => {
    const id = hexKey(coord);
    const owner: TileOwner = ["-4,0", "-3,0", "-3,1"].includes(id) ? "player" : ["4,0", "3,0", "3,-1"].includes(id) ? "bot" : "neutral";
    const kind = KIND_SEQUENCE[(index * 17) % KIND_SEQUENCE.length];
    return { id, name: NAMES[index], coord, kind, owner, pointValue: POINTS[kind], world: axialToWorld(coord, 0.86) };
  });
  const mountains = all.filter((coord) => hexDistance(coord, { q: 0, r: 0 }) === 5).map((coord, index) => ({ id: `mountain-${hexKey(coord)}`, name: `Ngoài mùa ${index + 1}`, coord, kind: "mountain" as const, owner: "mountain" as const, pointValue: 0 as const, world: axialToWorld(coord, 0.86) }));
  return [...active, ...mountains];
}
