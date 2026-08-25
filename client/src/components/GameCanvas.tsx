import { useEffect, useRef, useState } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle } from "@/game/scene";
import { GENERALS, type GeneralId } from "@/game/content/generals";
import { trpc } from "@/lib/trpc";
import type { GameAction, GameSnapshot } from "@/game/types";

const EMPTY: GameSnapshot = {
  mode: "board", selectedGeneral: "zhang-fei", playerGeneral: { id: "zhang-fei", name: "Trương Phi", role: "Người mở trận", strength: "", weakness: "", portrait: "/manus-storage/zhang-fei-portrait_0f366b2d.png", accent: "fire", tileId: "-4,0" }, botGeneralName: "Lữ Bố", tiles: [], selectedTileId: null, hoveredTileId: null, reachableTileIds: [], boardSecondsLeft: 600, playerCooldownLeft: 0, botCooldownLeft: 0, playerPoints: 3, botPoints: 3, playerTileCount: 3, botTileCount: 3, bonusMoveSeconds: 0, message: "Đang dựng bàn cờ…", pendingAction: null, question: null, passage: null, canChallenge: false, challengeReason: "", history: [], battleArchive: [], battleStats: { games: 0, battles: 0, victories: 0, winRate: 0, troopsEarned: 0 }, finished: null,
};

