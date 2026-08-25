import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { gameAssets } from "@/game/assets";
import type {
  CommanderId,
  CommanderState,
  GameAction,
  GameMode,
  GameSnapshot,
  Owner,
  QuizQuestion,
  TerritoryId,
  TerritoryState,
} from "@/game/types";

const COLORS = {
  cream: Color3.FromHexString("#faf6ef"),
  paper: Color3.FromHexString("#fffdf9"),
  ink: Color3.FromHexString("#22303e"),
  navy: Color3.FromHexString("#1e3a5c"),
  fire: Color3.FromHexString("#c2591f"),
  silver: Color3.FromHexString("#7d97ac"),
  line: Color3.FromHexString("#e6ddcb"),
  ash: Color3.FromHexString("#77736c"),
};

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "The project was initiated in 2024.",
    options: ["It was started in 2024.", "It was delayed in 2024.", "It was rejected in 2024.", "It was copied in 2024."],
    answer: 0,
    focus: "Paraphrase",
  },
  {
    prompt: "The evidence was consistent with earlier findings.",
    options: ["It contradicted earlier findings.", "It matched earlier findings.", "It replaced earlier findings.", "It ignored earlier findings."],
    answer: 1,
    focus: "Vocabulary in context",
  },
  {
    prompt: "The policy led to a substantial reduction in waste.",
    options: ["a temporary reduction", "a minor reduction", "a significant reduction", "an unclear reduction"],
    answer: 2,
    focus: "Collocation",
  },
];

const INITIAL_TERRITORIES: TerritoryState[] = [
  { id: "ham-coc", name: "Hàm Cốc", owner: "player", position: { x: -5.2, z: 1.8 }, neighbors: ["lac-duong", "kinh-chau"] },
  { id: "lac-duong", name: "Lạc Dương", owner: "enemy", position: { x: -1.6, z: 1.8 }, neighbors: ["ham-coc", "hop-phi", "xich-bich", "kinh-chau"] },
  { id: "hop-phi", name: "Hợp Phì", owner: "enemy", position: { x: 2.5, z: 1.4 }, neighbors: ["lac-duong", "xich-bich"] },
  { id: "xich-bich", name: "Xích Bích", owner: "enemy", position: { x: 1.1, z: -1.8 }, neighbors: ["lac-duong", "hop-phi", "kinh-chau", "nam-trung"] },
  { id: "kinh-chau", name: "Kinh Châu", owner: "player", position: { x: -3.3, z: -2 }, neighbors: ["ham-coc", "lac-duong", "xich-bich", "ich-chau"] },
  { id: "ich-chau", name: "Ích Châu", owner: "neutral", position: { x: -5.7, z: -4.7 }, neighbors: ["kinh-chau", "nam-trung"] },
  { id: "nam-trung", name: "Nam Trung", owner: "neutral", position: { x: -0.7, z: -4.9 }, neighbors: ["ich-chau", "xich-bich"] },
];

const INITIAL_COMMANDERS: CommanderState[] = [
  {
    id: "lu-bu",
    name: "Lữ Bố",
    epithet: "Tiền tuyến trực diện",
    skill: "Phá tuyến",
    skillDetail: "Khi đánh thẳng mặt vào vùng địch, 3 câu đúng được tính thành 4.",
    troops: 62,
    territoryId: "ham-coc",
    accent: "fire",
  },
  {
    id: "zhuge-liang",
    name: "Gia Cát Lượng",
    epithet: "Binh pháp chuyển hướng",
    skill: "Liên hoàn kế",
    skillDetail: "Có thể đi qua một vùng kề, đề dễ hơn và giảm 8 giây khi tính giờ.",
    troops: 48,
    territoryId: "kinh-chau",
    accent: "silver",
  },
];

interface DuelState {
  targetId: TerritoryId;
  questionIndex: number;
  correct: number;
  startedAt: number;
  enemyElapsedSeconds: number;
  answers: number[];
}

interface MarchState {
  commanderId: CommanderId;
  fromId: TerritoryId;
  targetId: TerritoryId;
  startedAt: number;
  durationMs: number;
}

