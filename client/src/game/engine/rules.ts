import { getGeneral, type GeneralId } from "@/game/content/generals";
import { hexDistance, isStraightHexLine, type HexCoord } from "@/game/engine/hex";

export const GAME_CONSTANTS = {
  boardSeconds: 600,
  answerSeconds: 10,
  baseCooldownSeconds: 3,
  territoryCooldownFactor: 0.15,
  villageReductionSeconds: 0.5,
  villageReductionCap: 2,
  cooldownFloorSeconds: 2,
  siegeRequired: 2,
  siegeDecaySeconds: 60,
  fogOuterAtSeconds: 90,
  fogInnerAtSeconds: 30,
} as const;

export function cooldownSeconds(ownedTiles: number, ownedVillages: number, multiplier = 1): number {
  const reduction = Math.min(GAME_CONSTANTS.villageReductionCap, ownedVillages * GAME_CONSTANTS.villageReductionSeconds);
  return Math.max(GAME_CONSTANTS.cooldownFloorSeconds, GAME_CONSTANTS.baseCooldownSeconds + GAME_CONSTANTS.territoryCooldownFactor * ownedTiles - reduction) * multiplier;
}

export function movementRange(generalId: GeneralId, elapsedBoardSeconds: number): number {
  const general = getGeneral(generalId);
  const schedule = general.effects.find((effect) => effect.kind === "rangeSchedule");
  if (schedule?.kind === "rangeSchedule") return schedule.steps.reduce((range, step) => elapsedBoardSeconds >= step.atSecond ? step.hexes : range, 1);
  const straight = general.effects.find((effect) => effect.kind === "straightLineOnly");
  if (straight?.kind === "straightLineOnly") return straight.hexes;
  const range = general.effects.find((effect) => effect.kind === "range");
  return range?.kind === "range" ? range.hexes : 1;
}

export function canMoveTo(generalId: GeneralId, from: HexCoord, to: HexCoord, elapsedBoardSeconds: number): boolean {
  const range = movementRange(generalId, elapsedBoardSeconds);
  if (hexDistance(from, to) > range) return false;
  const straight = getGeneral(generalId).effects.find((effect) => effect.kind === "straightLineOnly");
  return straight?.kind === "straightLineOnly" ? isStraightHexLine(from, to) : true;
}

export function canTraverseRoute(generalId: GeneralId, from: HexCoord, to: HexCoord, ownerAt: (coord: HexCoord) => "player" | "bot" | "neutral" | "mountain" | undefined): boolean {
  if (generalId !== "ma-chao") return true;
  const distance = hexDistance(from, to);
  if (distance <= 1 || !isStraightHexLine(from, to)) return true;
  const stepQ = (to.q - from.q) / distance;
  const stepR = (to.r - from.r) / distance;
  for (let step = 1; step < distance; step += 1) {
    const owner = ownerAt({ q: from.q + stepQ * step, r: from.r + stepR * step });
    if (owner !== "player" && owner !== "neutral") return false;
  }
  return true;
}

export function answerWindowSeconds(): number { return GAME_CONSTANTS.answerSeconds; }
