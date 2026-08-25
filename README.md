# Binh Pháp Giấy Mực

Prototype browser game chiến thuật IELTS bằng React 19 và Babylon.js, được thiết kế để tích hợp về sau với Stoic-Ielts. Game hiện độc lập hoàn toàn ở client-side; Stoic-Ielts chỉ là nguồn tham khảo brand guideline, không bị sửa trong quá trình này.

## Vòng lặp chơi

Người chơi chọn **Lữ Bố** hoặc **Gia Cát Lượng**, chọn lãnh địa xuất phát và tiến công một vùng có thể tới. Va chạm mở chiến thư IELTS ba câu dạng paraphrase, vocabulary và collocation. Thắng dựa trên số câu đúng trước, thời gian sau; ai chiếm tối thiểu bốn trong bảy vùng thắng ván.

| Tướng | Kỹ năng | Tác dụng trong prototype |
|---|---|---|
| Lữ Bố | Phá tuyến | Khi tiến công trực diện và làm đúng cả ba câu, `3 đúng` được tính thành `4`. |
| Gia Cát Lượng | Liên hoàn kế | Có thể chuyển hướng qua tối đa một vùng kề và được trừ 8 giây khi so thời gian. |

Quân lực tăng qua **Luyện binh** và phần thưởng thắng chiến thư. Chế độ `?demo` tự chạy một cuộc tiến công Lữ Bố để phục vụ kiểm thử trực quan.

## Chạy cục bộ

```bash
pnpm install
pnpm dev
```

Sau đó mở `http://localhost:3000/` để chơi trực tiếp bằng cách chọn vùng trên quân đồ hoặc dùng **Bảng lệnh** bên trái; `http://localhost:3000/?demo` để xem chuỗi tự chơi; `http://localhost:3000/?march` để quan sát trọn vẹn hoạt ảnh hành quân; hoặc `http://localhost:3000/?confirm` để kiểm tra hộp xác nhận tiến công.

## Kiểm tra

```bash
pnpm check
pnpm build
```

Các tài liệu `PLAN.md`, `STRUCTURE.md`, `MEMORY.md` và `ASSETS.md` lưu lại quyết định, cấu trúc và asset để có thể tiếp tục phát triển hoặc merge vào Stoic-Ielts.
