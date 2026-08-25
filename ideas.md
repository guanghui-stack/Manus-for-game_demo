# Định hướng thiết kế: game chiến thuật IELTS Stoic

## Ba hướng thử nghiệm

### 1. Binh Pháp Giấy Mực

**Very Brief Intro:** Một bàn cờ lãnh địa trên giấy gạo với đường biên, con dấu và quân cờ như được dập từ sổ quân nhu. Không khí điềm tĩnh, có tính toán, đặt việc học và quyết định chiến thuật lên trước hiệu ứng phô diễn.

**Probability:** 0.07

### 2. Đồ Hình Quân Cơ

**Very Brief Intro:** Thế giới chiến thuật được trình bày như bản đồ tham mưu đầu thế kỷ hai mươi, dùng lưới tọa độ, ký hiệu hành quân và giấy chép tay. Hướng này ưu tiên độ rõ ràng của dữ liệu và cảm giác một bàn tác chiến thực dụng.

**Probability:** 0.04

### 3. Trường Thi Trên Bàn Cờ

**Very Brief Intro:** Một đấu trường học thuật nơi từng câu IELTS được đóng dấu như sắc lệnh, còn lãnh địa là những tờ giấy khảo hạch ghép lại. Tông trang nghiêm hơn, đẩy mạnh cảm giác cạnh tranh bằng nhịp độ của giờ thi.

**Probability:** 0.09

---

## Hướng được chọn: Binh Pháp Giấy Mực

### Design Movement

Thiết kế theo **thủy mặc đương đại và hình học sổ sách**, kế thừa đúng chất tranh mực trên giấy gạo của Stoic-Ielts nhưng tránh biến game thành splash art. Bản đồ là trung tâm, được cảm nhận như một tờ quân đồ đã sử dụng, nơi nước đi và kết quả IELTS tạo ra lịch sử bằng dấu vết mực, con dấu và cờ hiệu.

### Core Principles

1. **Học là hành động chiến lược:** câu hỏi IELTS không phải phần phụ; nó là cách tuyển quân, chiếm vùng và kích hoạt kỹ năng.
2. **Thông tin đọc được trước khi trang trí:** mọi vùng, nước đi, chỉ số và lợi thế phải có chữ hoặc biểu tượng, không chỉ dựa vào màu.
3. **Mực thay cho ánh sáng:** không dùng hào quang vũ khí, neon, khói lửa hay glow. Chuyển động xuất hiện như nét bút, dấu đóng và quân cờ dịch chuyển.
4. **Một accent mỗi cảnh:** giao diện dùng nền kem, mực và navy; accent chính là hỏa cam của Lữ Bố. Màu phe chỉ thuộc chú giải bản đồ và nhãn phe.

### Color Philosophy

Nền kem `#faf6ef` và giấy `#fffdf9` tạo không gian bình tĩnh để người chơi đọc tiếng Anh. Mực `#22303e` giữ trật tự, navy-deep `#16293f` chỉ dành cho phòng quyết đấu cần dồn sự chú ý. Hỏa cam `#c2591f` là accent riêng của cảnh chiến trận, đưa cảm giác quyết đoán của Lữ Bố vào vùng có ý nghĩa cao như hành động tiến công, ưu thế đối đầu và trạng thái giao chiến. Thục, Ngụy, Ngô chỉ hiện tại chú giải và nhãn lãnh địa.

### Layout Paradigm

Khung trải nghiệm là một **bàn quân đồ không đối xứng**: bản đồ giấy gạo chiếm phần lớn bên trái, sổ quân nhu thẳng đứng bên phải và giấy chiến thư bật lên từ đáy khi xảy ra va chạm. Trên màn hình nhỏ, sổ quân nhu trở thành băng thông tin cuộn ngang phía dưới bản đồ, tránh biến chiến trường thành lưới thẻ cân đối.

### Signature Elements

1. **Lãnh địa có vệt mực:** mỗi vùng là một mảng địa hình thủy mặc tối giản, có mức mực riêng phản ánh quyền kiểm soát.
2. **Con dấu quân lệnh:** các khả năng, ưu thế và kết quả đúng xuất hiện bằng dấu vuông khắc mờ, không bằng badge bo tròn.
3. **Nét hành quân:** nước đi hợp lệ được đánh bằng các đường lông bút dứt khoát; tuyến thẳng của Lữ Bố khác rõ với tuyến gấp khúc của Gia Cát Lượng.

### Interaction Philosophy

Người chơi chọn tướng, chọn một vùng kề và nhận một lý do trực quan cho nước đi. Khi quân đụng độ, game chuyển sang chiến thư IELTS: tốc độ, số câu đúng và kỹ năng tướng được tổng kết công khai sau khi chấm. Không có thao tác mơ hồ: các vùng đi được, vùng có địch và vùng chiếm đóng luôn có nhãn, biểu tượng và tooltip.

### Animation

Chỉ chuyển động vì quan hệ nhân quả. Quân cờ trượt 680ms trên nét hành quân; khi chiếm vùng, mực thấm dần từ rìa vào giữa rồi một con dấu xuất hiện. Kết quả câu hỏi dùng 180ms cho trạng thái chọn và 520ms cho tổng kết. Khi `prefers-reduced-motion` được bật, chỉ giữ fade, không có vệt hành quân hay mực lan. Không dùng hoạt ảnh trong nội dung câu hỏi khi người chơi đang đọc.

### Typography System

`Playfair Display` cho tên tướng, tiêu đề chiến thư và số điểm lớn; `Source Serif 4` cho lời dẫn, nội dung câu hỏi và giải thích; `Be Vietnam Pro` cho nhãn, nút, chỉ số và timer. Đồng hồ và mọi số quân dùng `tabular-nums`. Không dùng Inter hoặc font hệ thống làm font hiển thị.

### Brand Essence

**Một bàn chiến lược IELTS cho người học muốn biến sự chính xác và tốc độ thành lợi thế lãnh địa.** Tính cách: điềm tĩnh, sắc bén, kỷ luật.

### Brand Voice

Tiêu đề và CTA dùng giọng quân lệnh ngắn, tôn trọng nỗ lực của người học và luôn nói rõ hệ quả của hành động. Không dùng lời chào chung chung hay hứa hẹn sáo rỗng.

> “Đọc đúng một câu, giữ vững một cửa ải.”

> “Tiến quân bằng hiểu biết, không bằng may rủi.”

### Wordmark & Logo

Logo là một **ấn vuông mở thành lưới sáu ô**, trong đó một nét hành quân cong thoát ra khỏi góc trên. Dấu hiệu gợi cả con dấu học thuật lẫn bản đồ chiến lược, không chứa chữ và hoạt động tốt ở kích thước favicon.

### Signature Brand Color

**Hỏa cam chiến thư `#c2591f`** là màu nhận diện của game trong hệ Stoic-Ielts, được dùng tiết chế để đánh dấu quyết định tiến công và lợi thế trực diện.

## Style Decisions

- Viewport đầu tiên luôn phải hiện bàn quân đồ bất đối xứng: bản đồ giấy gạo là khối lớn bên trái, sổ quân nhu thẳng đứng bên phải, tối thiểu một tuyến mực, dấu ấn hoặc nhãn lãnh địa nhìn thấy ngay.
- Dấu thương hiệu là ấn vuông sáu ô có một nét hành quân thoát ra; không thay bằng thumbnail chung chung hoặc wordmark thuần chữ.
- Hỏa cam `#c2591f` chỉ biểu đạt tiến công, lợi thế kỹ năng hoặc CTA quyết định. Mọi cấu trúc trung tính giữ kem, giấy, mực và navy.