const formatClock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const terrainLabel: Record<string, string> = { plain: "Đồng", village: "Làng", forest: "Rừng", pass: "Ải", ford: "Bến", fortress: "Thành", academy: "Học", mountain: "Núi" };

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const [state, setState] = useState<GameSnapshot>(EMPTY);
  const [item, setItem] = useState<{ itemId: string; focus: string; prompt: string; options: string[] } | null>(null);
  const [passageItem, setPassageItem] = useState<{ itemId: string; prompt: string; options: string[] } | null>(null);
  const lastQuestionRef = useRef<string | null>(null);
  const lastPassageRef = useRef<string | null>(null);
  const nextItem = trpc.game.nextBoardItem.useMutation();
  const gradeItem = trpc.game.gradeBoardItem.useMutation();
  const nextPassageItem = trpc.game.nextPassageItem.useMutation();
  const gradePassageItem = trpc.game.gradePassageItem.useMutation();
  const send = (action: GameAction) => window.dispatchEvent(new CustomEvent("stoic-game-action", { detail: action }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let handle: GameHandle | null = null;
    const onResize = () => engine.resize();
    const onState = (event: Event) => setState((event as CustomEvent<GameSnapshot>).detail);
    window.addEventListener("resize", onResize); window.addEventListener("stoic-game-state", onState as EventListener);
    createGameScene(engine, canvas).then((game) => { handle = game; engine.runRenderLoop(() => game.scene.render()); }).catch((error: unknown) => console.error("Không thể dựng bàn Ngũ Tướng", error));
    return () => { window.removeEventListener("resize", onResize); window.removeEventListener("stoic-game-state", onState as EventListener); handle?.dispose(); engine.dispose(); startedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!state.question || lastQuestionRef.current === state.question.itemId) return;
    lastQuestionRef.current = state.question.itemId; setItem(null);
    nextItem.mutate({ seed: Number(state.question.itemId) || 0 }, { onSuccess: setItem, onError: () => send({ type: "answerResolved", correct: false }) });
  }, [state.question, nextItem]);

  useEffect(() => {
    if (!state.passage || lastPassageRef.current === state.passage.itemId) return;
    lastPassageRef.current = state.passage.itemId; setPassageItem(null);
    nextPassageItem.mutate({ index: state.passage.questionNumber - 1 }, { onSuccess: setPassageItem, onError: () => send({ type: "passageAnswerResolved", correct: false }) });
  }, [state.passage, nextPassageItem]);

  const chosen = state.tiles.find((tile) => tile.id === state.selectedTileId);
  const reachable = state.tiles.filter((tile) => state.reachableTileIds.includes(tile.id) && tile.owner !== "player").slice(0, 12);
  const canAct = state.playerCooldownLeft <= 0.05 && state.mode === "board" && !state.finished;

  const submitAnswer = (answerIndex: number) => {
    if (!item || gradeItem.isPending) return;
    gradeItem.mutate({ itemId: item.itemId, answerIndex }, { onSuccess: (outcome) => send({ type: "answerResolved", correct: outcome.correct }), onError: () => send({ type: "answerResolved", correct: false }) });
  };
  const submitPassageAnswer = (answerIndex: number) => {
    if (!passageItem || gradePassageItem.isPending) return;
    gradePassageItem.mutate({ itemId: passageItem.itemId, answerIndex }, { onSuccess: (outcome) => send({ type: "passageAnswerResolved", correct: outcome.correct }), onError: () => send({ type: "passageAnswerResolved", correct: false }) });
  };

  return <div className="ngu-tuong-shell">
    <canvas ref={canvasRef} className="game-canvas" aria-label="Bàn cờ lục giác Ngũ Tướng" />
    <header className="ng-header"><div className="ng-brand"><span className="ng-seal"><i /><i /><i /><i /><i /><i /></span><div><p>STOIC IELTS · NGŨ TƯỚNG</p><h1>Binh Pháp Giấy Mực</h1></div></div><div className="ng-clock"><span>ĐỒNG HỒ BÀN CỜ</span><b>{formatClock(state.boardSecondsLeft)}</b><small>{state.boardSecondsLeft <= 90 ? "Sương mù đang khép vòng" : "Hai bên đi đồng thời"}</small></div><div className="ng-score"><span>Điểm lãnh thổ</span><b>{state.playerPoints}<i>:</i>{state.botPoints}</b><small>{state.playerTileCount} ô · {state.botTileCount} ô</small></div></header>

    <aside className="ng-command" aria-label="Điều quân">
      <div className="ng-panel-head"><span className="ng-caption">Lệnh</span><div><p>Ngũ tướng</p><h2>Chọn người cầm quân</h2></div></div>
      <div className="ng-general-grid">{GENERALS.map((general) => <button key={general.id} type="button" className={state.selectedGeneral === general.id ? "is-current" : ""} onClick={() => send({ type: "selectGeneral", generalId: general.id })}><img src={general.portrait} alt=""/><span><b>{general.name}</b><small>{general.role}</small></span></button>)}</div>
      <section className="ng-order"><p>Hồi lệnh của bạn</p><div className="ng-cooldown"><b>{state.bonusMoveSeconds > 0 ? `Xung phong ${state.bonusMoveSeconds.toFixed(1)}s` : state.playerCooldownLeft > 0 ? `${state.playerCooldownLeft.toFixed(1)}s` : "Sẵn sàng"}</b><span style={{ width: `${Math.min(100, state.playerCooldownLeft / 7 * 100)}%` }} /></div><small>Bot Lữ Bố: {state.botCooldownLeft > 0 ? `${state.botCooldownLeft.toFixed(1)}s` : "đang chọn nước"}</small></section>
      <section className="ng-selected"><p>Hex đang chọn</p><b>{chosen ? chosen.name : "Chọn ô trên quân đồ"}</b><span>{chosen ? `${terrainLabel[chosen.kind]} · ${chosen.pointValue} điểm · vây ${chosen.siegePlayer}/2` : ""}</span></section>
      <section className="ng-fallback"><p>Điểm đến trong tầm</p><div>{reachable.length ? reachable.map((tile) => <button type="button" key={tile.id} disabled={!canAct} onMouseEnter={() => send({ type: "hoverTile", tileId: tile.id })} onMouseLeave={() => send({ type: "hoverTile", tileId: null })} onClick={() => send({ type: "selectTile", tileId: tile.id })}>{tile.name}<small>{terrainLabel[tile.kind]}</small></button>) : <span>{canAct ? "Rê/chạm các hex sáng trên quân đồ." : "Chờ hồi lệnh để điều quân."}</span>}</div></section>
    </aside>

    <aside className="ng-ledger" aria-label="Sổ quân nhu">
      <div className="ng-panel-head"><span className="ng-caption">Sổ</span><div><p>Sổ quân nhu</p><h2>{state.playerGeneral.name}</h2></div></div>
      <img className="ng-general-large" src={state.playerGeneral.portrait} alt={`Chân dung ${state.playerGeneral.name}`}/><p className="ng-role">{state.playerGeneral.role}</p><div className="ng-skill"><b>{state.playerGeneral.strength.split(":")[0]}</b><span>{state.playerGeneral.strength}</span><small>Giá: {state.playerGeneral.weakness}</small></div>
      <div className="ng-terrain-legend"><p>Địa hình 61 ô</p><span>Đồng/Làng/Rừng: 1</span><span>Ải: 2</span><span>Thành trì: 3</span><span>Học cung hạ bậc đề</span></div>
      <div className="ng-mirror"><b>Đối thủ</b><span>{state.botGeneralName}</span><small>Lữ Bố không phải tướng chọn được.</small><button type="button" disabled={!state.canChallenge} onClick={() => send({ type: "requestPassage" })}>Thách đấu sinh tử</button><em>{state.challengeReason}</em></div>
    </aside>

    <section className="ng-status" aria-live="polite"><span className="ng-caption">Chiếu</span><p>{state.message}</p></section>
    <section className="ng-history" aria-label="Chiến sử"><div className="ng-history-head"><span className="ng-caption">Sử</span><div><p>Chiến sử bền</p><h2>{state.battleStats.games} ván · {state.battleStats.battles} nước</h2></div></div><div className="ng-history-stats"><span><b>{state.battleStats.winRate}%</b> đúng</span><span><b>{state.battleStats.troopsEarned}</b> thắng</span><span><b>{state.history.length}</b> lệnh</span></div><ol>{state.history.slice(0, 4).map((entry) => <li key={entry.id}><b>{entry.label}</b><span>{entry.detail}</span></li>)}</ol>{state.battleArchive.length > 0 && <button type="button" onClick={() => send({ type: "clearBattleArchive" })}>Xóa chiến sử</button>}</section>

    {state.pendingAction && <section className="ng-confirm" role="dialog" aria-modal="true"><p>Ra lệnh chiếm ô</p><h2>Xác nhận tiến vào {state.pendingAction.targetName}?</h2><div><span>{state.pendingAction.terrain}</span><b>{state.pendingAction.questionSeconds} giây</b><span>Dấu vây: {state.pendingAction.siegeCount}/2</span></div><small>Kỹ năng chỉ tác động bàn cờ. Trọng tài chấm câu học thuật độc lập.</small><footer><button type="button" onClick={() => send({ type: "cancelAction" })}>Quay lại</button><button type="button" onClick={() => send({ type: "confirmAction" })}>Mở câu chiếm ô</button></footer></section>}

    {state.mode === "question" && state.question && <section className="ng-question" aria-label="Câu chiếm ô"><header><span>{state.question.focus}</span><b>{state.question.secondsLeft}s</b></header>{item ? <><h2>{item.prompt}</h2><div>{item.options.map((option, index) => <button key={option} type="button" disabled={gradeItem.isPending} onClick={() => submitAnswer(index)}><i>{String.fromCharCode(65 + index)}</i>{option}</button>)}</div><small>Đáp án chỉ được trọng tài lưu và chấm. Kết quả không thay đổi band hay xếp hạng.</small></> : <p>Trọng tài đang phát câu hỏi…</p>}</section>}
    {state.mode === "passage" && state.passage && <section className="ng-passage" aria-label="Passage sinh tử"><header><span>PASSAGE SINH TỬ · BÀN CỜ ĐÓNG BĂNG</span><b>{formatClock(state.passage.secondsLeft)}</b></header><div className="ng-passage-score"><span>Câu {state.passage.questionNumber}/{state.passage.totalQuestions}</span><span>Điểm lúc đóng băng {state.passage.pointsAtFreeze.player}:{state.passage.pointsAtFreeze.bot}</span></div>{passageItem ? <><h2>{passageItem.prompt}</h2><div className="ng-passage-options">{passageItem.options.map((option, index) => <button key={option} type="button" disabled={gradePassageItem.isPending} onClick={() => submitPassageAnswer(index)}><i>{String.fromCharCode(65 + index)}</i>{option}</button>)}</div><small>13 câu độc lập · tối đa 20 phút · kỹ năng và địa hình không sửa nội dung hay đáp án.</small></> : <p>Trọng tài đang phát passage…</p>}</section>}
    {state.finished && <section className="ng-finish" role="dialog" aria-modal="true"><p>Quyết toán bàn cờ</p><h2>{state.finished.winner === "player" ? "Bạn giữ thế thượng phong" : state.finished.winner === "bot" ? "Lữ Bố chiếm ưu thế" : "Bàn cờ hòa"}</h2><span>{state.finished.reason}</span><button type="button" onClick={() => send({ type: "reset" })}>Dựng ván mới</button></section>}
  </div>;
}
