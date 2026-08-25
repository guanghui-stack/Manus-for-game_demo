import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { createBoard, type TileOwner } from "@/game/content/board";
import { GENERALS, getGeneral, type GeneralId } from "@/game/content/generals";
import { clearBattleArchiveStorage, createGameId, getBattleArchiveStats, loadBattleArchive, persistBattleArchive } from "@/game/battleArchive";
import { axialToWorld, hexDistance, hexKey } from "@/game/engine/hex";
import { answerWindowSeconds, canMoveTo, canTraverseRoute, cooldownSeconds, GAME_CONSTANTS } from "@/game/engine/rules";
import type { BattleRecord, GameAction, GameSnapshot, HexTileState, HistoryEntry } from "@/game/types";

const COLORS = {
  paper: Color3.FromHexString("#fffdf9"), ink: Color3.FromHexString("#22303e"), navy: Color3.FromHexString("#1e3a5c"),
  fire: Color3.FromHexString("#c2591f"), gold: Color3.FromHexString("#b8862b"), jade: Color3.FromHexString("#54706a"),
  silver: Color3.FromHexString("#7d97ac"), plain: Color3.FromHexString("#e7dcc7"), village: Color3.FromHexString("#d9c99f"),
  forest: Color3.FromHexString("#74876f"), pass: Color3.FromHexString("#96826c"), ford: Color3.FromHexString("#9bb0b8"),
  fortress: Color3.FromHexString("#9d7b62"), academy: Color3.FromHexString("#c9b17a"), mountain: Color3.FromHexString("#77736c"),
};

const TERRAIN_LABEL: Record<HexTileState["kind"], string> = { plain: "Đồng bằng", village: "Làng", forest: "Rừng", pass: "Ải", ford: "Bến sông", fortress: "Thành trì", academy: "Học cung", mountain: "Núi" };

type PendingAction = { targetId: string; startedAt: number; questionSeed: number };

export class GameWorld {
  private tiles: HexTileState[] = createBoard().map((tile) => ({ ...tile, q: tile.coord.q, r: tile.coord.r, ring: hexDistance(tile.coord, { q: 0, r: 0 }), siegePlayer: 0, siegeBot: 0, fortifiedBy: null, lockedByFog: false }));
  private tileMeshes = new Map<string, Mesh>();
  private tileMaterials = new Map<string, StandardMaterial>();
  private inkRoute: LinesMesh | null = null;
  private playerPortrait: Mesh | null = null;
  private botPortrait: Mesh | null = null;
  private selectedGeneral: GeneralId = "zhang-fei";
  private playerTileId = "-4,0";
  private botTileId = "4,0";
  private selectedTileId: string | null = null;
  private hoveredTileId: string | null = null;
  private mode: GameSnapshot["mode"] = "board";
  private pendingAction: PendingAction | null = null;
  private message = "Hai bên đi đồng thời. Chọn một hex trong tầm khi hồi lệnh về không.";
  private boardStartedAt = performance.now();
  private boardTimePenaltySeconds = 0;
  private playerCooldownUntil = 0;
  private botCooldownUntil = 1.8;
  private currentQuestion: GameSnapshot["question"] = null;
  private questionOpenedAt = 0;
  private passage: { index: number; correct: number; startedAt: number; playerPointsAtFreeze: number; botPointsAtFreeze: number } | null = null;
  private boardPausedAt: number | null = null;
  private pausedDurationMs = 0;
  private generalLocked = false;
  private seed = 11;
  private history: HistoryEntry[] = [{ id: 1, kind: "setup", label: "Bàn Ngũ Tướng mở", detail: "61 ô chơi được, 30 núi ngoài mùa. Lữ Bố đang phản chiếu tướng của bạn." }];
  private historySequence = 1;
  private battleArchive = loadBattleArchive();
  private gameId = createGameId();
  private actionListener: (event: Event) => void;
  private lastBotDecisionAt = -1;
  private lastSnapshotSecond = -1;
  private finished: GameSnapshot["finished"] = null;
  private siegeExpires = new Map<string, { player?: number; bot?: number }>();
  private maChaoCapturedAt = new Map<string, number>();
  private bonusMoveUntil = 0;
  /** Xung phong là MỘT nước thêm, không phải sáu giây miễn hồi lệnh. */
  private bonusMoveAvailable = false;
  private questionUsedBonus = false;

  constructor(private readonly scene: Scene, _canvas: HTMLCanvasElement) {
    this.createPaperGround();
    this.createHexBoard();
    this.createCommanderPortraits();
    this.actionListener = (event) => this.handleAction((event as CustomEvent<GameAction>).detail);
    window.addEventListener("stoic-game-action", this.actionListener as EventListener);
    this.scene.onPointerObservable.add((pointer) => {
      const name = pointer.pickInfo?.pickedMesh?.name;
      const id = name?.startsWith("hex-") ? name.slice(4) : null;
      if (pointer.type === 4) this.setHover(id);
      if (pointer.type === 1 && id) this.selectTile(id);
    });
    this.refreshAllTiles();
    this.emit();
    if (new URLSearchParams(window.location.search).has("passage")) {
      this.tiles.filter((tile) => tile.owner === "neutral" && tile.kind !== "mountain").slice(0, 5).forEach((tile) => { tile.owner = "player"; });
      this.boardStartedAt = performance.now() - 181_000;
      this.playerTileId = this.botTileId; this.selectedTileId = this.botTileId; this.placePortraits(); this.refreshAllTiles();
      window.setTimeout(() => this.requestPassage(), 350);
    }
  }

