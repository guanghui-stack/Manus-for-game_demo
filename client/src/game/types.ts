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

export interface GameSnapshot {
  mode: GameMode;
  selectedCommander: CommanderId;
  selectedTerritory: TerritoryId | null;
  availableDestinations: TerritoryId[];
  territories: TerritoryState[];
  commanders: CommanderState[];
  playerTerritories: number;
  totalTerritories: number;
  message: string;
  rechargeAvailable: boolean;
  round: number;
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
  | { type: "recharge" }
  | { type: "answer"; answerIndex: number }
  | { type: "closeResult" }
  | { type: "reset" };
