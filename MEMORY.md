# Ghi nhớ triển khai

- Repo Stoic-Ielts yêu cầu nền kem, mực và dải navy-deep chỉ ở khu cần tập trung; game sử dụng dải navy-deep cho HUD chiến trận.
- Bản đồ không tô vùng bằng màu phe phẳng. Quyền sở hữu dùng mức mực, nhãn và dấu; màu phe chỉ nằm trong chú giải.
- Không dùng chữ Hán, gạch ngang dài, glow hoặc hào quang vũ khí.
- Luật Ngũ Tướng thay ràng buộc cũ: Lữ Bố là bot phản chiếu, năm tướng còn lại là lựa chọn người chơi. Kỹ năng chỉ tác động không gian/nhịp; không đổi điểm học thuật.
- Các item chiếm ô được phát/chấm qua `server/gameRouter.ts`; không đóng gói answer key vào client.
- `?demo` tự kích hoạt một cuộc tiến công của Lữ Bố để hỗ trợ kiểm thử trực quan.
