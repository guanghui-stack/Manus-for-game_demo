/**
 * Ranh giới bất di bất dịch: kỹ năng chỉ làm việc ở lớp bàn cờ.
 * Không thêm biến thể học thuật vào union này nếu chưa có quyết định mới của chủ dự án.
 */
export type SkillEffect =
  | { kind: "range"; hexes: number }
  | { kind: "straightLineOnly"; hexes: number }
  | { kind: "jumpToBesiegedHome" }
  | { kind: "hiddenInForest" }
  | { kind: "cooldownMultiplier"; factor: number }
  | { kind: "cooldownPenaltyOnMiss"; factor: number }
  | { kind: "answerSecondsDelta"; seconds: number }
  | { kind: "extraCaptureInSameAction"; seconds: number }
  | { kind: "rerollItem"; timesPerAction: number }
  | { kind: "fortify"; correctAnswersToBreak: number }
  | { kind: "decayIfFarFromCommander"; maxHexes: number; seconds: number }
  | { kind: "rangeSchedule"; steps: { atSecond: number; hexes: number }[] }
  | { kind: "replayBonusHexes"; hexes: number };
