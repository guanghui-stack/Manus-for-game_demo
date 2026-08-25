import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Bản ES6 của Babylon chỉ gắn Scene.prototype.pick khi "@babylonjs/core/Culling/ray"
 * được nạp. Thiếu import này thì mọi pickInfo đều rỗng: quân đồ không nhận click, không
 * nhận rê chuột, và lỗi không hiện ra ở tsc lẫn ở console. Đã hỏng một lần vì đúng lý do
 * này, nên khoá lại bằng test.
 */
describe("Babylon tree-shaking guards", () => {
  const scene = readFileSync(new URL("../scene.ts", import.meta.url), "utf8");

  it("loads the ray side-effect module so hex picking works", () => {
    expect(scene).toContain('import "@babylonjs/core/Culling/ray"');
  });

  it("loads the default shaders so the board renders", () => {
    expect(scene).toContain('import "@babylonjs/core/Shaders/default.vertex"');
    expect(scene).toContain('import "@babylonjs/core/Shaders/default.fragment"');
  });
});
