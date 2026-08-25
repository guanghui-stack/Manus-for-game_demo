import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";

/** Server-only board items. The answer key must never be returned to the browser. */
const BOARD_ITEMS = [
  { id: "context-01", focus: "Nghĩa trong ngữ cảnh · Bậc 1", prompt: "In this sentence, 'substantial' is closest in meaning to:", options: ["significant", "temporary", "hidden"], answerIndex: 0 },
  { id: "collocation-02", focus: "Collocation · Bậc 1", prompt: "Choose the natural collocation: '___ a decision'.", options: ["make", "do", "build"], answerIndex: 0 },
  { id: "wordform-03", focus: "Word form · Bậc 2", prompt: "The team's ___ improved after practice.", options: ["perform", "performance", "performing"], answerIndex: 1 },
  { id: "paraphrase-04", focus: "Paraphrase · Bậc 2", prompt: "'The evidence was consistent with earlier findings' means:", options: ["It matched earlier findings.", "It erased earlier findings.", "It delayed earlier findings."], answerIndex: 0 },
  { id: "blank-05", focus: "Điền một chỗ trống · Bậc 3", prompt: "The policy led to a ___ reduction in waste.", options: ["substantial", "substantially", "substance"], answerIndex: 0 },
] as const;

const PASSAGE_ITEMS = [
  "The author suggests that business cards vary according to local custom.", "The Chinese calling card was originally designed for trade.", "European business cards began as miniature advertisements.", "Board meetings never discuss the design of business cards.", "A toy company uses an unusual physical card.", "All commentators believe paper cards will disappear immediately.", "A distinctive card may still matter in meeting-heavy work.", "The passage says kindergarten cards are legal everywhere.", "The author states that cards can signal an intended social visit.", "The text claims digital cards have already replaced every physical card.", "The discussion includes both critics and defenders of physical cards.", "The subject of card design can provoke discussion.", "Business cards are presented as a universal ritual with local details.",
] as const;

export const gameRouter = router({
  nextBoardItem: publicProcedure
    .input(z.object({ seed: z.number().int().nonnegative() }))
    .mutation(({ input }) => {
      const item = BOARD_ITEMS[input.seed % BOARD_ITEMS.length];
      return { itemId: item.id, focus: item.focus, prompt: item.prompt, options: [...item.options] };
    }),
  gradeBoardItem: publicProcedure
    .input(z.object({ itemId: z.string().min(1), answerIndex: z.number().int().min(0).max(2) }))
    .mutation(({ input }) => {
      const item = BOARD_ITEMS.find((candidate) => candidate.id === input.itemId);
      if (!item) return { correct: false };
      return { correct: item.answerIndex === input.answerIndex };
    }),
  nextPassageItem: publicProcedure.input(z.object({ index: z.number().int().min(0).max(12) })).mutation(({ input }) => ({ itemId: `passage-${input.index}`, prompt: PASSAGE_ITEMS[input.index], options: ["TRUE", "FALSE", "NOT GIVEN"] })),
  gradePassageItem: publicProcedure.input(z.object({ itemId: z.string().regex(/^passage-\d+$/), answerIndex: z.number().int().min(0).max(2) }).strict()).mutation(({ input }) => {
    const index = Number(input.itemId.replace("passage-", ""));
    const keys = [0, 1, 0, 1, 2, 2, 0, 1, 0, 1, 0, 0, 0] as const;
    return { correct: keys[index] === input.answerIndex };
  }),
});
