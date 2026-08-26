import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
// Bản ES6 của Babylon chỉ gắn Scene.prototype.pick khi module này được nạp.
// Thiếu nó thì pickInfo luôn rỗng và không click được ô nào trên quân đồ.
import "@babylonjs/core/Culling/ray";
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

  // Bàn bán kính 5 trải tới x = +-8,2 và z = +-7,2. Khung cũ ngắm lệch trái và ở cự ly
  // 17,5 nên rìa phải cùng hàng dưới của quân đồ bị cắt khỏi khung hình.
  const camera = new ArcRotateCamera("tactical-camera", -Math.PI / 2, 0.78, 21, new Vector3(0, 0, -0.4), scene);
  camera.lowerRadiusLimit = 21;
  camera.upperRadiusLimit = 21;
  camera.lowerBetaLimit = 0.78;
  camera.upperBetaLimit = 0.78;
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
