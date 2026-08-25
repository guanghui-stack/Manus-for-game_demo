import { describe, expect, it } from "vitest";
import { createBoard } from "@/game/content/board";
import { answerWindowSeconds, canMoveTo, canTraverseRoute, cooldownSeconds, movementRange } from "@/game/engine/rules";

describe("Ngũ Tướng board engine", () => {
  it("creates 61 playable tiles, 30 mountains and exactly 75 board points", () => {
    const tiles = createBoard();
    const playable = tiles.filter((tile) => tile.owner !== "mountain");
    expect(playable).toHaveLength(61);
    expect(tiles.filter((tile) => tile.owner === "mountain")).toHaveLength(30);
    expect(playable.reduce((sum, tile) => sum + tile.pointValue, 0)).toBe(75);
  });

  it("uses territory expansion cooldown with a 2 second floor", () => {
    expect(cooldownSeconds(5, 0)).toBeCloseTo(3.75);
    expect(cooldownSeconds(1, 10)).toBe(2);
  });

  it("keeps generals inside spatial and rhythm-only movement rules", () => {
    expect(movementRange("huang-zhong", 0)).toBe(1);
    expect(movementRange("huang-zhong", 180)).toBe(2);
    expect(canMoveTo("ma-chao", { q: 0, r: 0 }, { q: 3, r: 0 }, 0)).toBe(true);
    expect(canMoveTo("ma-chao", { q: 0, r: 0 }, { q: 2, r: 1 }, 0)).toBe(false);
  });

  it("keeps every board question on the fixed ten-second academic window", () => {
    expect(answerWindowSeconds()).toBe(10);
  });

  it("allows Ma Chao straight routes only through player or neutral intermediate tiles", () => {
    const openRoute = (coord: { q: number; r: number }) => coord.q === 1 ? "neutral" : "player" as const;
    const blockedRoute = (coord: { q: number; r: number }) => coord.q === 1 ? "bot" : "player" as const;
    expect(canTraverseRoute("ma-chao", { q: 0, r: 0 }, { q: 3, r: 0 }, openRoute)).toBe(true);
    expect(canTraverseRoute("ma-chao", { q: 0, r: 0 }, { q: 3, r: 0 }, blockedRoute)).toBe(false);
  });
});
