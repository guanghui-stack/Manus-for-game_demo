export type CommanderId = "lu-bu" | "zhuge-liang";

export type TerritoryId =
  | "ham-coc"
  | "lac-duong"
  | "hop-phi"
  | "xich-bich"
  | "kinh-chau"
  | "ich-chau"
  | "nam-trung";

export type Owner = "player" | "enemy" | "neutral";
export type GameMode = "map" | "quiz" | "result" | "victory";

export interface TerritoryState {
  id: TerritoryId;
  name: string;
  owner: Owner;
  position: { x: number; z: number };
  neighbors: TerritoryId[];
}

export interface CommanderState {
  id: CommanderId;
  name: string;
  epithet: string;
  skill: string;
  skillDetail: string;
  troops: number;
  territoryId: TerritoryId;
  accent: "fire" | "silver";
}

export interface QuizQuestion {
  prompt: string;
  options: string[];
  answer: number;
  focus: string;
}

export interface HistoryEntry {
  id: number;
  kind: "setup" | "select" | "march" | "quiz" | "result";
  label: string;
  detail: string;
}

export interface BattleRecord {
  id: string;
  gameId: string;
  recordedAt: string;
  round: number;
  commanderName: string;
  targetName: string;
  victory: boolean;
  playerScore: number;
  enemyScore: number;
  elapsedSeconds: number;
  reward: number;
  skillApplied: string;
}

export interface BattleArchiveStats {
  games: number;
  battles: number;
  victories: number;
  winRate: number;
  troopsEarned: number;
}

export interface GameSnapshot {
  mode: GameMode;
  selectedCommander: CommanderId;
  selectedTerritory: TerritoryId | null;
  hoveredTerritory: TerritoryId | null;
  availableDestinations: TerritoryId[];
  territories: TerritoryState[];
  commanders: CommanderState[];
  playerTerritories: number;
  totalTerritories: number;
  message: string;
  rechargeAvailable: boolean;
  round: number;
  pendingAttack: {
    commanderName: string;
    originName: string;
    targetName: string;
    skill: string;
    testTitle: string;
  } | null;
  history: HistoryEntry[];
  battleArchive: BattleRecord[];
  battleStats: BattleArchiveStats;
  march: {
    commanderName: string;
    originName: string;
    targetName: string;
    progress: number;
  } | null;
  quiz: {
    question: QuizQuestion;
    questionNumber: number;
    totalQuestions: number;
    elapsedSeconds: number;
    enemyElapsedSeconds: number;
    correctSoFar: number;
    commanderName: string;
    skillNote: string;
    targetName: string;
    testTitle: string;
    sourceLabel: string;
    passage: string[];
  } | null;
  result: {
    victory: boolean;
    playerScore: number;
    enemyScore: number;
    elapsedSeconds: number;
    enemyElapsedSeconds: number;
    territoryName: string;
    skillApplied: string;
    reward: number;
  } | null;
}

export type GameAction =
  | { type: "selectCommander"; commanderId: CommanderId }
  | { type: "selectTerritory"; territoryId: TerritoryId }
  | { type: "hoverTerritory"; territoryId: TerritoryId | null }
  | { type: "confirmAttack" }
  | { type: "cancelAttack" }
  | { type: "clearBattleArchive" }
  | { type: "recharge" }
  | { type: "answer"; answerIndex: number }
  | { type: "closeResult" }
  | { type: "reset" };
