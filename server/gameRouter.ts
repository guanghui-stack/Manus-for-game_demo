import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { PART_FOCUS, QUESTION_BANK } from "./questionBank";

/**
 * Ngân hàng câu hỏi bàn cờ nằm ở server/questionBank.ts — sinh tự động từ hai workbook
 * nguồn trong content/sources/. Đáp án chỉ tồn tại phía server và không bao giờ trả về
 * trình duyệt: client chỉ nhận prompt + options, gửi lựa chọn về để được chấm.
 */

const PASSAGE_ITEMS = [
  "The author suggests that business cards vary according to local custom.", "The Chinese calling card was originally designed for trade.", "European business cards began as miniature advertisements.", "Board meetings never discuss the design of business cards.", "A toy company uses an unusual physical card.", "All commentators believe paper cards will disappear immediately.", "A distinctive card may still matter in meeting-heavy work.", "The passage says kindergarten cards are legal everywhere.", "The author states that cards can signal an intended social visit.", "The text claims digital cards have already replaced every physical card.", "The discussion includes both critics and defenders of physical cards.", "The subject of card design can provoke discussion.", "Business cards are presented as a universal ritual with local details.",
] as const;

/**
 * Thân bài đọc cho trận sinh tử.
 *
 * ĐANG RỖNG CÓ CHỦ Ý. Mười ba câu TRUE/FALSE/NOT GIVEN dưới đây không trả lời được nếu
 * không có bài đọc, nên chừng nào hằng số này còn rỗng thì lớp học thuật chưa dùng được:
 * người chơi chỉ có thể đoán. Dán đoạn trích đã có quyền sử dụng vào đây — nguồn ghi ở
 * READING_SOURCE.md — rồi đối chiếu lại PASSAGE_KEYS bên dưới.
 */
const PASSAGE_TITLE = "The Importance of Business Card";
const PASSAGE_BODY = "";

export const gameRouter = router({
  nextBoardItem: publicProcedure
    .input(z.object({ seed: z.number().int().nonnegative() }))
    .mutation(({ input }) => {
      const item = QUESTION_BANK[input.seed % QUESTION_BANK.length];
      return { itemId: item.id, focus: PART_FOCUS[item.part], prompt: item.prompt, options: [...item.options] };
    }),
  gradeBoardItem: publicProcedure
    .input(z.object({ itemId: z.string().min(1), answerIndex: z.number().int().min(0).max(3) }))
    .mutation(({ input }) => {
      const item = QUESTION_BANK.find((candidate) => candidate.id === input.itemId);
      if (!item) return { correct: false };
      return { correct: item.answerIndex === input.answerIndex };
    }),
  nextPassageItem: publicProcedure.input(z.object({ index: z.number().int().min(0).max(12) })).mutation(({ input }) => ({ itemId: `passage-${input.index}`, prompt: PASSAGE_ITEMS[input.index], options: ["TRUE", "FALSE", "NOT GIVEN"], passageTitle: PASSAGE_TITLE, passageBody: PASSAGE_BODY })),
  gradePassageItem: publicProcedure.input(z.object({ itemId: z.string().regex(/^passage-(?:[0-9]|1[0-2])$/), answerIndex: z.number().int().min(0).max(2) }).strict()).mutation(({ input }) => {
    const index = Number(input.itemId.replace("passage-", ""));
    const keys = [0, 1, 0, 1, 2, 2, 0, 1, 0, 1, 0, 0, 0] as const;
    return { correct: keys[index] === input.answerIndex };
  }),
});
