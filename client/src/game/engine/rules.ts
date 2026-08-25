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

export function answerWindowSeconds(generalId: GeneralId): number {
  const effect = getGeneral(generalId).effects.find((item) => item.kind === "answerSecondsDelta");
  return GAME_CONSTANTS.answerSeconds + (effect?.kind === "answerSecondsDelta" ? effect.seconds : 0);
}
