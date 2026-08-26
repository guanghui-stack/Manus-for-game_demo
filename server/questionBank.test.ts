import { describe, expect, it } from "vitest";
import { PART_FOCUS, QUESTION_BANK } from "./questionBank";

describe("question bank integrity", () => {
  it("ships 600 unique items across two volumes and four skill groups", () => {
    expect(QUESTION_BANK).toHaveLength(600);
    expect(new Set(QUESTION_BANK.map((item) => item.id)).size).toBe(600);
    expect(new Set(QUESTION_BANK.map((item) => item.source))).toEqual(new Set(["v1", "v2"]));
    expect([...new Set(QUESTION_BANK.map((item) => item.part))].sort()).toEqual([1, 2, 3, 4]);
    const v1 = QUESTION_BANK.filter((item) => item.source === "v1");
    const v2 = QUESTION_BANK.filter((item) => item.source === "v2");
    expect(v1).toHaveLength(200);
    expect(v2).toHaveLength(400);
  });

  it("keeps every item well-formed with four options and an in-range server-side key", () => {
    for (const item of QUESTION_BANK) {
      expect(item.prompt.length).toBeGreaterThan(0);
      expect(item.options).toHaveLength(4);
      expect(item.answerIndex >= 0 && item.answerIndex <= 3).toBe(true);
      expect(PART_FOCUS[item.part].length).toBeGreaterThan(0);
    }
  });
});
