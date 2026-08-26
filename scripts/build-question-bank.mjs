import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Sinh server/questionBank.ts từ hai workbook nguồn trong server/content/sources/.
 * Chạy lại bằng: pnpm bank:build
 * Script tự xác thực: đủ số câu, mỗi phần đúng số lượng, mỗi câu đủ 4 lựa chọn và có đáp án.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCES = [
  {
    id: "v1",
    file: join(root, "server", "content", "sources", "IELTS_Reading_Paraphrase_Practice_Band_2-4_200_Questions.md"),
    total: 200,
    perPart: 50,
  },
  {
    id: "v2",
    file: join(root, "server", "content", "sources", "IELTS_Reading_Paraphrase_Practice_Band_2-4_400_New_Questions_Volume_2.md"),
    total: 400,
    perPart: 100,
  },
];

const LETTER_INDEX = { A: 0, B: 1, C: 2, D: 3 };

const clean = (text) =>
  text.replaceAll("**", "").replaceAll("\\_\\_\\_", "___").replaceAll("\\$", "$").replace(/\s+/g, " ").trim();

function parseDocument({ id, file }) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const items = [];
  const keys = new Map();
  let part = null;
  let keyMode = false;
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^#{1,6}[^#\n]*Answer\s*Key/i.test(line)) { keyMode = true; current = null; continue; }
    const heading = line.match(/^#{1,6}\s+Part\s+(\d)/i);
    if (heading) { if (!keyMode) part = Number(heading[1]); current = null; continue; }

    if (keyMode) {
      const key = line.match(/^\*\*(\d+)\.\s*([A-D])\b/);
      if (key) keys.set(Number(key[1]), LETTER_INDEX[key[2]]);
      continue;
    }

    const qV1 = line.match(/^\*\*(\d+)\.\*\*(.*)$/);
    const qV2 = line.match(/^\*\*(\d+)\.\s+(.+)\*\*$/);
    if (qV1 || qV2) {
      const matched = qV1 ?? qV2;
      const num = Number(matched[1]);
      current = { num, part, prompt: clean(qV1 ? qV1[2] : qV2[2]), options: [] };
      items.push(current);
      continue;
    }
    const optV1 = line.match(/^\*\*([A-D])\.\*\*(.*)$/);
    const optV2 = line.match(/^([A-D])[.)]\s+(.*)$/);
    const opt = optV1 ?? optV2;
    if (opt && current) { current.options.push(clean(opt[2])); continue; }
  }

  return { id, items, keys };
}

function validateAndMap({ id, items, keys }, expectedTotal, expectedPerPart) {
  const problems = [];
  if (items.length !== expectedTotal) problems.push(`${id}: expected ${expectedTotal} questions, found ${items.length}`);
  const perPart = new Map();
  for (const item of items) {
    perPart.set(item.part, (perPart.get(item.part) ?? 0) + 1);
    if (!item.part) problems.push(`${id} #${item.num}: missing part heading`);
    if (!item.prompt) problems.push(`${id} #${item.num}: empty prompt`);
    if (item.options.length !== 4) problems.push(`${id} #${item.num}: ${item.options.length} options`);
    if (!keys.has(item.num)) problems.push(`${id} #${item.num}: missing answer key`);
  }
  for (const part of [1, 2, 3, 4]) {
    if (perPart.get(part) !== expectedPerPart) problems.push(`${id}: part ${part} has ${perPart.get(part) ?? 0}, expected ${expectedPerPart}`);
  }
  if (problems.length) throw new Error(`Question bank validation failed:\n${problems.join("\n")}`);

  return items.map((item) => ({
    id: `${id}-p${item.part}-${String(item.num).padStart(3, "0")}`,
    source: id,
    part: item.part,
    prompt: item.prompt,
    options: item.options,
    answerIndex: keys.get(item.num),
  }));
}

const bank = SOURCES.flatMap((source) => validateAndMap(parseDocument(source), source.total, source.perPart));
const uniqueIds = new Set(bank.map((item) => item.id));
if (uniqueIds.size !== bank.length) throw new Error("Duplicate question ids generated");

const output = `/*
 * ĐƯỢC SINH TỰ ĐỘNG bởi scripts/build-question-bank.mjs từ hai workbook nguồn
 * trong server/content/sources/ (Volume 1: 200 câu, Volume 2: 400 câu).
 * Không sửa tay tệp này — chỉnh nguồn rồi chạy lại: pnpm bank:build
 * Đáp án nằm ở đây chỉ để trọng tài server chấm; không bao giờ trả về trình duyệt.
 */

export type BankPart = 1 | 2 | 3 | 4;

export interface BankItem {
  id: string;
  source: "${SOURCES[0].id}" | "${SOURCES[1].id}";
  part: BankPart;
  prompt: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
}

/** Nhãn nhóm kỹ năng hiển thị trên bàn cờ; cũng là khoá phục bàn của Hoàng Trung. */
export const PART_FOCUS: Record<BankPart, string> = {
  1: "Paraphrase · Nhận diện diễn đạt lại",
  2: "Từ vựng trong ngữ cảnh",
  3: "Collocation",
  4: "Ngữ pháp paraphrase",
};

export const QUESTION_BANK: BankItem[] = [
${bank.map((item) => `  ${JSON.stringify(item)},`).join("\n")}
];
`;

writeFileSync(join(root, "server", "questionBank.ts"), output, "utf8");
console.log(`question bank: ok — ${bank.length} items (${SOURCES.map((s) => `${s.id}:${s.total}`).join(", ")}) written to server/questionBank.ts`);
