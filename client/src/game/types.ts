import type { GeneralId } from "@/game/content/generals";
import type { TileKind, TileOwner } from "@/game/content/board";

export type GameMode = "board" | "question" | "passage" | "boardResult";

export interface HexTileState {
  id: string;
  name: string;
  kind: TileKind;
  owner: TileOwner;
  pointValue: number;
  q: number;
  r: number;
  ring: number;
  siegePlayer: number;
  siegeBot: number;
  fortifiedBy: TileOwner | null;
  lockedByFog: boolean;
}

export interface GeneralState {
  id: GeneralId;
  name: string;
  role: string;
  strength: string;
  weakness: string;
  portrait: string;
  accent: "fire" | "jade" | "silver" | "gold" | "sky";
  tileId: string;
}

export interface BoardQuestionState {
  itemId: string;
  targetTileId: string;
  targetName: string;
  focus: string;
  secondsLeft: number;
  secondsTotal: number;
}

export interface HistoryEntry {
  id: number;
  kind: "setup" | "move" | "question" | "capture" | "siege" | "bot" | "result";
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
  selectedGeneral: GeneralId;
  playerGeneral: GeneralState;
  botGeneralName: string;
  tiles: HexTileState[];
  selectedTileId: string | null;
  hoveredTileId: string | null;
  reachableTileIds: string[];
  boardSecondsLeft: number;
  playerCooldownLeft: number;
  botCooldownLeft: number;
  playerPoints: number;
  botPoints: number;
  playerTileCount: number;
  botTileCount: number;
  bonusMoveSeconds: number;
  message: string;
  pendingAction: { targetName: string; terrain: string; questionSeconds: number; siegeCount: number } | null;
  question: BoardQuestionState | null;
  passage: { itemId: string; questionNumber: number; totalQuestions: number; secondsLeft: number; pointsAtFreeze: { player: number; bot: number } } | null;
  canChallenge: boolean;
  challengeReason: string;
  history: HistoryEntry[];
  battleArchive: BattleRecord[];
  battleStats: BattleArchiveStats;
  finished: { winner: "player" | "bot" | "draw"; reason: string } | null;
}

export type GameAction =
  | { type: "selectGeneral"; generalId: GeneralId }
  | { type: "selectTile"; tileId: string }
  | { type: "hoverTile"; tileId: string | null }
  | { type: "confirmAction" }
  | { type: "cancelAction" }
  | { type: "answerResolved"; correct: boolean }
  | { type: "requestPassage" }
  | { type: "passageAnswerResolved"; correct: boolean }
  | { type: "clearBattleArchive" }
  | { type: "reset" };
