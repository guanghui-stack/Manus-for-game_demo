# Binh Pháp Giấy Mực · Ngũ Tướng

Prototype game chiến thuật IELTS bằng React, Babylon.js và tRPC. Game dùng lưới **61 ô chơi được** cùng 30 ô núi ngoài mùa; người chơi chọn một trong năm tướng và đấu bot Lữ Bố phản chiếu. Repo `Stoic-Ielts` chỉ là nguồn tham khảo thương hiệu, không bị sửa.

## Luật cốt lõi

| Cơ chế | Triển khai hiện tại |
|---|---|
| Hồi lệnh song song | Hai bên tự do ra lệnh khi hồi lệnh về không; số ô tăng làm hồi lệnh chậm hơn, làng giảm hồi lệnh. |
| Chiếm và vây | Câu đúng chiếm ô; sai để lại dấu vây, tối đa hai dấu và tự tan sau 60 giây. |
| Điểm | Đồng/làng/rừng/bến/học cung: 1; ải: 2; thành trì: 3; tổng bàn 75 điểm. |
| Sương mù | 90 giây cuối khóa vòng ngoài; 30 giây cuối khóa thêm một vòng. |
| Học thuật | Câu chiếm ô và passage được trọng tài server phát/chấm; kỹ năng không can thiệp đáp án, điểm học thuật hay band. |

Năm tướng chơi được gồm Trương Phi, Quan Vũ, Triệu Vân, Hoàng Trung và Mã Siêu. Kỹ năng chỉ thay đổi tầm đi, nhịp hồi lệnh, vây, phòng thủ hoặc thời gian bàn cờ.

## Passage sinh tử

Sau phút thứ ba và khi giữ từ tám ô, người chơi có thể thách đấu khi áp sát ô Lữ Bố. Passage gồm 13 câu, tối đa 20 phút; bàn cờ đóng băng, phá hòa dùng điểm lãnh thổ lúc đóng băng. Passage không dùng SkillEffect.

## Chạy cục bộ

```bash
pnpm install
pnpm dev
```

Mở `http://localhost:3000/` để chơi. Mở `http://localhost:3000/?passage` để xem luồng passage trong điều kiện luật được mô phỏng.

## Kiểm tra

```bash
pnpm check
pnpm test
pnpm build
```

`pnpm test` chạy cả checker ranh giới SkillEffect, test trọng tài server và test engine 61 ô/75 điểm.