  update(): void {
    if (this.finished) return;
    const elapsed = this.elapsedBoardSeconds();
    const remaining = this.boardSecondsLeft();
    this.applyFog(remaining);
    this.expireSieges(elapsed);
    this.applyMaChaoDecay(elapsed);
    if (this.mode === "question" && this.currentQuestion && performance.now() - this.questionOpenedAt > this.currentQuestion.secondsTotal * 1000) this.resolveAnswer(false);
    if (this.mode === "passage" && this.passage && performance.now() - this.passage.startedAt > 1_200_000) this.finalizePassage(true);
    // Trận đi đồng thời: bot không được đóng băng trong lúc người chơi làm câu, nếu không
    // mở một câu hỏi là một cách dừng đối thủ vô thời hạn.
    if ((this.mode === "board" || this.mode === "question") && elapsed >= this.botCooldownUntil && this.lastBotDecisionAt !== Math.floor(elapsed)) this.botTakeAction();
    if (remaining <= 0) this.finishBoard();
    const second = Math.floor(elapsed);
    if (second !== this.lastSnapshotSecond) { this.lastSnapshotSecond = second; this.emit(); }
  }

  dispose(): void { window.removeEventListener("stoic-game-action", this.actionListener as EventListener); }

  private createPaperGround(): void {
    const ground = MeshBuilder.CreateGround("rice-paper", { width: 20, height: 17 }, this.scene);
    ground.position.y = -0.25; ground.isPickable = false;
    const material = new StandardMaterial("rice-paper-material", this.scene);
    const texture = new DynamicTexture("rice-paper-texture", { width: 1024, height: 768 }, this.scene, false);
    const ctx = texture.getContext();
    ctx.fillStyle = "#faf6ef"; ctx.fillRect(0, 0, 1024, 768);
    ctx.strokeStyle = "rgba(34,48,62,0.035)"; ctx.lineWidth = 1;
    for (let y = 8; y < 768; y += 7) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
    texture.update(false); material.diffuseTexture = texture; material.specularColor = Color3.Black(); ground.material = material;
  }

  private createHexBoard(): void {
    this.tiles.forEach((tile) => {
      const radius = tile.kind === "mountain" ? 0.79 : 0.76;
      const mesh = MeshBuilder.CreateCylinder(`hex-${tile.id}`, { height: tile.kind === "mountain" ? 0.34 : 0.14, diameter: radius * 2, tessellation: 6 }, this.scene);
      const world = axialToWorld({ q: tile.q, r: tile.r }, 0.86);
      mesh.position.set(world.x, tile.kind === "mountain" ? -0.01 : 0, world.z); mesh.rotation.y = Math.PI / 6;
      const material = new StandardMaterial(`hex-mat-${tile.id}`, this.scene); material.specularColor = Color3.Black(); mesh.material = material;
      this.tileMeshes.set(tile.id, mesh); this.tileMaterials.set(tile.id, material);
      // Đặt nhãn cho mọi ô có giá trị hơn một điểm: đó là các ô mà bảng lệnh gọi tên và
      // người chơi phải tìm được trên quân đồ.
      if (tile.kind === "fortress" || tile.kind === "pass" || tile.kind === "academy") this.createTileLabel(tile);
    });
  }

  private createTileLabel(tile: HexTileState): void {
    const texture = new DynamicTexture(`label-${tile.id}`, { width: 350, height: 64 }, this.scene, true);
    const ctx = texture.getContext(); ctx.clearRect(0, 0, 350, 64); ctx.fillStyle = "rgba(255,253,249,.9)"; ctx.fillRect(4, 6, 342, 52); ctx.strokeStyle = "#b9aa90"; ctx.lineWidth = 2; ctx.strokeRect(4, 6, 342, 52); texture.drawText(tile.name, null, 42, "700 28px 'Be Vietnam Pro'", "#22303e", "transparent", true);
    const label = MeshBuilder.CreatePlane(`label-plane-${tile.id}`, { width: 1.86, height: 0.34 }, this.scene); const world = axialToWorld({ q: tile.q, r: tile.r }, 0.86); label.position.set(world.x, 0.58, world.z + 0.4); label.billboardMode = Mesh.BILLBOARDMODE_ALL; label.isPickable = false;
    const material = new StandardMaterial(`label-mat-${tile.id}`, this.scene); material.diffuseTexture = texture; material.opacityTexture = texture; material.emissiveColor = COLORS.paper; material.specularColor = Color3.Black(); label.material = material;
  }

  private createCommanderPortraits(): void {
    const general = getGeneral(this.selectedGeneral);
    this.playerPortrait = this.createPortrait("player-general", general.portrait, 1.24, general.name, COLORS[general.accent === "sky" ? "silver" : general.accent === "gold" ? "gold" : general.accent === "jade" ? "jade" : general.accent === "silver" ? "silver" : "fire"]);
    this.botPortrait = this.createPortrait("mirror-lu-bu", "/manus-storage/lu-bu-character-portrait_0c41e4fc.png", 1.2, "Lữ Bố", COLORS.fire);
    this.placePortraits();
  }

