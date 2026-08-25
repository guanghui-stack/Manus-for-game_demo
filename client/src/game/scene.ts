import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { GameWorld } from "@/game/GameWorld";

export interface GameHandle {
  scene: Scene;
  dispose: () => void;
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.98, 0.965, 0.937, 1);

  const camera = new ArcRotateCamera("tactical-camera", -Math.PI / 2.18, 0.82, 17.5, new Vector3(-1.1, 0, -1.2), scene);
  camera.lowerRadiusLimit = 17.5;
  camera.upperRadiusLimit = 17.5;
  camera.lowerBetaLimit = 0.82;
  camera.upperBetaLimit = 0.82;
  camera.attachControl(canvas, true);
  camera.panningSensibility = 0;
  camera.wheelPrecision = 999999;

  const ambient = new HemisphericLight("paper-light", new Vector3(0, 1, 0), scene);
  ambient.intensity = 1.25;
  ambient.groundColor = new Color3(0.79, 0.74, 0.66);

  const world = new GameWorld(scene, canvas);
  scene.onBeforeRenderObservable.add(() => world.update());

  return {
    scene,
    dispose: () => {
      world.dispose();
      scene.dispose();
    },
  };
}
