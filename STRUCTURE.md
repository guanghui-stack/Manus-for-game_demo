# Kiến trúc runtime

| Module | Trách nhiệm |
|---|---|
| `game/engine/` | Hex math, cooldown, range và luật thuần; không DOM/Babylon/fetch. |
| `game/content/` | Catalog tướng, SkillEffect union đóng, catalog 61 ô và hằng số; dữ liệu không chứa code học thuật. |
| `game/GameWorld.ts` | Adapter render/input: đọc engine state, dựng Babylon và phát semantic event. |
| `components/GameCanvas.tsx` | Khung React, HUD và gọi tRPC phát/chấm item; không quyết định thắng thua. |
| `server/gameRouter.ts` | Trọng tài item: chỉ server giữ answer key, client nhận prompt/options và kết quả đúng/sai. |

React là khung ảnh. Babylon là canvas. `GameWorld` là luật chơi. HUD không chứa luật thắng thua, không trực tiếp chạm mesh, và chỉ gửi semantic action như `selectCommander`, `recharge`, `answer`.

## Trạng thái

`map → quiz → result → victory`

Map là trạng thái lựa chọn quân và vùng. Quiz bắt đầu khi tiến công một vùng có thể đến được. Result hiển thị phân định số câu đúng rồi thời gian. Victory chặn tiến công mới sau khi người chơi nắm tối thiểu bốn trong bảy vùng.
