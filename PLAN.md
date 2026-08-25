# Game Plan: Binh Pháp Giấy Mực

## Luật Ngũ Tướng — Risk Tasks

### 1. Lưới lục giác 61 ô và sương mù cuối trận

- **Why isolated:** Bàn 61 ô, 30 ô núi và thời điểm khóa vòng ngoài dễ sai quy đổi tọa độ/range khi vừa render vừa nhận input.
- **Approach:** Tọa độ trục thuần trong `engine/hex.ts`; catalog 61 ô và 30 núi trong `content/board.ts`; Babylon chỉ đọc snapshot để dựng hex và highlight.
- **Verify:** Có đúng 61 ô chơi, 30 núi ngoài mùa; range/tuyến thẳng đúng tướng; vòng 4 và vòng 3 bị khóa theo đồng hồ mà không làm mất điểm đang giữ.

### 2. Biên giới bàn cờ và học thuật

- **Why isolated:** Kỹ năng tuyệt đối không được đổi logic học thuật và client không được nhận đáp án.
- **Approach:** `content/skills.ts` là union đóng chỉ có không gian/nhịp; `scripts/check-skill-boundary.mjs` chặn từ khóa học thuật; tRPC server phát item công khai và chấm đáp án.
- **Verify:** `pnpm test` chạy checker + unit test router; bundle client không có answer key và không kỹ năng nào thay số câu đúng/band/rating.

## Main Build

Game là prototype một người đấu bot trên lưới 61 ô chơi được. Người chơi chọn một trong năm tướng; Lữ Bố là đối thủ phản chiếu. Mỗi hành động khi hồi lệnh về không chọn một hex trong tầm, trả lời một câu 10 giây do server chấm, chiếm ô hoặc để lại dấu vây. Điểm thắng theo giá trị ô khi hết mười phút.

- **Assets needed:** texture bản đồ giấy mực 16:9, dấu Lữ Bố, dấu Gia Cát Lượng, logo ấn quân lệnh, ảnh tham chiếu scene.
- **Verify:**
  - Bấm quân tướng, vùng bản đồ và đáp án có phản hồi trực tiếp.
  - Lữ Bố nhận ưu thế `3 đúng → 4` khi tiến công trực diện; Gia Cát Lượng có đường đi thích nghi và giảm 8 giây khi làm đề.
  - Bổ sung quân tăng quân lực, kết quả tỷ thí tăng quân sau thắng.
  - UI không tràn ở desktop và mobile; văn bản, đồng hồ, số quân đọc được rõ.
  - Không dùng màu làm tín hiệu duy nhất; map có nhãn, biểu tượng và chú giải.
  - `?demo` tự chạy một nhịp Lữ Bố tiến công để screenshot nhìn thấy gameplay thật.
  - Không có lỗi console trong khi capture; màu, nhịp giấy mực và mật độ hình bám art reference.