export class GameWorld {
  private territories = INITIAL_TERRITORIES.map((territory) => ({ ...territory, position: { ...territory.position }, neighbors: [...territory.neighbors] }));
  private commanders = INITIAL_COMMANDERS.map((commander) => ({ ...commander }));
  private territoryMeshes = new Map<TerritoryId, Mesh>();
  private territoryMaterials = new Map<TerritoryId, StandardMaterial>();
  private commanderMeshes = new Map<CommanderId, Mesh>();
  private commanderPortraitMeshes = new Map<CommanderId, Mesh>();
  private routeLines: Mesh[] = [];
  private selectedCommander: CommanderId = "lu-bu";
  private selectedTerritory: TerritoryId | null = null;
  private mode: GameMode = "map";
  private message = "Chọn tướng, rồi chọn một vùng của mình để lập tuyến tiến quân.";
  private rechargeAvailable = true;
  private round = 1;
  private duel: DuelState | null = null;
  private marching: MarchState | null = null;
  private result: GameSnapshot["result"] = null;
  private readonly actionListener: (event: Event) => void;
  private demoTimers: number[] = [];
  private lastTimerSecond = -1;
  private lastMarchSignal = -1;

  constructor(private readonly scene: Scene, private readonly canvas: HTMLCanvasElement) {
    this.createMap();
    this.createTerritoryMeshes();
    this.createCommanderMeshes();
    this.actionListener = (event) => this.handleAction((event as CustomEvent<GameAction>).detail);
    window.addEventListener("stoic-game-action", this.actionListener as EventListener);
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== 1) return;
      const name = pointerInfo.pickInfo?.pickedMesh?.name;
      if (!name?.startsWith("territory-")) return;
      this.selectTerritory(name.replace("territory-", "") as TerritoryId);
    });
    this.selectedTerritory = this.currentCommander().territoryId;
    this.drawAvailableRoutes();
    this.emit();

    const params = new URLSearchParams(window.location.search);
    if (params.has("demo") || params.has("march")) {
      this.scheduleDemo(params.has("march"));
    }
  }

  update(): void {
    if (this.marching) {
      this.updateMarch();
      return;
    }
    if (this.mode !== "quiz" || !this.duel) return;
    const elapsed = this.elapsedSeconds();
    if (elapsed !== this.lastTimerSecond) {
      this.lastTimerSecond = elapsed;
      this.emit();
    }
  }

  dispose(): void {
    window.removeEventListener("stoic-game-action", this.actionListener as EventListener);
    this.demoTimers.forEach((timer) => window.clearTimeout(timer));
    this.routeLines.forEach((line) => line.dispose());
  }

  selectTerritory(id: TerritoryId): void {
    if (this.mode !== "map" || this.marching) return;
    const territory = this.findTerritory(id);
    const commander = this.currentCommander();

    if (territory.owner === "player") {
      this.selectedTerritory = id;
      this.message = `${territory.name} đã chọn. ${commander.name} có thể tiến đến vùng có dấu mực sáng.`;
      this.drawAvailableRoutes();
      this.emit();
      return;
    }

    if (!this.selectedTerritory) {
      this.message = "Hãy chọn vùng xuất phát thuộc quân ta trước.";
      this.emit();
      return;
    }

    if (!this.isReachable(this.selectedTerritory, id, commander.id)) {
      this.message = commander.id === "lu-bu"
        ? "Lữ Bố cần một tuyến tiến công thẳng, kề vùng xuất phát."
        : "Gia Cát Lượng chỉ có thể chuyển hướng qua tối đa một vùng kề.";
      this.emit();
      return;
    }

    this.startMarch(id);
  }

  private handleAction(action: GameAction): void {
    if (!action) return;
    if (action.type === "selectCommander" && this.mode === "map") {
      this.selectedCommander = action.commanderId;
      const commander = this.currentCommander();
      this.selectedTerritory = commander.territoryId;
      this.message = `${commander.name}: ${commander.skillDetail}`;
      this.drawAvailableRoutes();
      this.emit();
      return;
    }

    if (action.type === "selectTerritory") {
      this.selectTerritory(action.territoryId);
      return;
    }

    if (action.type === "recharge" && this.mode === "map") {
      if (!this.rechargeAvailable) {
        this.message = "Quân nhu đã cấp cho lượt này. Hãy thắng một vùng để sang lượt mới.";
      } else {
        const commander = this.currentCommander();
        commander.troops += 6;
        this.rechargeAvailable = false;
        this.message = `${commander.name} nhận thêm 6 quân từ lượt luyện binh.`;
      }
      this.emit();
      return;
    }

    if (action.type === "answer" && this.mode === "quiz") {
      this.answerQuestion(action.answerIndex);
      return;
    }

    if (action.type === "closeResult" && (this.mode === "result" || this.mode === "victory")) {
      this.mode = "map";
      this.result = null;
      this.selectedTerritory = this.currentCommander().territoryId;
      this.message = "Bản đồ đã cập nhật. Chọn vùng tiếp theo để tiếp tục mở rộng lãnh địa.";
      this.drawAvailableRoutes();
      this.emit();
      return;
    }

    if (action.type === "reset") {
      this.reset();
    }
  }

  private createMap(): void {
    const map = MeshBuilder.CreateGround("rice-paper-map", { width: 18.8, height: 12.2, subdivisions: 1 }, this.scene);
    map.position.y = -0.18;
    map.isPickable = false;
    const material = new StandardMaterial("rice-paper-material", this.scene);
    material.diffuseColor = COLORS.cream;
    material.emissiveColor = COLORS.cream.scale(0.08);
    material.specularColor = Color3.Black();
    const paper = new DynamicTexture("procedural-rice-paper", { width: 1024, height: 768 }, this.scene, false);
    const context = paper.getContext() as unknown as CanvasRenderingContext2D;
    context.fillStyle = "#faf6ef";
    context.fillRect(0, 0, 1024, 768);
    context.strokeStyle = "rgba(34, 48, 62, 0.035)";
    context.lineWidth = 1;
    for (let y = 10; y < 768; y += 7) {
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(270, y - 4, 680, y + 4, 1024, y - 2);
      context.stroke();
    }
    context.strokeStyle = "rgba(78, 110, 140, 0.34)";
    context.lineWidth = 16;
    context.beginPath();
    context.moveTo(80, 560);
    context.bezierCurveTo(270, 430, 420, 610, 610, 420);
    context.bezierCurveTo(740, 290, 865, 360, 1000, 190);
    context.stroke();
    const wash = (x: number, y: number, radius: number, color: string) => {
      const gradient = context.createRadialGradient(x, y, 8, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "rgba(250, 246, 239, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    };
    wash(190, 210, 150, "rgba(34, 48, 62, 0.15)");
    wash(500, 140, 130, "rgba(34, 48, 62, 0.1)");
    wash(760, 580, 165, "rgba(119, 115, 108, 0.14)");
    wash(860, 160, 110, "rgba(194, 89, 31, 0.065)");
    paper.update(false);
    material.diffuseTexture = paper;
    map.material = material;
  }

  private createTerritoryMeshes(): void {
    this.territories.forEach((territory) => {
      const mesh = MeshBuilder.CreateDisc(`territory-${territory.id}`, { radius: 1.32, tessellation: 7, sideOrientation: 2 }, this.scene);
      mesh.rotation.x = Math.PI / 2;
      mesh.scaling.x = territory.id === "lac-duong" || territory.id === "kinh-chau" ? 1.26 : 1;
      mesh.position.set(territory.position.x, 0.01, territory.position.z);
      const material = new StandardMaterial(`territory-material-${territory.id}`, this.scene);
      material.specularColor = Color3.Black();
      material.alpha = 0.82;
      mesh.material = material;
      this.territoryMeshes.set(territory.id, mesh);
      this.territoryMaterials.set(territory.id, material);
      this.updateTerritoryVisual(territory.id);
      this.createTerritoryLabel(territory);
    });
  }

  private createTerritoryLabel(territory: TerritoryState): void {
    const texture = new DynamicTexture(`label-texture-${territory.id}`, { width: 512, height: 128 }, this.scene, true);
    texture.hasAlpha = true;
    const context = texture.getContext();
    context.clearRect(0, 0, 512, 128);
    context.fillStyle = "rgba(255, 253, 249, 0.92)";
    context.fillRect(10, 18, 492, 92);
    context.strokeStyle = "#cfc3a9";
    context.lineWidth = 4;
    context.strokeRect(10, 18, 492, 92);
    texture.drawText(territory.name, 45, 78, "700 34px 'Be Vietnam Pro'", "#22303e", "transparent", true);

    const label = MeshBuilder.CreatePlane(`label-${territory.id}`, { width: 1.82, height: 0.46 }, this.scene);
    label.position.set(territory.position.x, 0.46, territory.position.z + 0.78);
    label.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const material = new StandardMaterial(`label-material-${territory.id}`, this.scene);
    material.diffuseTexture = texture;
    material.opacityTexture = texture;
    material.emissiveColor = COLORS.paper;
    material.specularColor = Color3.Black();
    label.material = material;
  }

  private createCommanderMeshes(): void {
    this.commanders.forEach((commander) => {
      const mesh = MeshBuilder.CreateCylinder(`commander-${commander.id}`, { height: 0.32, diameterTop: 0.72, diameterBottom: 0.9, tessellation: 4 }, this.scene);
      const material = new StandardMaterial(`commander-material-${commander.id}`, this.scene);
      material.diffuseColor = commander.accent === "fire" ? COLORS.fire : COLORS.silver;
      material.emissiveColor = commander.accent === "fire" ? COLORS.fire.scale(0.25) : COLORS.silver.scale(0.22);
      material.specularColor = Color3.Black();
      mesh.material = material;
      mesh.isPickable = false;
      this.commanderMeshes.set(commander.id, mesh);
      this.updateCommanderVisual(commander.id);
      this.createCommanderPortrait(commander);
    });
  }

  private createCommanderPortrait(commander: CommanderState): void {
    const portrait = MeshBuilder.CreatePlane(`commander-portrait-${commander.id}`, { width: 1.08, height: 1.44 }, this.scene);
    const territory = this.findTerritory(commander.territoryId);
    portrait.position.set(territory.position.x, 1.07, territory.position.z - 0.15);
    portrait.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const material = new StandardMaterial(`commander-portrait-material-${commander.id}`, this.scene);
    const texture = new Texture(commander.id === "lu-bu" ? gameAssets.luBuPortrait : gameAssets.zhugeLiangPortrait, this.scene, false, true);
    texture.hasAlpha = true;
    material.diffuseTexture = texture;
    material.opacityTexture = texture;
    material.emissiveColor = commander.id === "lu-bu" ? COLORS.fire.scale(0.26) : COLORS.silver.scale(0.26);
    material.specularColor = Color3.Black();
    portrait.material = material;
    portrait.isPickable = false;
    this.commanderPortraitMeshes.set(commander.id, portrait);
  }

  private updateTerritoryVisual(id: TerritoryId): void {
    const territory = this.findTerritory(id);
    const material = this.territoryMaterials.get(id);
    if (!material) return;

    if (territory.owner === "player") {
      material.diffuseColor = COLORS.navy;
      material.alpha = 0.42;
    } else if (territory.owner === "enemy") {
      material.diffuseColor = COLORS.ash;
      material.alpha = 0.45;
    } else {
      material.diffuseColor = COLORS.cream;
      material.alpha = 0.72;
    }
  }

  private updateCommanderVisual(id: CommanderId): void {
    const commander = this.commanders.find((item) => item.id === id);
    const mesh = this.commanderMeshes.get(id);
    if (!commander || !mesh) return;
    const territory = this.findTerritory(commander.territoryId);
    this.placeCommander(id, territory.position.x, territory.position.z);
  }

  private placeCommander(id: CommanderId, x: number, z: number, marchProgress = 0, heading = 0): void {
    const mesh = this.commanderMeshes.get(id);
    if (!mesh) return;
    const bob = marchProgress > 0 ? Math.sin(marchProgress * Math.PI * 5) * 0.065 : 0;
    const scale = marchProgress > 0 ? 1 + Math.sin(marchProgress * Math.PI * 6) * 0.075 : 1;
    mesh.position.set(x, 0.34 + bob, z);
    mesh.rotation.y = marchProgress > 0 ? heading : id === "lu-bu" ? 0.2 : -0.26;
    mesh.scaling.set(scale, scale, scale);
    const portrait = this.commanderPortraitMeshes.get(id);
    if (portrait) portrait.position.set(x, 1.07 + bob, z - 0.15);
  }

  private drawAvailableRoutes(): void {
    this.routeLines.forEach((line) => line.dispose());
    this.routeLines = [];
    if (!this.selectedTerritory) return;
    const commander = this.currentCommander();
    const origin = this.findTerritory(this.selectedTerritory);
    const destinations = this.getReachableDestinations(this.selectedTerritory, commander.id);

    destinations.forEach((destinationId) => {
      const destination = this.findTerritory(destinationId);
      const color = commander.id === "lu-bu" ? COLORS.fire : COLORS.silver;
      const line = MeshBuilder.CreateLines(
        `route-${origin.id}-${destination.id}`,
        { points: [new Vector3(origin.position.x, 0.12, origin.position.z), new Vector3(destination.position.x, 0.12, destination.position.z)] },
        this.scene,
      );
      line.color = color;
      this.routeLines.push(line);
      [0.35, 0.68].forEach((progress, index) => {
        const marker = MeshBuilder.CreateCylinder(`route-pip-${origin.id}-${destination.id}-${index}`, { height: 0.06, diameter: 0.28, tessellation: 4 }, this.scene);
        marker.position.set(
          origin.position.x + (destination.position.x - origin.position.x) * progress,
          0.16,
          origin.position.z + (destination.position.z - origin.position.z) * progress,
        );
        const markerMaterial = new StandardMaterial(`route-pip-material-${origin.id}-${destination.id}-${index}`, this.scene);
        markerMaterial.diffuseColor = color;
        markerMaterial.emissiveColor = color.scale(0.14);
        markerMaterial.specularColor = Color3.Black();
        marker.material = markerMaterial;
        this.routeLines.push(marker);
      });
    });
  }

  private startMarch(targetId: TerritoryId, durationMs = 1450): void {
    if (!this.selectedTerritory) return;
    const commander = this.currentCommander();
    const origin = this.findTerritory(this.selectedTerritory);
    const target = this.findTerritory(targetId);
    this.marching = { commanderId: commander.id, fromId: origin.id, targetId, startedAt: performance.now(), durationMs };
    this.lastMarchSignal = -1;
    this.message = `${commander.name} đang hành quân từ ${origin.name} tới ${target.name}. Giữ đội hình, chờ chiến thư.`;
    this.emit();
  }

  private updateMarch(): void {
    if (!this.marching) return;
    const march = this.marching;
    const rawProgress = Math.min(1, Math.max(0, (performance.now() - march.startedAt) / march.durationMs));
    const eased = rawProgress < 0.5 ? 2 * rawProgress * rawProgress : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;
    const origin = this.findTerritory(march.fromId);
    const target = this.findTerritory(march.targetId);
    const x = origin.position.x + (target.position.x - origin.position.x) * eased;
    const z = origin.position.z + (target.position.z - origin.position.z) * eased;
    const heading = Math.atan2(target.position.x - origin.position.x, target.position.z - origin.position.z);
    this.placeCommander(march.commanderId, x, z, rawProgress, heading);
    const signal = Math.floor(rawProgress * 12);
    if (signal !== this.lastMarchSignal) {
      this.lastMarchSignal = signal;
      this.emit();
    }
    if (rawProgress < 1) return;
    this.placeCommander(march.commanderId, target.position.x, target.position.z);
    this.marching = null;
    this.beginDuel(march.targetId);
  }

  private beginDuel(targetId: TerritoryId): void {
    const target = this.findTerritory(targetId);
    this.mode = "quiz";
    this.result = null;
    this.duel = {
      targetId,
      questionIndex: 0,
      correct: 0,
      startedAt: performance.now(),
      enemyElapsedSeconds: target.owner === "enemy" ? 66 : 58,
      answers: [],
    };
    this.lastTimerSecond = -1;
    this.message = `Chiến thư đã mở tại ${target.name}. Số đúng quyết định trước, thời gian quyết định sau.`;
    this.emit();
  }

  private answerQuestion(answerIndex: number): void {
    if (!this.duel) return;
    const question = QUESTIONS[this.duel.questionIndex];
    this.duel.answers.push(answerIndex);
    if (question.answer === answerIndex) this.duel.correct += 1;
    this.duel.questionIndex += 1;

    if (this.duel.questionIndex < QUESTIONS.length) {
      this.emit();
      return;
    }

    this.resolveDuel();
  }

  private resolveDuel(): void {
    if (!this.duel) return;
    const duel = this.duel;
    const commander = this.currentCommander();
    const elapsed = this.elapsedSeconds();
    const target = this.findTerritory(duel.targetId);
    const directAssault = commander.id === "lu-bu" && this.isDirectRoute(this.selectedTerritory, target.id);
    const zhugeTimeBonus = commander.id === "zhuge-liang" ? 8 : 0;
    const adjustedElapsed = Math.max(0, elapsed - zhugeTimeBonus);
    const playerScore = duel.correct + (directAssault && duel.correct === QUESTIONS.length ? 1 : 0);
    const enemyScore = target.owner === "enemy" ? 2 : 1;
    const victory = playerScore > enemyScore || (playerScore === enemyScore && adjustedElapsed < duel.enemyElapsedSeconds);
    const skillApplied = directAssault && duel.correct === QUESTIONS.length
      ? "Phá tuyến: 3 câu đúng được tính thành 4."
      : commander.id === "zhuge-liang"
        ? "Liên hoàn kế: trừ 8 giây khi phân định thời gian."
        : "Không có ưu thế kỹ năng trong lượt này.";
    const reward = victory ? 9 + (directAssault ? 2 : 0) : 0;

    if (victory) {
      target.owner = "player";
      commander.territoryId = target.id;
      commander.troops += reward;
      this.updateTerritoryVisual(target.id);
      this.updateCommanderVisual(commander.id);
      this.round += 1;
      this.rechargeAvailable = true;
    } else {
      this.updateCommanderVisual(commander.id);
    }

    this.result = {
      victory,
      playerScore,
      enemyScore,
      elapsedSeconds: adjustedElapsed,
      enemyElapsedSeconds: duel.enemyElapsedSeconds,
      territoryName: target.name,
      skillApplied,
      reward,
    };
    this.duel = null;
    this.selectedTerritory = commander.territoryId;
    this.drawAvailableRoutes();
    this.mode = this.playerTerritoryCount() >= 4 ? "victory" : "result";
    this.message = victory ? `Chiếm được ${target.name}. Nét mực quân ta đã tiến thêm một vùng.` : `Chưa chiếm được ${target.name}. Hãy luyện binh, rồi mở chiến thư khác.`;
    this.emit();
  }

  private scheduleDemo(holdMarch = false): void {
    this.demoTimers.push(window.setTimeout(() => this.handleAction({ type: "selectCommander", commanderId: "lu-bu" }), 800));
    this.demoTimers.push(window.setTimeout(() => this.startMarch("lac-duong", holdMarch ? 6000 : 1450), 1700));
    if (holdMarch) return;
    this.demoTimers.push(window.setTimeout(() => this.handleAction({ type: "answer", answerIndex: 0 }), 3500));
    this.demoTimers.push(window.setTimeout(() => this.handleAction({ type: "answer", answerIndex: 1 }), 4300));
    this.demoTimers.push(window.setTimeout(() => this.handleAction({ type: "answer", answerIndex: 2 }), 5100));
  }

  private reset(): void {
    this.territories = INITIAL_TERRITORIES.map((territory) => ({ ...territory, position: { ...territory.position }, neighbors: [...territory.neighbors] }));
    this.commanders = INITIAL_COMMANDERS.map((commander) => ({ ...commander }));
    this.territories.forEach((territory) => this.updateTerritoryVisual(territory.id));
    this.commanders.forEach((commander) => this.updateCommanderVisual(commander.id));
    this.selectedCommander = "lu-bu";
    this.selectedTerritory = "ham-coc";
    this.mode = "map";
    this.round = 1;
    this.rechargeAvailable = true;
    this.duel = null;
    this.marching = null;
    this.result = null;
    this.message = "Bàn quân đồ đã được đặt lại. Lữ Bố sẵn sàng phá tuyến tại Hàm Cốc.";
    this.drawAvailableRoutes();
    this.emit();
  }

  private getReachableDestinations(fromId: TerritoryId, commanderId: CommanderId): TerritoryId[] {
    if (commanderId === "lu-bu") {
      return this.findTerritory(fromId).neighbors.filter((id) => this.isDirectRoute(fromId, id));
    }

    const firstRing = this.findTerritory(fromId).neighbors;
    const secondRing = firstRing.flatMap((id) => this.findTerritory(id).neighbors);
    return Array.from(new Set([...firstRing, ...secondRing])).filter((id) => id !== fromId);
  }

  private isReachable(fromId: TerritoryId, toId: TerritoryId, commanderId: CommanderId): boolean {
    return this.getReachableDestinations(fromId, commanderId).includes(toId);
  }

  private isDirectRoute(fromId: TerritoryId | null, toId: TerritoryId): boolean {
    if (!fromId) return false;
    const from = this.findTerritory(fromId);
    const to = this.findTerritory(toId);
    return from.neighbors.includes(toId) && Math.abs(from.position.z - to.position.z) < 0.75;
  }

  private elapsedSeconds(): number {
    if (!this.duel) return 0;
    return Math.max(1, Math.floor((performance.now() - this.duel.startedAt) / 1000));
  }

  private currentCommander(): CommanderState {
    return this.commanders.find((commander) => commander.id === this.selectedCommander) ?? this.commanders[0];
  }

  private findTerritory(id: TerritoryId): TerritoryState {
    const territory = this.territories.find((item) => item.id === id);
    if (!territory) throw new Error(`Unknown territory: ${id}`);
    return territory;
  }

  private playerTerritoryCount(): number {
    return this.territories.filter((territory) => territory.owner === "player").length;
  }

  private emit(): void {
    const commander = this.currentCommander();
    const currentQuestion = this.duel ? QUESTIONS[this.duel.questionIndex] : null;
    const target = this.duel ? this.findTerritory(this.duel.targetId) : null;
    const snapshot: GameSnapshot = {
      mode: this.mode,
      selectedCommander: this.selectedCommander,
      selectedTerritory: this.selectedTerritory,
      availableDestinations: this.selectedTerritory ? this.getReachableDestinations(this.selectedTerritory, this.selectedCommander) : [],
      territories: this.territories.map((territory) => ({ ...territory, position: { ...territory.position }, neighbors: [...territory.neighbors] })),
      commanders: this.commanders.map((item) => ({ ...item })),
      playerTerritories: this.playerTerritoryCount(),
      totalTerritories: this.territories.length,
      message: this.message,
      rechargeAvailable: this.rechargeAvailable,
      round: this.round,
      march: this.marching ? {
        commanderName: this.commanders.find((item) => item.id === this.marching?.commanderId)?.name ?? commander.name,
        originName: this.findTerritory(this.marching.fromId).name,
        targetName: this.findTerritory(this.marching.targetId).name,
        progress: Math.min(1, Math.max(0, (performance.now() - this.marching.startedAt) / this.marching.durationMs)),
      } : null,
      quiz: currentQuestion && this.duel && target ? {
        question: currentQuestion,
        questionNumber: this.duel.questionIndex + 1,
        totalQuestions: QUESTIONS.length,
        elapsedSeconds: this.elapsedSeconds(),
        enemyElapsedSeconds: this.duel.enemyElapsedSeconds,
        correctSoFar: this.duel.correct,
        commanderName: commander.name,
        skillNote: commander.id === "lu-bu" ? "Nếu phá tuyến trực diện và đúng cả ba câu: 3 đúng → 4." : "Liên hoàn kế giảm 8 giây khi so thời gian.",
        targetName: target.name,
      } : null,
      result: this.result,
    };
    window.dispatchEvent(new CustomEvent<GameSnapshot>("stoic-game-state", { detail: snapshot }));
  }
}
