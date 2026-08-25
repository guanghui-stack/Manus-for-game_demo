# Kiến trúc runtime

| Module | Trách nhiệm |
|---|---|
| `components/GameCanvas.tsx` | Vòng đời Engine React, HUD DOM và điều phối action người chơi. |
| `game/scene.ts` | Tạo scene, camera, ánh sáng và gắn vòng cập nhật. |
| `game/GameWorld.ts` | Sở hữu state machine, lãnh địa, chọn tướng, tính kỹ năng, tỷ thí, quân lực và cleanup listener. |
| `game/types.ts` | Kiểu dữ liệu thuần cho snapshot UI, command, territory, commander và quiz. |
| `game/assets.ts` | Manifest URL của asset sinh cho WebDev. |

React là khung ảnh. Babylon là canvas. `GameWorld` là luật chơi. HUD không chứa luật thắng thua, không trực tiếp chạm mesh, và chỉ gửi semantic action như `selectCommander`, `recharge`, `answer`.

## Trạng thái

`map → quiz → result → victory`

Map là trạng thái lựa chọn quân và vùng. Quiz bắt đầu khi tiến công một vùng có thể đến được. Result hiển thị phân định số câu đúng rồi thời gian. Victory chặn tiến công mới sau khi người chơi nắm tối thiểu bốn trong bảy vùng.
