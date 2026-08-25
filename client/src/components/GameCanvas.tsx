// Binh Pháp Giấy Mực: React chỉ là khung ảnh; Babylon sở hữu bàn quân đồ, luật chơi nằm trong GameWorld.
import { useEffect, useMemo, useRef, useState } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { gameAssets } from "@/game/assets";
import { createGameScene, type GameHandle } from "@/game/scene";
import type { CommanderId, GameAction, GameSnapshot, Owner } from "@/game/types";

const initialState: GameSnapshot = {
  mode: "map",
  selectedCommander: "lu-bu",
  selectedTerritory: null,
  availableDestinations: [],
  territories: [],
  commanders: [],
  playerTerritories: 0,
  totalTerritories: 7,
  message: "Đang dựng quân đồ…",
  rechargeAvailable: true,
  round: 1,
  march: null,
  quiz: null,
  result: null,
};

function ownerLabel(owner: Owner) {
  if (owner === "player") return "Quân ta";
  if (owner === "enemy") return "Đối thủ";
  return "Chưa chiếm";
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const [state, setState] = useState<GameSnapshot>(initialState);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let handle: GameHandle | null = null;
    const onResize = () => engine.resize();
    const onState = (event: Event) => setState((event as CustomEvent<GameSnapshot>).detail);
    window.addEventListener("resize", onResize);
    window.addEventListener("stoic-game-state", onState as EventListener);
    createGameScene(engine, canvas)
      .then((gameHandle) => {
        handle = gameHandle;
        engine.runRenderLoop(() => gameHandle.scene.render());
      })
      .catch((error: unknown) => console.error("Không thể dựng quân đồ Babylon", error));

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("stoic-game-state", onState as EventListener);
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, []);

  const activeCommander = useMemo(
    () => state.commanders.find((commander) => commander.id === state.selectedCommander),
    [state.commanders, state.selectedCommander],
  );

  const send = (action: GameAction) => window.dispatchEvent(new CustomEvent<GameAction>("stoic-game-action", { detail: action }));

  return (
    <div className="game-shell">
      <canvas ref={canvasRef} className="game-canvas" aria-label="Bản đồ chiến thuật IELTS" />

      <header className="game-header">
        <div className="brand-lockup">
          <div className="brand-mark-shell" aria-label="Dấu ấn quân đồ sáu ô">
            <img className="brand-mark" src={gameAssets.mark} alt="" />
            <span className="brand-grid" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
            <span className="brand-route" aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Stoic IELTS · Bản thử nghiệm</p>
            <h1>Binh Pháp Giấy Mực</h1>
          </div>
        </div>
        <div className="header-rule" />
        <div className="round-readout"><span>Vòng {state.round}</span><strong>{state.playerTerritories}/{state.totalTerritories} vùng</strong></div>
      </header>

      <aside className="ledger-panel" aria-label="Sổ quân nhu">
        <div className="ledger-title">
          <p className="eyebrow">Sổ quân nhu</p>
          <h2>Giữ 4 vùng để thắng</h2>
        </div>

        <div className="commander-stack">
          {state.commanders.map((commander) => (
            <button
              key={commander.id}
              type="button"
              className={`commander-card ${state.selectedCommander === commander.id ? "is-active" : ""} commander-${commander.id}`}
              onClick={() => send({ type: "selectCommander", commanderId: commander.id as CommanderId })}
            >
              <span className={`commander-portrait commander-portrait-${commander.id}`}>
                <img src={commander.id === "lu-bu" ? gameAssets.luBuPortrait : gameAssets.zhugeLiangPortrait} alt={`Chân dung ${commander.name}`} />
              </span>
              <span className="commander-copy">
                <span className="commander-name">{commander.name}</span>
                <span>{commander.epithet}</span>
              </span>
              <span className="troop-count"><b>{commander.troops}</b><small>quân</small></span>
            </button>
          ))}
        </div>

        <div className="skill-card">
          <span className="seal-mini">Kỹ</span>
          <div>
            <p>{activeCommander?.skill ?? "Phá tuyến"}</p>
            <span>{activeCommander?.skillDetail ?? "Đang điểm binh."}</span>
          </div>
        </div>

        <button className="training-button" type="button" onClick={() => send({ type: "recharge" })}>
          <span>+6</span>
          <b>{state.rechargeAvailable ? "Luyện binh" : "Đã cấp quân"}</b>
        </button>

        <div className="territory-list" aria-label="Tình hình lãnh địa">
          {state.territories.map((territory) => (
            <div className={`territory-row owner-${territory.owner} ${state.selectedTerritory === territory.id ? "is-selected" : ""}`} key={territory.id}>
              <span className="territory-dot" aria-hidden="true" />
              <span>{territory.name}</span>
              <small>{ownerLabel(territory.owner)}</small>
            </div>
          ))}
        </div>

        <div className="faction-legend" aria-label="Chú giải phe">
          <span><i className="legend-wei" />Ngụy</span>
          <span><i className="legend-shu" />Thục</span>
          <span><i className="legend-wu" />Ngô</span>
        </div>
      </aside>

      <section className="map-caption" aria-live="polite">
        <span className="caption-seal">Lệnh</span>
        <p>{state.message}</p>
      </section>

      {state.mode === "map" && <div className="map-instruction">Bấm vùng có mực navy để xuất phát, rồi bấm vùng có tuyến hành quân.</div>}

      {state.mode === "map" && (
        <div className="battle-key" aria-label="Trạng thái nước đi">
          <span className="attack-stamp">{state.march ? "Đi" : "Công"}</span>
          <div>
            <b>{state.march ? `${state.march.commanderName} đang hành quân` : "Phá tuyến đang chờ lệnh"}</b>
            <small>{state.march ? `${state.march.originName} → ${state.march.targetName}` : "Hỏa cam chỉ xuất hiện khi nước đi tạo ưu thế."}</small>
            {state.march && <span className="march-progress" aria-label="Tiến độ hành quân"><i style={{ width: `${Math.round(state.march.progress * 100)}%` }} /></span>}
          </div>
        </div>
      )}

      {state.mode === "quiz" && state.quiz && (
        <section className="duel-sheet" aria-label="Chiến thư IELTS">
          <div className="duel-topline">
            <span className="eyebrow">Chiến thư tại {state.quiz.targetName}</span>
            <span className="timer">{String(state.quiz.elapsedSeconds).padStart(2, "0")}s</span>
          </div>
          <div className="duel-scoreline">
            <span>{state.quiz.commanderName}</span>
            <b>{state.quiz.questionNumber}/{state.quiz.totalQuestions}</b>
            <span>Đối thủ {state.quiz.enemyElapsedSeconds}s</span>
          </div>
          <p className="question-focus">{state.quiz.question.focus}</p>
          <h2>{state.quiz.question.prompt}</h2>
          <div className="answer-grid">
            {state.quiz.question.options.map((option, index) => (
              <button key={option} type="button" onClick={() => send({ type: "answer", answerIndex: index })}>
                <span>{String.fromCharCode(65 + index)}</span>{option}
              </button>
            ))}
          </div>
          <p className="skill-note">{state.quiz.skillNote}</p>
        </section>
      )}

      {(state.mode === "result" || state.mode === "victory") && state.result && (
        <section className={`result-sheet ${state.result.victory ? "is-victory" : "is-loss"}`} aria-label="Kết quả tỷ thí">
          <p className="eyebrow">{state.mode === "victory" ? "Quân đồ đã định" : "Quyết toán chiến thư"}</p>
          <h2>{state.mode === "victory" ? "Nắm quá nửa lãnh địa" : state.result.victory ? `Giữ được ${state.result.territoryName}` : `Chưa lấy được ${state.result.territoryName}`}</h2>
          <div className="result-stats">
            <div><span>Chính xác</span><b>{state.result.playerScore} : {state.result.enemyScore}</b></div>
            <div><span>Thời gian</span><b>{state.result.elapsedSeconds}s : {state.result.enemyElapsedSeconds}s</b></div>
          </div>
          <p className="result-skill">{state.result.skillApplied}</p>
          {state.result.victory && <p className="reward-line">Quân lực bổ sung: <strong>+{state.result.reward}</strong></p>}
          <button className="result-button" type="button" onClick={() => send({ type: state.mode === "victory" ? "reset" : "closeResult" })}>
            {state.mode === "victory" ? "Dựng lại quân đồ" : "Trở về bản đồ"}
          </button>
        </section>
      )}
    </div>
  );
}
