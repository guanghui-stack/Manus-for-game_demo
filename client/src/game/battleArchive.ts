/** Binh Pháp Giấy Mực — local battle archive: browser-only, bounded and schema-checked. */
import type { BattleArchiveStats, BattleRecord } from "@/game/types";

const STORAGE_KEY = "stoic-ielts-battle-archive-v1";
const MAX_RECORDS = 60;

const isBattleRecord = (value: unknown): value is BattleRecord => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string"
    && typeof item.gameId === "string"
    && typeof item.recordedAt === "string"
    && typeof item.round === "number"
    && typeof item.commanderName === "string"
    && typeof item.targetName === "string"
    && typeof item.victory === "boolean"
    && typeof item.playerScore === "number"
    && typeof item.enemyScore === "number"
    && typeof item.elapsedSeconds === "number"
    && typeof item.reward === "number"
    && typeof item.skillApplied === "string";
};

export function createGameId(): string {
  return `van-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadBattleArchive(): BattleRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isBattleRecord).slice(0, MAX_RECORDS);
  } catch {
    return [];
  }
}

export function persistBattleArchive(records: BattleRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    // Storage may be unavailable or full; the current in-memory game remains playable.
  }
}

export function clearBattleArchiveStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Treat unavailable storage as already cleared.
  }
}

export function getBattleArchiveStats(records: BattleRecord[]): BattleArchiveStats {
  const victories = records.filter((record) => record.victory).length;
  return {
    games: new Set(records.map((record) => record.gameId)).size,
    battles: records.length,
    victories,
    winRate: records.length ? Math.round((victories / records.length) * 100) : 0,
    troopsEarned: records.reduce((total, record) => total + record.reward, 0),
  };
}
