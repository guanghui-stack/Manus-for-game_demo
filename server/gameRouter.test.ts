import { describe, expect, it } from "vitest";
import { gameRouter } from "./gameRouter";
import { QUESTION_BANK } from "./questionBank";

const ctx = {} as Parameters<typeof gameRouter.createCaller>[0];

describe("game board referee", () => {
  it("never returns an answer key but grades a submitted option server-side", async () => {
    const caller = gameRouter.createCaller(ctx);
    const item = await caller.nextBoardItem({ seed: 0 });
    expect(item).not.toHaveProperty("answerIndex");
    const bankItem = QUESTION_BANK.find((candidate) => candidate.id === item.itemId);
    expect(bankItem).toBeDefined();
    await expect(caller.gradeBoardItem({ itemId: item.itemId, answerIndex: bankItem!.answerIndex })).resolves.toEqual({ correct: true });
    await expect(caller.gradeBoardItem({ itemId: item.itemId, answerIndex: (bankItem!.answerIndex + 1) % 4 })).resolves.toEqual({ correct: false });
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
    await expect(caller.gradePassageItem({ itemId: "passage-99", answerIndex: 0 })).rejects.toThrow();
  });

  it("cycles deterministically through the whole question bank by seed", async () => {
    const caller = gameRouter.createCaller(ctx);
    const first = await caller.nextBoardItem({ seed: 0 });
    const wrapped = await caller.nextBoardItem({ seed: QUESTION_BANK.length });
    expect(wrapped.itemId).toBe(first.itemId);
    expect(first.options).toHaveLength(4);
  });
});
