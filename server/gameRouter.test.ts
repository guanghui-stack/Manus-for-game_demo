import { describe, expect, it } from "vitest";
import { gameRouter } from "./gameRouter";

const ctx = {} as Parameters<typeof gameRouter.createCaller>[0];

describe("game board referee", () => {
  it("never returns an answer key but grades a submitted option server-side", async () => {
    const caller = gameRouter.createCaller(ctx);
    const item = await caller.nextBoardItem({ seed: 0 });
    expect(item).not.toHaveProperty("answerIndex");
    const outcome = await caller.gradeBoardItem({ itemId: item.itemId, answerIndex: 0 });
    expect(outcome).toEqual({ correct: true });
  });

  it("keeps passage answer keys server-side and returns only a pass/fail outcome", async () => {
    const caller = gameRouter.createCaller(ctx);
    const item = await caller.nextPassageItem({ index: 0 });
    expect(item).not.toHaveProperty("answerIndex");
    await expect(caller.gradePassageItem({ itemId: item.itemId, answerIndex: 0 })).resolves.toEqual({ correct: true });
  });

  it("rejects all board advantage payloads: passage grading only accepts itemId and answerIndex", async () => {
    const caller = gameRouter.createCaller(ctx);
    await expect(caller.gradePassageItem({ itemId: "passage-0", answerIndex: 0, boardState: { general: "zhang-fei", ownedTiles: 61, cooldown: 0 } } as never)).rejects.toThrow();
    await expect(caller.gradePassageItem({ itemId: "passage-0", answerIndex: 0 })).resolves.toEqual({ correct: true });
  });
});
