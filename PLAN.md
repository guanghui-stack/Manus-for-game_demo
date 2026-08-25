# Game Plan: Binh Pháp Giấy Mực

## Risk Tasks

### 1. Bản đồ Babylon có vùng chọn và hành quân

- **Why isolated:** Vùng lãnh địa phải vừa đọc được như quân đồ giấy mực vừa nhận thao tác chạm trên canvas, không được che mất HUD.
- **Approach:** Dùng mặt phẳng bản đồ có texture thủy mặc, bảy vùng dạng lục giác nông để nhận pointer pick, và các tuyến hành quân Babylon Lines. Bản đồ cố định góc nhìn 3/4, không cần pathfinding động.
- **Verify:** Chọn Lữ Bố, bấm Hàm Cốc rồi Lạc Dương mở được chiến thư; vùng hợp lệ có nhãn và vệt hành quân; vùng không hợp lệ có phản hồi bằng chữ.

### 2. Chuyển trạng thái map sang tỷ thí IELTS

- **Why isolated:** Một lượt phải chuyển ổn định giữa chọn quân, làm ba câu, phân định thắng thua, chiếm lãnh địa và quay lại map.
- **Approach:** `GameWorld` sở hữu state machine `map → quiz → result → victory`, React HUD chỉ hiển thị snapshot và phát semantic action qua custom event.
- **Verify:** Chọn đáp án đủ ba lần chuyển sang kết quả; số đúng, thời gian, ưu thế kỹ năng, quân lực và quyền sở hữu vùng được cập nhật mà không reload canvas.

## Main Build

Game là một prototype trình duyệt Babylon.js gồm bảy vùng lãnh địa. Người chơi điều khiển Lữ Bố hoặc Gia Cát Lượng, chọn một vùng thuộc mình rồi tiến công vùng kề. Mỗi va chạm mở chiến thư gồm ba câu IELTS ngắn dạng paraphrase, vocabulary và collocation. Thắng dựa trên số câu đúng trước, thời gian sau. Giữ bốn trong bảy vùng để đạt quá nửa lãnh thổ.

- **Assets needed:** texture bản đồ giấy mực 16:9, dấu Lữ Bố, dấu Gia Cát Lượng, logo ấn quân lệnh, ảnh tham chiếu scene.
- **Verify:**
  - Bấm quân tướng, vùng bản đồ và đáp án có phản hồi trực tiếp.
  - Lữ Bố nhận ưu thế `3 đúng → 4` khi tiến công trực diện; Gia Cát Lượng có đường đi thích nghi và giảm 8 giây khi làm đề.
  - Bổ sung quân tăng quân lực, kết quả tỷ thí tăng quân sau thắng.
  - UI không tràn ở desktop và mobile; văn bản, đồng hồ, số quân đọc được rõ.
  - Không dùng màu làm tín hiệu duy nhất; map có nhãn, biểu tượng và chú giải.
  - `?demo` tự chạy một nhịp Lữ Bố tiến công để screenshot nhìn thấy gameplay thật.
  - Không có lỗi console trong khi capture; màu, nhịp giấy mực và mật độ hình bám art reference.