  /**
   * Con dấu vẽ tại chỗ, dùng làm mặt mặc định của thẻ tướng.
   * Ảnh chân dung nằm trên hạ tầng lưu trữ của Manus và trả 500 ở mọi môi trường khác,
   * nên nếu lấy ảnh làm mặt mặc định thì bàn cờ hiện ô ảnh vỡ ngay khi chạy ngoài Manus.
   */
  private createSealTexture(name: string, label: string, accent: Color3): DynamicTexture {
    const texture = new DynamicTexture(name, { width: 256, height: 356 }, this.scene, true);
    texture.hasAlpha = true;
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, 256, 356);
    ctx.fillStyle = "rgba(255,253,249,0.94)"; ctx.fillRect(26, 58, 204, 240);
    ctx.strokeStyle = accent.toHexString(); ctx.lineWidth = 6; ctx.strokeRect(26, 58, 204, 240);
    texture.drawText(label, null, 190, "700 32px 'Be Vietnam Pro'", accent.toHexString(), "transparent", true);
    return texture;
  }

  private createPortrait(name: string, url: string, height: number, label: string, accent: Color3): Mesh {
    const mesh = MeshBuilder.CreatePlane(name, { width: height * 0.72, height }, this.scene);
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL; mesh.isPickable = false;
    const material = new StandardMaterial(`${name}-mat`, this.scene);
    material.emissiveColor = COLORS.paper.scale(0.35); material.specularColor = Color3.Black();
    const seal = this.createSealTexture(`${name}-seal`, label, accent);
    material.diffuseTexture = seal; material.opacityTexture = seal;
    // Dựng con dấu trước, chỉ thay bằng ảnh khi ảnh tải xong.
    const photo: Texture = new Texture(url, this.scene, false, true, undefined, () => {
      photo.hasAlpha = true; material.diffuseTexture = photo; material.opacityTexture = photo; seal.dispose();
    }, () => photo.dispose());
    mesh.material = material; return mesh;
  }

  private placePortraits(): void {
    const player = this.tileById(this.playerTileId); const bot = this.tileById(this.botTileId);
    if (this.playerPortrait && player) { const p = axialToWorld({ q: player.q, r: player.r }, 0.86); this.playerPortrait.position.set(p.x, 0.95, p.z - 0.05); }
    if (this.botPortrait && bot) { const p = axialToWorld({ q: bot.q, r: bot.r }, 0.86); this.botPortrait.position.set(p.x, 0.93, p.z - 0.05); }
  }

  private selectTile(id: string): void {
    if (this.mode !== "board" || this.finished || this.playerCooldownLeft() > 0) return;
    const tile = this.tileById(id); const source = this.tileById(this.playerTileId); if (!tile || !source || tile.owner === "mountain" || tile.lockedByFog) return;
    const elapsed = this.elapsedBoardSeconds();
    if (tile.owner === "player") {
      // Ô nhà "đang bị vây" là ô mang dấu vây CỦA ĐỐI THỦ (siegeBot). siegePlayer là dấu
      // ta để lại trên đất địch, và nó luôn bị xoá khi ta chiếm được — nên đọc nhầm
      // trường đó khiến Đơn kỵ không bao giờ kích hoạt.
      if (this.selectedGeneral === "zhao-yun" && tile.siegeBot > 0 && tile.id !== this.playerTileId) {
        tile.siegeBot = 0; this.siegeExpires.delete(tile.id); this.playerTileId = tile.id; this.boardTimePenaltySeconds += 15;
        this.playerCooldownUntil = this.elapsedBoardSeconds() + cooldownSeconds(this.playerTileCount(), this.playerVillageCount());
        this.message = `Đơn kỵ: Triệu Vân cứu ${tile.name}, xóa dấu vây và đốt 15 giây đồng hồ bàn cờ.`;
        this.addHistory("move", "Đơn kỵ", `${tile.name} được cứu viện; đồng hồ bàn cờ mất 15 giây.`); this.placePortraits(); this.refreshAllTiles(); this.emit(); return;
      }
      if (tile.id !== this.playerTileId) { this.message = `${getGeneral(this.selectedGeneral).name} không thể dịch chuyển tự do giữa các ô nhà. Hãy chiếm ô kề hoặc dùng Đơn kỵ khi có dấu vây.`; this.emit(); return; }
      this.selectedTileId = id; this.message = `${tile.name} là vị trí hiện tại của ${getGeneral(this.selectedGeneral).name}.`; this.refreshAllTiles(); this.emit(); return;
    }
    if (!canMoveTo(this.selectedGeneral, source, tile, elapsed) || !this.canTraverseTo(source, tile)) { this.message = "Ô này nằm ngoài tầm kỹ năng, không thẳng hàng hoặc Thiết kỵ đang bị đất địch chặn lối."; this.emit(); return; }
    if (tile.id === this.botTileId && this.canChallenge(tile.id)) { this.playerTileId = tile.id; this.selectedTileId = tile.id; this.placePortraits(); this.requestPassage(tile.id); return; }
    this.selectedTileId = id; this.pendingAction = { targetId: id, startedAt: performance.now(), questionSeed: this.seed++ }; this.message = `Chọn ${tile.name}. Xác nhận để mở câu chiếm ô 10 giây.`; this.refreshAllTiles(); this.emit();
  }

  private handleAction(action: GameAction): void {
    if (!action) return;
    if (action.type === "selectGeneral" && this.mode === "board" && !this.generalLocked && !this.pendingAction) {
      this.selectedGeneral = action.generalId; this.playerTileId = this.playerStartingTile(); this.selectedTileId = this.playerTileId;
      if (this.playerPortrait) this.playerPortrait.dispose(); const picked = getGeneral(action.generalId); this.playerPortrait = this.createPortrait("player-general", picked.portrait, 1.24, picked.name, COLORS[picked.accent === "sky" ? "silver" : picked.accent === "gold" ? "gold" : picked.accent === "jade" ? "jade" : picked.accent === "silver" ? "silver" : "fire"]); this.placePortraits();
      this.message = `${getGeneral(action.generalId).name}: ${getGeneral(action.generalId).strength}`; this.refreshAllTiles(); this.emit(); return;
    }
    if (action.type === "selectTile") { this.selectTile(action.tileId); return; }
    if (action.type === "hoverTile") { this.setHover(action.tileId); return; }
    if (action.type === "confirmAction" && this.pendingAction) { this.openQuestion(); return; }
    if (action.type === "cancelAction") { this.pendingAction = null; this.selectedTileId = this.playerTileId; this.refreshAllTiles(); this.emit(); return; }
    if (action.type === "answerResolved" && this.mode === "question") { this.resolveAnswer(action.correct); return; }
    if (action.type === "rerollQuestion" && this.mode === "question" && this.currentQuestion?.rerollsLeft) { this.currentQuestion = { ...this.currentQuestion, itemId: String(this.seed++), rerollsLeft: this.currentQuestion.rerollsLeft - 1 }; this.addHistory("question", "Đổi đề", "Mã Siêu đổi đề một lần; đồng hồ 10 giây vẫn tiếp tục."); this.emit(); return; }
    if (action.type === "requestPassage") { this.requestPassage(); return; }
    if (action.type === "passageAnswerResolved" && this.mode === "passage") { this.resolvePassageAnswer(action.correct); return; }
    if (action.type === "clearBattleArchive") { this.battleArchive = []; clearBattleArchiveStorage(); this.addHistory("setup", "Xóa chiến sử", "Dữ liệu các ván trước đã được xóa khỏi thiết bị này."); this.emit(); return; }
    if (action.type === "reset") this.reset();
  }

  private openQuestion(): void {
    if (!this.pendingAction) return;
    const pending = this.pendingAction;
    const tile = this.tileById(pending.targetId); if (!tile) return;
    this.questionUsedBonus = this.bonusMoveAvailable && this.elapsedBoardSeconds() < this.bonusMoveUntil;
    if (this.questionUsedBonus) this.bonusMoveAvailable = false;
    const seconds = this.questionUsedBonus ? this.extraCaptureSeconds() : answerWindowSeconds();
    this.pendingAction = null;
    this.currentQuestion = { itemId: String(pending.questionSeed), targetTileId: tile.id, targetName: tile.name, focus: `${TERRAIN_LABEL[tile.kind]} · Bậc đề ${this.tileDifficulty(tile)}`, secondsLeft: seconds, secondsTotal: seconds, rerollsLeft: this.selectedGeneral === "ma-chao" ? 1 : 0 };
    this.questionOpenedAt = performance.now(); this.mode = "question"; this.generalLocked = true; this.addHistory("question", "Câu chiếm ô", `${tile.name}: câu ${seconds} giây từ trọng tài.`); this.emit();
  }

  private resolveAnswer(correct: boolean): void {
    // Mốc của câu đang mở là currentQuestion, không phải pendingAction: openQuestion đã
    // xoá pendingAction để đóng hộp xác nhận, nên đọc lại nó ở đây là luôn thoát sớm.
    if (!this.currentQuestion) return;
    const tile = this.tileById(this.currentQuestion.targetTileId); if (!tile) return;
    const elapsed = Math.floor((performance.now() - this.questionOpenedAt) / 1000);
    const general = getGeneral(this.selectedGeneral);
    if (correct) {
      if (tile.fortifiedBy === "bot" && tile.siegePlayer < 1) {
        tile.siegePlayer = 1; this.siegeExpires.set(tile.id, { player: this.elapsedBoardSeconds() + GAME_CONSTANTS.siegeDecaySeconds });
        this.addHistory("siege", "Phá kiên thành", `${tile.name} là kiên thành: cần thêm một câu đúng liên tiếp để chiếm.`); this.recordAction(tile.name, false, elapsed);
      } else {
        tile.owner = "player"; tile.siegePlayer = 0; tile.siegeBot = 0; tile.fortifiedBy = general.id === "guan-yu" ? "player" : null; this.playerTileId = tile.id; this.siegeExpires.delete(tile.id);
        if (general.id === "ma-chao") this.maChaoCapturedAt.set(tile.id, this.elapsedBoardSeconds());
        this.addHistory("capture", "Chiếm ô", `${general.name} giữ ${tile.name} sau ${elapsed}s. Giá trị ${tile.pointValue} điểm.`); this.recordAction(tile.name, true, elapsed, tile.pointValue);
        if (general.id === "zhang-fei" && correct && !this.questionUsedBonus) {
          this.bonusMoveAvailable = true; this.bonusMoveUntil = this.elapsedBoardSeconds() + this.extraCaptureSeconds();
          this.addHistory("move", "Xung phong", `Câu đầu đúng: Trương Phi có thêm đúng một nước, cửa sổ ${this.extraCaptureSeconds()} giây.`);
        }
      }
    } else {
      tile.siegePlayer = Math.min(GAME_CONSTANTS.siegeRequired, tile.siegePlayer + 1); this.siegeExpires.set(tile.id, { ...(this.siegeExpires.get(tile.id) ?? {}), player: this.elapsedBoardSeconds() + GAME_CONSTANTS.siegeDecaySeconds }); this.addHistory("siege", "Dấu vây", `${tile.name} nhận dấu vây ${tile.siegePlayer}/${GAME_CONSTANTS.siegeRequired}. Cần một câu đúng để chiếm; dấu tan sau 60s.`); this.recordAction(tile.name, false, elapsed);
    }
    this.message = tile.owner === "player"
      ? `${general.name} giữ ${tile.name}. Chờ hồi lệnh rồi chọn ô kế tiếp.`
      : `Chưa lấy được ${tile.name}. Dấu vây ${tile.siegePlayer}/${GAME_CONSTANTS.siegeRequired} còn 60 giây.`;
    const multiplier = !correct && general.id === "zhang-fei" ? 2 : 1;
    this.playerCooldownUntil = this.elapsedBoardSeconds() + cooldownSeconds(this.playerTileCount(), this.playerVillageCount(), multiplier);
    this.questionUsedBonus = false;
    this.currentQuestion = null; this.pendingAction = null; this.mode = "board"; this.selectedTileId = this.playerTileId; this.placePortraits(); this.refreshAllTiles(); this.emit();
  }

  private canChallenge(encounterTileId = this.playerTileId): boolean { return encounterTileId === this.botTileId && this.elapsedBoardSeconds() >= 180 && this.playerTileCount() >= 8 && !this.finished && this.mode === "board"; }
  private challengeReason(): string { if (this.elapsedBoardSeconds() < 180) return "Sinh tử mở sau phút thứ ba."; if (this.playerTileCount() < 8) return "Cần giữ ít nhất 8 ô để gửi lời thách."; if (this.playerTileId !== this.botTileId) return "Tiến vào ô Lữ Bố để mở sinh tử."; return "Có thể mở passage sinh tử."; }
  private requestPassage(encounterTileId = this.playerTileId): void {
    if (!this.canChallenge(encounterTileId)) { this.message = this.challengeReason(); this.emit(); return; }
    this.passage = { index: 0, correct: 0, startedAt: performance.now(), playerPointsAtFreeze: this.points("player"), botPointsAtFreeze: this.points("bot") };
    this.mode = "passage"; this.pendingAction = null; this.currentQuestion = null; this.boardPausedAt = performance.now(); this.generalLocked = true;
    this.addHistory("question", "Sinh tử", "Bàn cờ đóng băng. Passage 13 câu, tối đa 20 phút, không kỹ năng nào can thiệp."); this.emit();
  }
  private resolvePassageAnswer(correct: boolean): void {
    if (!this.passage) return;
    if (correct) this.passage.correct += 1;
    this.passage.index += 1;
    if (this.passage.index < 13) { this.emit(); return; }
    this.finalizePassage(false);
  }
  private finalizePassage(timedOut: boolean): void {
    if (!this.passage) return;
    const elapsed = Math.floor((performance.now() - this.passage.startedAt) / 1000); const botCorrect = 8;
    const playerWins = !timedOut && (this.passage.correct > botCorrect || (this.passage.correct === botCorrect && this.passage.playerPointsAtFreeze > this.passage.botPointsAtFreeze));
    const scoreReason = timedOut ? `Hết 20 phút: ${this.passage.correct}/13 so với ${botCorrect}/13.` : `Sinh tử: ${this.passage.correct}/13 so với ${botCorrect}/13 · ${elapsed}s. Phá hoà dùng điểm lãnh thổ lúc đóng băng.`;
    this.finished = { winner: playerWins ? "player" : "bot", reason: scoreReason };
    const record: BattleRecord = { id: `passage-${Date.now()}-${this.seed}`, gameId: this.gameId, recordedAt: new Date().toISOString(), round: this.historySequence, commanderName: getGeneral(this.selectedGeneral).name, targetName: "Passage sinh tử", victory: playerWins, playerScore: this.passage.correct, enemyScore: botCorrect, elapsedSeconds: elapsed, reward: 0, skillApplied: "Không áp dụng kỹ năng trong passage." };
    this.battleArchive = [record, ...this.battleArchive].slice(0, 60); persistBattleArchive(this.battleArchive);
    this.addHistory("result", "Kết passage", this.finished.reason); this.passage = null; this.mode = "boardResult"; this.emit();
  }

  private botTakeAction(): void {
    const bot = this.tileById(this.botTileId); if (!bot) return;
    const candidates = this.tiles.filter((tile) => tile.owner !== "mountain" && tile.owner !== "bot" && !tile.lockedByFog && hexDistance({ q: bot.q, r: bot.r }, { q: tile.q, r: tile.r }) <= 1);
    const target = candidates.sort((a, b) => (a.owner === "player" ? -1 : 1) - (b.owner === "player" ? -1 : 1))[0];
    if (!target) { this.botCooldownUntil = this.elapsedBoardSeconds() + this.botAnswerSeconds() + cooldownSeconds(this.botTileCount(), this.botVillageCount()); return; }
    const botCorrect = (Math.floor(this.elapsedBoardSeconds() * 7) + target.q - target.r) % 4 !== 0;
    if (botCorrect && !(target.fortifiedBy === "player" && target.siegeBot < 1)) { target.owner = "bot"; target.siegeBot = 0; target.fortifiedBy = null; this.siegeExpires.delete(target.id); this.botTileId = target.id; this.addHistory("bot", "Lữ Bố tiến quân", `Đối thủ phản chiếu chiếm ${target.name}.`); }
    else { target.siegeBot += 1; this.siegeExpires.set(target.id, { ...(this.siegeExpires.get(target.id) ?? {}), bot: this.elapsedBoardSeconds() + GAME_CONSTANTS.siegeDecaySeconds }); this.addHistory("bot", target.fortifiedBy === "player" ? "Lữ Bố phá kiên" : "Lữ Bố vây ô", `${target.name} nhận dấu vây của đối thủ.`); }
    this.botCooldownUntil = this.elapsedBoardSeconds() + this.botAnswerSeconds() + cooldownSeconds(this.botTileCount(), this.botVillageCount()); this.lastBotDecisionAt = Math.floor(this.elapsedBoardSeconds()); this.placePortraits(); this.refreshAllTiles(); this.emit();
  }

  /**
   * Thời gian bot "đọc đề". Không có nó thì mỗi nước của bot chỉ tốn hồi lệnh còn mỗi
   * nước của người chơi tốn hồi lệnh cộng tới mười giây trả lời — bot đi nhanh gấp ba
   * và ván nào cũng thua đậm. Mục 2 của đặc tả tính một hành động trung bình 12,5 giây
   * cho CẢ HAI bên, nên bot phải trả đúng khoản đó.
   */
  private botAnswerSeconds(): number {
    const spread = Math.abs(Math.sin(this.elapsedBoardSeconds() * 1.7 + this.botTileCount()));
    return 5 + spread * 4;
  }

  private setHover(id: string | null): void { if (this.hoveredTileId === id) return; this.hoveredTileId = id; this.refreshAllTiles(); this.emit(); }

  private refreshAllTiles(): void {
    // Tính tầm đi đúng một lần cho cả bàn: gọi trong refreshTile là 91 lần quét 91 ô.
    const reachable = new Set(this.reachableTileIds());
    this.tiles.forEach((tile) => this.refreshTile(tile, reachable));
    this.drawInkRoute();
  }

  private drawInkRoute(): void {
    this.inkRoute?.dispose();
    const source = this.tileById(this.playerTileId);
    const target = this.selectedTileId ? this.tileById(this.selectedTileId) : this.tiles.find((tile) => this.reachableTileIds().includes(tile.id) && tile.owner !== "player");
    if (!source || !target || source.id === target.id) return;
    const from = axialToWorld({ q: source.q, r: source.r }, 0.86); const to = axialToWorld({ q: target.q, r: target.r }, 0.86);
    this.inkRoute = MeshBuilder.CreateLines("ink-route", { points: [new Vector3(from.x, 0.22, from.z), new Vector3((from.x + to.x) / 2, 0.26, (from.z + to.z) / 2), new Vector3(to.x, 0.22, to.z)] }, this.scene);
    this.inkRoute.color = COLORS.fire;
  }
  private refreshTile(tile: HexTileState, reachable: Set<string>): void {
    const material = this.tileMaterials.get(tile.id); const mesh = this.tileMeshes.get(tile.id);
    if (!material || !mesh) return;
    const terrain = tile.kind === "mountain" ? COLORS.mountain : COLORS[tile.kind];
    // Quyền sở hữu nằm ở màu nền VÀ độ cao của ô. Trước đây nó nằm trong emissive, mà
    // emissive lại bị trạng thái rê chuột, ô đang chọn và ô trong tầm ghi đè — nên nhìn
    // vào quân đồ không biết được ô nào của ai. Độ cao cũng là tín hiệu không phải màu,
    // đúng ràng buộc "không dùng màu làm tín hiệu duy nhất".
    material.diffuseColor = tile.owner === "player" ? Color3.Lerp(terrain, COLORS.navy, 0.62)
      : tile.owner === "bot" ? Color3.Lerp(terrain, COLORS.fire, 0.54)
      : terrain;
    material.alpha = tile.owner === "mountain" ? 0.55 : tile.lockedByFog ? 0.34 : 0.94;
    mesh.position.y = tile.kind === "mountain" ? -0.01 : tile.owner === "player" ? 0.2 : tile.owner === "bot" ? 0.11 : 0;
    // Emissive chỉ dành cho tương tác, không dành cho quyền sở hữu.
    material.emissiveColor = Color3.Black();
    if (reachable.has(tile.id)) material.emissiveColor = COLORS.gold.scale(0.16);
    if (tile.id === this.hoveredTileId) material.emissiveColor = COLORS.gold.scale(0.5);
    if (tile.id === this.selectedTileId) material.emissiveColor = COLORS.fire.scale(0.5);
  }

  private applyFog(remaining: number): void {
    const lockRing = remaining <= GAME_CONSTANTS.fogInnerAtSeconds ? 3 : remaining <= GAME_CONSTANTS.fogOuterAtSeconds ? 4 : 99;
    let changed = false; this.tiles.forEach((tile) => { const next = tile.ring >= lockRing && tile.owner !== "mountain"; if (tile.lockedByFog !== next) { tile.lockedByFog = next; changed = true; } }); if (changed) this.refreshAllTiles();
  }
  private expireSieges(elapsed: number): void {
    let changed = false;
    this.tiles.forEach((tile) => { const expiry = this.siegeExpires.get(tile.id); if (!expiry) return; if (expiry.player !== undefined && elapsed >= expiry.player) { tile.siegePlayer = 0; delete expiry.player; changed = true; } if (expiry.bot !== undefined && elapsed >= expiry.bot) { tile.siegeBot = 0; delete expiry.bot; changed = true; } if (expiry.player === undefined && expiry.bot === undefined) this.siegeExpires.delete(tile.id); });
    if (changed) this.refreshAllTiles();
  }
  private applyMaChaoDecay(elapsed: number): void {
    if (this.selectedGeneral !== "ma-chao") return;
    const source = this.tileById(this.playerTileId); if (!source) return;
    let changed = false;
    this.maChaoCapturedAt.forEach((capturedAt, id) => { const tile = this.tileById(id); if (tile && tile.owner === "player" && hexDistance({ q: source.q, r: source.r }, { q: tile.q, r: tile.r }) > 3 && elapsed - capturedAt >= 90) { tile.owner = "neutral"; tile.fortifiedBy = null; this.maChaoCapturedAt.delete(id); this.addHistory("result", "Đất rụng", `${tile.name} xa Mã Siêu quá ba ô và trở về trung lập.`); changed = true; } });
    if (changed) this.refreshAllTiles();
  }

  private boardSecondsLeft(): number { return Math.max(0, GAME_CONSTANTS.boardSeconds - this.elapsedBoardSeconds()); }
  private elapsedBoardSeconds(): number { const now = this.boardPausedAt ?? performance.now(); return Math.max(0, (now - this.boardStartedAt - this.pausedDurationMs) / 1000 + this.boardTimePenaltySeconds); }
  private playerCooldownLeft(): number { return this.bonusMoveSecondsLeft() > 0 ? 0 : Math.max(0, this.playerCooldownUntil - this.elapsedBoardSeconds()); }
  private bonusMoveSecondsLeft(): number { return this.bonusMoveAvailable ? Math.max(0, this.bonusMoveUntil - this.elapsedBoardSeconds()) : 0; }
  private extraCaptureSeconds(): number { const effect = getGeneral(this.selectedGeneral).effects.find((item) => item.kind === "extraCaptureInSameAction"); return effect?.kind === "extraCaptureInSameAction" ? effect.seconds : 6; }
  private botCooldownLeft(): number { return Math.max(0, this.botCooldownUntil - this.elapsedBoardSeconds()); }
  private playerTileCount(): number { return this.tiles.filter((tile) => tile.owner === "player").length; }
  private botTileCount(): number { return this.tiles.filter((tile) => tile.owner === "bot").length; }
  private playerVillageCount(): number { return this.tiles.filter((tile) => tile.owner === "player" && tile.kind === "village").length; }
  private botVillageCount(): number { return this.tiles.filter((tile) => tile.owner === "bot" && tile.kind === "village").length; }
  private points(owner: TileOwner): number { return this.tiles.filter((tile) => tile.owner === owner).reduce((sum, tile) => sum + tile.pointValue, 0); }
  private tileById(id: string): HexTileState | undefined { return this.tiles.find((tile) => tile.id === id); }
  private playerStartingTile(): string { return this.tiles.find((tile) => tile.owner === "player")?.id ?? "-4,0"; }
  private reachableTileIds(): string[] { const source = this.tileById(this.playerTileId); if (!source || this.mode !== "board" || this.playerCooldownLeft() > 0) return []; return this.tiles.filter((tile) => tile.owner !== "mountain" && !tile.lockedByFog && canMoveTo(this.selectedGeneral, source, tile, this.elapsedBoardSeconds()) && this.canTraverseTo(source, tile)).map((tile) => tile.id); }
  private canTraverseTo(source: HexTileState, target: HexTileState): boolean { return canTraverseRoute(this.selectedGeneral, source, target, (coord) => this.tileById(hexKey(coord))?.owner); }
  private tileDifficulty(tile: HexTileState): 1 | 2 | 3 { return tile.kind === "fortress" ? 3 : ["forest", "pass", "ford"].includes(tile.kind) ? 2 : 1; }
  private addHistory(kind: HistoryEntry["kind"], label: string, detail: string): void { this.historySequence += 1; this.history = [{ id: this.historySequence, kind, label, detail }, ...this.history].slice(0, 7); }
  private recordAction(targetName: string, victory: boolean, elapsedSeconds: number, reward = 0): void {
    const record: BattleRecord = { id: `hex-${Date.now()}-${this.seed}`, gameId: this.gameId, recordedAt: new Date().toISOString(), round: this.historySequence, commanderName: getGeneral(this.selectedGeneral).name, targetName, victory, playerScore: victory ? 1 : 0, enemyScore: 0, elapsedSeconds, reward, skillApplied: "Lợi thế tướng chỉ tác động bàn cờ." };
    this.battleArchive = [record, ...this.battleArchive].slice(0, 60); persistBattleArchive(this.battleArchive);
  }
  private finishBoard(): void { const player = this.points("player"); const bot = this.points("bot"); const winner = player === bot ? "draw" : player > bot ? "player" : "bot"; this.finished = { winner, reason: `Hết 10 phút: ${player} điểm so với ${bot} điểm.` }; this.addHistory("result", "Kết bàn cờ", this.finished.reason); this.emit(); }
  private reset(): void { this.tiles = createBoard().map((tile) => ({ ...tile, q: tile.coord.q, r: tile.coord.r, ring: hexDistance(tile.coord, { q: 0, r: 0 }), siegePlayer: 0, siegeBot: 0, fortifiedBy: null, lockedByFog: false })); this.playerTileId = "-4,0"; this.botTileId = "4,0"; this.selectedTileId = null; this.mode = "board"; this.pendingAction = null; this.currentQuestion = null; this.passage = null; this.boardPausedAt = null; this.pausedDurationMs = 0; this.generalLocked = false; this.finished = null; this.siegeExpires.clear(); this.maChaoCapturedAt.clear(); this.bonusMoveUntil = 0; this.bonusMoveAvailable = false; this.questionUsedBonus = false; this.lastBotDecisionAt = -1; this.boardStartedAt = performance.now(); this.boardTimePenaltySeconds = 0; this.playerCooldownUntil = 0; this.botCooldownUntil = 1.8; this.gameId = createGameId(); this.history = [{ id: 1, kind: "setup", label: "Ván mới", detail: "Bàn 61 ô đã được dựng lại." }]; this.historySequence = 1; this.refreshAllTiles(); this.placePortraits(); this.emit(); }

  private emit(): void {
    const general = getGeneral(this.selectedGeneral); const playerTile = this.tileById(this.playerTileId);
    const snapshot: GameSnapshot = {
      mode: this.mode, selectedGeneral: this.selectedGeneral,
      playerGeneral: { id: general.id, name: general.name, role: general.role, strength: general.strength, weakness: general.weakness, portrait: general.portrait, accent: general.accent, tileId: this.playerTileId },
      botGeneralName: `Lữ Bố · phản chiếu ${general.name}`,
      tiles: this.tiles.map((tile) => ({ ...tile })), selectedTileId: this.selectedTileId, hoveredTileId: this.hoveredTileId, reachableTileIds: this.reachableTileIds(),
      boardSecondsLeft: Math.ceil(this.boardSecondsLeft()), playerCooldownLeft: this.playerCooldownLeft(), botCooldownLeft: this.botCooldownLeft(), playerPoints: this.points("player"), botPoints: this.points("bot"), playerTileCount: this.playerTileCount(), botTileCount: this.botTileCount(), bonusMoveSeconds: this.bonusMoveSecondsLeft(),
      message: this.message, pendingAction: this.pendingAction ? { targetName: this.tileById(this.pendingAction.targetId)?.name ?? "", terrain: TERRAIN_LABEL[this.tileById(this.pendingAction.targetId)?.kind ?? "plain"], questionSeconds: answerWindowSeconds(), siegeCount: this.tileById(this.pendingAction.targetId)?.siegePlayer ?? 0 } : null,
      question: this.currentQuestion ? { ...this.currentQuestion, secondsLeft: Math.max(0, this.currentQuestion.secondsTotal - Math.floor((performance.now() - this.questionOpenedAt) / 1000)) } : null,
      passage: this.passage ? { itemId: `passage-${this.passage.index}`, questionNumber: this.passage.index + 1, totalQuestions: 13, secondsLeft: Math.max(0, 1200 - Math.floor((performance.now() - this.passage.startedAt) / 1000)), pointsAtFreeze: { player: this.passage.playerPointsAtFreeze, bot: this.passage.botPointsAtFreeze } } : null,
      canChallenge: this.canChallenge(), challengeReason: this.challengeReason(),
      history: this.history.map((entry) => ({ ...entry })), battleArchive: this.battleArchive.map((record) => ({ ...record })), battleStats: getBattleArchiveStats(this.battleArchive), finished: this.finished,
    };
    window.dispatchEvent(new CustomEvent<GameSnapshot>("stoic-game-state", { detail: snapshot }));
  }
}
