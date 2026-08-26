# Luật chơi Ngũ Tướng

Game chiến thuật chiếm lãnh địa trên lưới lục giác, dựng trên đúng sáu tướng đã có
trong `guanghui-stack/Stoic-Ielts` (`src/lib/story/generals.ts`).

Trạng thái: **đặc tả đã chốt phần khung, chưa chốt phần số.** Mọi hằng số ở mục 8 là
điểm khởi đầu để chỉnh sau khi chơi thử. Mọi thứ ở mục 0 thì không.

Repo Stoic-Ielts vẫn là nguồn tham chiếu chỉ đọc. Không sửa, không commit, không push
sang đó. Khi nào game ghép về website thì các ràng buộc ở mục 0 phải đi theo.

---

## 0. Ranh giới bất di bất dịch

`src/lib/story/generals.ts` bên Stoic-Ielts viết ba điều sáu tướng không được làm:

> "không trao điểm thưởng hay lợi thế nào, không tạo phe phái để người học chọn,
> không thay đổi ngưỡng chấm điểm của bất kỳ bài nào."

Game này cần tướng có lợi thế. Chủ dự án đã quyết: **cho phép, nhưng chỉ ở lớp bàn cờ.**
Ranh giới đó là luật, không phải hướng dẫn.

### Luật

Game có hai lớp, và một đường biên giữa chúng không ai được vượt.

**Lớp bàn cờ.** Tướng có kỹ năng. Kỹ năng chỉ được tác động lên đúng hai thứ:

- **không gian** — đi đâu, xa bao nhiêu, theo hướng nào, thấy được gì;
- **nhịp** — bao lâu được đi tiếp, được bao nhiêu giây cho một câu, được đổi câu hay không.

Câu hỏi 10 giây ở lớp này là điểm trò chơi. Nó **không** là điểm học thuật.

**Lớp học thuật.** Trận thách đấu bằng passage chấm theo đúng logic đã có của
Stoic-Ielts. Không kỹ năng nào, không vật phẩm nào, không đồng xu nào chạm vào đây.

**Ba điều không kỹ năng nào được làm:**

1. Cộng, trừ hoặc đổi số câu đúng của bất kỳ ai.
2. Đổi ngưỡng chấm, đổi band, đổi điểm xếp hạng.
3. Tác động lên trận passage ở mục 5 dưới bất kỳ hình thức nào, trừ đúng một ngoại lệ
   được nêu tên ở mục 4: quyền chọn dạng passage.

Vì luật này, kỹ năng "+1 câu đúng" trong bản phác đầu tiên đã bị bỏ. Nó không chỉ phạm
ranh giới, nó còn phá tính công bằng của xếp hạng mà `test:integrity`, `test:rating`,
`test:attestation` bên Stoic-Ielts đang canh.

### Cách ép luật này bằng mã, không bằng lời nhắc

Lời nhắc trong tài liệu sẽ bị phá. Kiểu dữ liệu thì không. Làm giống cách Stoic-Ielts ép
`containsText: false` trong `art-manifest.ts` — ép cứng bằng kiểu, không ai đặt nhầm được.

Hiệu ứng kỹ năng phải là một **union đóng**, chỉ gồm các biến thể thuộc lớp bàn cờ:

```ts
// content/skills.ts — union này là ranh giới ở mục 0, viết bằng kiểu dữ liệu.
// Thêm một biến thể vào đây là thay đổi ranh giới. Không làm nếu chưa có
// quyết định mới của chủ dự án.
export type SkillEffect =
  // không gian
  | { kind: "range"; hexes: number }
  | { kind: "straightLineOnly"; hexes: number }
  | { kind: "jumpToBesiegedHome" }
  | { kind: "hiddenInForest" }
  // nhịp
  | { kind: "cooldownMultiplier"; factor: number }
  | { kind: "cooldownPenaltyOnMiss"; factor: number }
  | { kind: "answerSecondsDelta"; seconds: number }
  | { kind: "extraCaptureInSameAction"; seconds: number }
  | { kind: "rerollItem"; timesPerAction: number }
  // sở hữu ô
  | { kind: "fortify"; correctAnswersToBreak: number }
  | { kind: "decayIfFarFromCommander"; maxHexes: number; seconds: number }
  | { kind: "rangeSchedule"; steps: { atSecond: number; hexes: number }[] }
  | { kind: "replayBonusHexes"; hexes: number };
```

Không có biến thể nào nhận `score`, `band`, `correctCount`, `threshold` hay `rating`.
Muốn thêm một kỹ năng chạm vào chấm điểm thì phải sửa union này, và sửa union là một
diff nhìn thấy được trong code review.

Thêm một kiểm tra chạy trong `npm test`, theo đúng kiểu `test:no-han` bên Stoic-Ielts:

- `scripts/check-skill-boundary.mjs` — quét `content/skills.ts`, fail nếu bắt gặp
  `score`, `band`, `correctCount`, `threshold`, `rating` trong bất kỳ định nghĩa hiệu
  ứng nào; fail nếu module lớp học thuật import từ `content/skills.ts`.

### Điều luật này KHÔNG cấm

Kết quả câu 10 giây vẫn nên chảy ngược về việc học — nhưng chảy vào **hồ sơ điểm yếu**
(`test:weakness` bên Stoic-Ielts), không chảy vào band và không chảy vào xếp hạng.
Sai một câu collocation lúc mười giờ đêm trong một ván game là dữ liệu học tập tốt,
không phải căn cứ chấm điểm.

---

## 1. Bàn cờ

Lưới lục giác, toạ độ trục `(q, r)`, đỉnh nhọn hướng lên.

- **Vẽ** bàn hình lục giác bán kính 5 — 91 ô.
- **Chơi** trên 61 ô ở giữa (bán kính 4). Ba mươi ô còn lại là núi và ô ngoài mùa.

Vẽ rộng hơn phần chơi là có chủ ý: bàn nhìn rộng và có địa hình, mà đồng hồ vẫn đúng.
61 là con số tính ngược từ mười phút, xem mục 2.

Cờ **"ngoài mùa"** giữ nguyên từ bảng lãnh địa đang có: mỗi mùa khoá thêm khoảng hai mươi
ô thành đá xám không đi được. Mỗi mùa bàn có hình dạng khác, nút thắt khác, tướng mạnh
khác — mà vẫn dùng đúng một bộ asset. Đây là cách rẻ nhất để game sống nhiều mùa.

### Tám loại ô

Mỗi loại vừa là một luật, vừa là một model 3D. Tám model dùng lại cho 61 ô là lý do bàn
lục giác đáng làm 3D, còn nhân vật thì không.

| Loại ô | Số lượng | Điểm | Bậc đề | Tác dụng khi giữ |
|---|---:|---:|---:|---|
| Đồng bằng | 26 | 1 | 1 | Không có. Nền của bàn. |
| Làng | 10 | 1 | 1 | Hồi lệnh −0,5 giây mỗi làng, tối đa −2,0 giây |
| Rừng | 8 | 1 | 2 | Tướng đứng trong rừng thì đối phương không thấy vị trí |
| Ải | 6 | 2 | 2 | Chỉ thông hai cạnh. Nút thắt của cả một hướng |
| Bến sông | 4 | 1 | 2 | Cửa duy nhất để sang bờ bên kia |
| Thành trì | 4 | 3 | 3 | Ô kề thuộc bạn không thể bị chiếm chỉ bằng một câu |
| Học cung | 3 | 1 | 1 | Hạ bậc đề của bạn xuống một nấc, ở mọi ô |
| Núi | — | — | — | Không đi, không chiếm. Chỗ để asset đẹp mà không cần luật |

Tổng 61 ô chơi được, tổng điểm bàn **75**. Mỗi bên bắt đầu giữ 3 ô ở hai góc đối diện.

Điểm tính theo **giá trị ô**, không phải đếm ô. Nếu đếm ô thì chiến thuật tối ưu là quét
đất trống và trận nào cũng giống trận nào. Thành trì ba điểm làm bàn cờ có mục tiêu.

Tên ô lấy từ bảng lãnh địa đang có — Quan Độ, Xích Bích, Hợp Phì, Nhai Đình, Kỳ Sơn,
Trường Bản. Đã có khoảng bốn mươi tên, cần thêm hai mươi nữa.

---

## 2. Nhịp trận

Không có lượt của ai cả. **Hai bên đi đồng thời, mỗi bên một đồng hồ hồi lệnh riêng.**
Bạn hành động khi đồng hồ hồi lệnh của bạn về không.

Lý do bỏ lượt luân phiên: một lượt gồm chọn ô và trả lời mất khoảng mười ba giây; mười
phút chia đôi nghĩa là mỗi người được chừng hai mươi ba nước và **một nửa thời gian ngồi
nhìn màn hình chờ**.

Một hành động: chọn ô đích trong tầm → 10 giây trả lời → kết quả → hồi lệnh.

### Hồi lệnh nở theo lãnh thổ

```
hồi lệnh = 3,0s + 0,15 × (số ô đang giữ) − (giảm từ làng)   [sàn 2,0s]
```

Giữ 5 ô thì 3,75 giây. Giữ 25 ô thì 6,75 giây. Càng rộng càng khó điều quân.

Đây là con số quan trọng nhất trong cả bản thiết kế, vì nó làm **bên đang dẫn tự chậm
lại**. Không có quả cầu tuyết, trận nào cũng còn kịch tính ở phút thứ chín, và người thua
không bị bỏ xa từ phút thứ hai rồi ngồi chịu trận tám phút.

### Tính ngược ra 61 ô

Trung bình một hành động mất khoảng 12,5 giây (7 giây trả lời + hồi lệnh). Trong 600
giây, mỗi bên đi được chừng 48 hành động. Tỷ lệ sai theo thiết kế là 30%, nên mỗi bên
chiếm được chừng 30 ô. Hai bên vừa đúng lấp đầy 61 ô đúng lúc hết giờ — không có đất
thừa không ai với tới, cũng không hết đất từ phút thứ sáu.

Đổi 61 ô thì phải đổi đồng hồ, và ngược lại. Hai con số này buộc vào nhau.

### Va chạm

Hai bên cùng nhắm một ô: ai xác nhận đáp án đúng trước thì chiếm. Bên kia mất hành động
nhưng được để lại một dấu vây (mục 3).

---

## 3. Chiếm đất

Một câu, mười giây. Đây là nhịp tim của game, nên cũng là chỗ dễ giết game nhất.

### Dạng câu vừa mười giây

Nghĩa từ trong ngữ cảnh, collocation, word form, ghép cặp paraphrase, điền một chỗ trống,
True/False/Not Given trên **một câu**. Không dạng nào bắt đọc quá 25 từ. Passage để dành
cho mục 5.

### Bậc đề theo ô, không theo người

Ô biên bậc 1, thành trì bậc 3. Người chơi **tự chọn rủi ro** — đây là nơi sinh ra quyết
định chiến thuật thật, chứ không phải ở việc bấm đúng nút.

### Trong mỗi bậc thì đề phải thích ứng — bắt buộc

Item rút từ chính hồ sơ điểm yếu của người chơi, hiệu chuẩn về khoảng **70% khả năng trả
lời đúng**. Một bạn Band 5 và một bạn Band 7 đánh nhau vẫn cân, vì mỗi người gặp đề của
mình.

Không có điều này thì game chỉ là "ai giỏi tiếng Anh hơn thì thắng". Bạn yếu chơi một
ván, thua sạch, và không bao giờ quay lại — mà bạn yếu mới chính là người cần sản phẩm
này.

### Vây thành — trả lời sai không được mất trắng

Sai thì không chiếm được ô, nhưng ô đó nhận **một dấu vây** của bạn. Đủ **hai dấu vây**
thì lần tới bạn chiếm mà không cần trả lời. Dấu vây tan sau **60 giây** nếu bạn không
quay lại.

Đây là cơ chế chống vòng xoáy thất bại quan trọng nhất trong cả bản thiết kế. Nó biến một
cú sai từ "mất trắng lượt" thành "tiến được nửa bước", và nó thưởng cho sự kiên trì —
đúng phẩm chất mà một sản phẩm luyện thi nên thưởng.

### Kho đề

Trong một trận không lặp item. Item trả lời sai đi vào hàng đợi ôn tập cho trận sau, theo
lịch giãn cách. Người chơi càng chơi thì kho đề càng riêng.

---

## 4. Ngũ tướng

Năm tướng chơi được. **Lữ Bố không nằm trong đó.**

Lữ Bố mang vai `DOI_THU_PHAN_CHIEU` — "đối thủ phản chiếu thiên phú" — trong lore đã có.
Vậy đừng cho chọn: Lữ Bố là máy, là trùm cuối, và **luôn soi gương đúng tướng mà người
chơi đang dùng**. Chọn Mã Siêu thì Lữ Bố cũng thiết kỵ; chọn Quan Vũ thì Lữ Bố cũng trấn
thủ.

Còn lại đúng năm — con số duy nhất cho một vòng khắc chế đối xứng, mỗi tướng khắc hai và
bị khắc hai. Sáu thì không chia đều được.

Mỗi kỹ năng suy ra từ trường `strength`, mỗi cái giá suy ra từ trường `weakness`. Chính
câu trong file gốc — *"kể một nửa là kể sai"* — trở thành luật cân bằng: không tướng nào
có kỹ năng mà không có giá.

| Tướng | Vai | Kỹ năng (từ `strength`) | Cái giá (từ `weakness`) |
|---|---|---|---|
| **Trương Phi** | Người mở trận | **Xung phong.** Tướng duy nhất chiếm hai ô trong một hành động: đúng câu đầu thì được câu thứ hai ngay, nhưng chỉ 6 giây. Tầm 1. | Đã tuyên chiến thì không rút, không đổi câu. Sai câu đầu thì hồi lệnh nhân đôi. |
| **Quan Vũ** | Người giữ chính đạo | **Trấn thủ.** Ô Quan Vũ chiếm thành kiên thành: địch phải đúng hai câu liên tiếp mới cướp được. | Tầm 1, không nhảy, không tắt. Đề của Quan Vũ nghiêng về bẫy từ khoá bề mặt. |
| **Triệu Vân** | Người giữ bình tĩnh | **Đơn kỵ.** Nhảy thẳng về bất kỳ ô nhà nào đang có dấu vây và xoá dấu vây đó. Tầm 2. Mỗi câu thêm 3 giây. | Mỗi cú nhảy đốt 15 giây của đồng hồ bàn cờ. Chỉ mình Triệu Vân trả giá bằng thời gian. |
| **Hoàng Trung** | Người chứng minh sức bền | **Lão tướng.** Tầm 1 ở ba phút đầu, tầm 2 từ phút 3, tầm 3 từ phút 6. **Phục bàn:** dạng đề từng làm sai, lần sau làm đúng thì chiếm luôn hai ô. | Ba phút đầu chỉ đi một ô và không được phép thách đấu. |
| **Mã Siêu** | Người phá thế bằng biến hoá | **Thiết kỵ.** Đi tới ba ô trên một đường thẳng, xuyên qua ô của mình hoặc ô trống. Đổi đề một lần mỗi hành động. | Đất Mã Siêu chiếm không tự kiên cố. Ô nào cách tướng quá ba ô trở về trung lập sau 90 giây. Phải luôn di chuyển. |

### Vòng khắc chế

Mỗi tướng khắc hai, bị khắc hai. Vòng đóng kín nên không có tướng mạnh tuyệt đối và không
có tướng vô dụng. Hai bên chọn kín rồi lật cùng lúc, vì ai chọn sau thì có lợi thế thông
tin.

```
        Trương Phi
        ╱          ╲
  Triệu Vân ──── Mã Siêu
      │              │
  Hoàng Trung ── Quan Vũ

  Trương Phi  ▸ Mã Siêu, Quan Vũ
  Mã Siêu     ▸ Quan Vũ, Hoàng Trung
  Quan Vũ     ▸ Hoàng Trung, Triệu Vân
  Hoàng Trung ▸ Triệu Vân, Trương Phi
  Triệu Vân   ▸ Trương Phi, Mã Siêu
```

Đây **không phải bảng tra**. Mỗi mũi tên có một lý do cơ học, và nếu đổi một con số ở mục
2 hay mục 3 thì phải kiểm lại toàn bộ vòng này.

| Khắc chế | Vì sao — bằng cơ chế, không bằng lore |
|---|---|
| Trương Phi ▸ Mã Siêu | Đất Mã Siêu không tự kiên cố và tự rụng khi tướng đi xa; Trương Phi bành trướng thô nhanh gấp đôi, cướp lại rẻ |
| Trương Phi ▸ Quan Vũ | Kiên thành cần hai câu đúng liên tiếp. Trương Phi là tướng duy nhất trả lời hai câu trong một hành động, nên là tướng duy nhất phá được kiên thành trong một nước |
| Mã Siêu ▸ Quan Vũ | Quan Vũ đi một ô. Thiết kỵ ba ô thẳng vòng qua tuyến phòng thủ, đánh thẳng vào hậu phương chưa kịp kiên cố |
| Mã Siêu ▸ Hoàng Trung | Hoàng Trung yếu nhất đúng ba phút đầu, và Mã Siêu mạnh nhất đúng ba phút đó |
| Quan Vũ ▸ Hoàng Trung | Cả hai đều chơi dài hơi, nhưng đất Quan Vũ đã khoá thì lợi thế cuối trận của Hoàng Trung không còn chỗ dùng |
| Quan Vũ ▸ Triệu Vân | Triệu Vân được thêm giây chứ không được thêm lượt, nên không phá nổi luật hai câu liên tiếp. Cùng lắm là hoà, mà hoà thì Quan Vũ nhiều điểm hơn |
| Hoàng Trung ▸ Triệu Vân | Cả hai đều chậm, nhưng Triệu Vân tự đốt đồng hồ mỗi lần cứu viện còn Hoàng Trung càng cuối càng mạnh |
| Hoàng Trung ▸ Trương Phi | Trương Phi không được đổi câu nên lặp lại vài dạng đề. Phục bàn của Hoàng Trung ăn đúng chỗ lặp đó |
| Triệu Vân ▸ Trương Phi | Vũ khí thật của Trương Phi là để lại dấu vây khắp nơi. Triệu Vân là người duy nhất xoá dấu vây từ xa |
| Triệu Vân ▸ Mã Siêu | Mã Siêu sống bằng đánh hậu phương. Triệu Vân là người duy nhất về hậu phương tức thì |

### Khắc chế làm gì trong luật

Đúng một việc: khi hai tướng giáp mặt, bên khắc chế được **chọn dạng passage** cho trận
thách đấu. Không hệ số nhân, không cộng điểm, không đụng vào chấm bài.

Đây là **ngoại lệ duy nhất** được nêu tên ở mục 0. Quyền chọn đề là lợi thế thật mà không
phạm ranh giới. Không thêm ngoại lệ thứ hai.

---

## 5. Thách đấu sinh tử

Cửa thắng thứ hai. Di chuyển trúng ô tướng đối phương thì gửi lời thách đấu.

### Vì sao phải có giá cho việc giảng hoà

Nếu bên bị thách được giảng hoà **miễn phí**, bên đang dẫn lãnh thổ sẽ *luôn luôn* giảng
hoà — họ chỉ cần hết giờ là thắng. Cửa thắng thứ hai sẽ không bao giờ được dùng. Bốn sửa
đổi dưới đây đi cùng nhau, bỏ một cái là hỏng cả bốn.

1. **Giảng hoà có giá.** Bên giảng hoà nhượng một ô kề cho bên thách và lùi hai ô. Đủ đau
   để phải cân nhắc, không đủ để mất trận.
2. **Mỗi bên chỉ được giảng hoà một lần một trận.** Lần bị thách thứ hai là bắt buộc đấu.
3. **Cửa vào.** Chỉ được thách khi đã qua phút thứ ba **và** đang giữ ít nhất tám ô. Nếu
   không, chiến thuật tối ưu là lao thẳng vào tướng địch ở giây thứ hai mươi và bỏ qua
   toàn bộ phần bàn cờ.
4. **Thách đấu là sinh tử.** Bàn cờ đóng băng, hai bên vào cùng một passage. Ai thắng
   passage thắng cả trận.

### Passage

- Một passage, mười ba câu, theo đúng kho đề và logic chấm của Stoic-Ielts.
- **Trần hai mươi phút, không phải sàn.** Cả hai nộp xong thì trận kết thúc ngay. Bắt
  người xong sớm ngồi thêm sáu phút là giết nhịp.
- Đồng hồ mười phút ở mục 2 chỉ tính phần bàn cờ. Passage nằm ngoài.
- Bên bị khắc chế mất quyền chọn dạng passage (mục 4). Nếu không tướng nào khắc tướng nào
  thì bên *bị* thách được chọn, vì bên thách đã có quyền chủ động về thời điểm.

### Phá hoà — và vì sao mười phút bàn cờ không bị xoá sổ

Xét theo thứ tự:

1. Số câu đúng.
2. Thời gian nộp.
3. **Điểm lãnh thổ tại thời điểm đóng băng.**

Tiêu chí thứ ba là câu trả lời cho nỗi lo lớn nhất của cơ chế sinh tử. Mười phút bàn cờ
không biến mất — nó thành lá bài tẩy, và người dẫn lãnh thổ bước vào passage với một
mạng dự phòng.

### Rời trận

Rời trận giữa passage xử thua. Phải nói rõ trong màn hình xác nhận thách đấu.

### Chọn chế độ lúc ghép trận

Không ai được bị phục kích bởi một cam kết ba mươi phút.

- **Trận ngắn** — mười phút, không có sinh tử. Thách đấu chuyển thành cướp ba ô kề tướng
  đối phương.
- **Trận dài** — tối đa ba mươi phút, có sinh tử.

Hai bên biết trước mình ký vào cái gì. Người có mười lăm phút rảnh vẫn chơi được.

---

## 6. Kết trận

- **Hết mười phút.** Bên nhiều điểm lãnh địa hơn thắng. Tính theo giá trị ô ở mục 1.
- **Thắng passage sinh tử.** Thắng ngay, bất kể đang ít đất hơn.
- **Hoà điểm ở phần bàn cờ.** Xét tổng số câu đúng. Vẫn hoà thì hoà thật — đừng bịa thêm
  tiêu chí thứ ba, hoà là một kết quả hợp lệ.

### Sương mù chiến trận ở 90 giây cuối

Còn 90 giây, vòng ô ngoài cùng của phần chơi được (vòng 4, 24 ô) phủ sương: **không đi
vào được nữa, nhưng quyền sở hữu và điểm giữ nguyên.** Còn 30 giây, vòng 3 (18 ô) phủ
tiếp. Hai tướng bị ép vào mười chín ô giữa.

Sương mù **không** tước quyền sở hữu. Bản phác đầu tiên viết "ô mất đi thì mất luôn điểm"
— sai, vì như thế điểm số lật ngược trong chín mươi giây cuối vì một lý do không ai kiểm
soát được, và cả trận thành xổ số.

Cơ chế này làm hai việc: tạo cao trào cho phút cuối, và chặn chiến thuật chạy trốn để
không bao giờ phải giáp mặt. Nó cũng dùng lại đúng khái niệm "ngoài mùa" ở mục 1 nên
không phải thêm hình ảnh mới nào.

---

## 7. Cấu trúc mã nguồn

Ba gói, ranh giới cứng.

| Gói | Chứa gì | Cấm gì |
|---|---|---|
| `engine/` | Hex math, máy trạng thái, luật, RNG có seed | Không DOM, không Babylon, không `fetch` |
| `render/` | Đọc trạng thái rồi vẽ | Không chứa luật. Không tự quyết định gì |
| `content/` | Catalog ô, catalog tướng, cấu hình mùa, `SkillEffect` | Dữ liệu, không phải code |

`engine/` phải chạy được ở cả trình duyệt lẫn Node, vì máy chủ cần chạy *chính nó* để làm
trọng tài. Một bộ luật, hai nơi thi hành, không có bản sao lệch nhau.

### Máy chủ là trọng tài

- **Client không bao giờ giữ đáp án.** Máy chủ phát item kèm `itemId`, nhận `answerId`,
  trả về đúng hoặc sai.
  Bản demo hiện tại để cả mảng `QUESTIONS` kèm trường `answer` trong bundle trình duyệt —
  mở DevTools là thấy hết. Với sản phẩm có xếp hạng và có thanh toán thì đó là lỗi chặn,
  không phải nợ kỹ thuật.
- Mọi hành động gửi lên máy chủ; máy chủ chạy engine để xác thực. Client chỉ đoán trước
  cho mượt.
- Ghi nhật ký lệnh kèm seed. Phát lại được trọn trận — để sửa lỗi, để xem lại, và để đối
  chiếu khi có khiếu nại xếp hạng.

### Phạm vi bản đầu

v1 là **một người đấu với máy**. Bot dùng chính engine, chỉ khác ở một lớp quyết định và
một mô hình mô phỏng thời gian trả lời theo band mục tiêu.

PvP thời gian thực là bài toán hạ tầng riêng — kết nối bền, ghép cặp, chống lệch trạng
thái, xử lý rớt mạng giữa trận. Để v2. Và để nó là v2 được thì engine phải sạch ngay từ
v1; đó là toàn bộ lý do mục 7 tồn tại.

### Asset

- **Ô: 8 model, mỗi model khoảng 2.000 tam giác**, dùng lại 61 lần. Đây là chỗ pipeline
  sinh mesh từ text có ích thật — đồ vật tĩnh, không cần xương.
- **Tướng: không cần 3D ở v1.** Dùng thẳng sáu file `.webp` trong `public/art/generals`
  của Stoic-Ielts làm billboard. Muốn 3D sau này thì đó là việc thay một component
  render, không phải làm lại game.
- Tổng tải một màn dưới 4 MB, GLB nén Draco, texture KTX2.

---

## 8. Bảng số

Mọi hằng số chỉnh được nằm ở đây và chỉ ở đây. Rải số vào code là tạo nguồn sự thật thứ
hai để lệch nhau.

### Bàn cờ

| Tên | Giá trị |
|---|---|
| Bán kính bàn vẽ | 5 (91 ô) |
| Bán kính bàn chơi | 4 (61 ô) |
| Tổng điểm bàn | 75 |
| Ô mỗi bên khi bắt đầu | 3 |
| Điểm ô | đồng bằng, làng, rừng, bến, học cung = 1 · ải = 2 · thành trì = 3 |

### Nhịp

| Tên | Giá trị |
|---|---|
| Đồng hồ bàn cờ | 600 s |
| Thời gian một câu chiếm ô | 10,0 s |
| Hồi lệnh cơ bản | 3,0 s |
| Hệ số nở theo lãnh thổ | 0,15 s mỗi ô |
| Giảm từ làng | −0,5 s mỗi làng, tối đa −2,0 s |
| Sàn hồi lệnh | 2,0 s |
| Sương mù vòng 4 | còn 90 s |
| Sương mù vòng 3 | còn 30 s |

### Chiếm đất

| Tên | Giá trị |
|---|---|
| Hiệu chuẩn độ khó | ~70% khả năng trả lời đúng |
| Dấu vây để chiếm không cần đáp | 2 |
| Dấu vây tan sau | 60 s |

### Tướng

| Tên | Giá trị |
|---|---|
| Trương Phi — câu thứ hai | 6,0 s |
| Trương Phi — phạt sai câu đầu | hồi lệnh × 2 |
| Quan Vũ — phá kiên thành | 2 câu đúng liên tiếp |
| Triệu Vân — thêm giây mỗi câu | +3,0 s |
| Triệu Vân — giá mỗi cú nhảy | 15 s đồng hồ bàn cờ |
| Hoàng Trung — mốc nở tầm | phút 0 / 3 / 6 → tầm 1 / 2 / 3 |
| Hoàng Trung — thưởng phục bàn | 2 ô |
| Mã Siêu — tầm thẳng hàng | 3 ô |
| Mã Siêu — đất rụng khi xa hơn | 3 ô, sau 90 s |

### Thách đấu

| Tên | Giá trị |
|---|---|
| Cửa vào — thời điểm | sau 180 s |
| Cửa vào — lãnh thổ | ≥ 8 ô |
| Giá giảng hoà | nhượng 1 ô kề + lùi 2 ô |
| Số lần giảng hoà mỗi bên | 1 |
| Passage | 1 bài, 13 câu |
| Trần thời gian passage | 1200 s, kết thúc sớm khi cả hai nộp |
| Thứ tự phá hoà | câu đúng → thời gian nộp → điểm lãnh thổ |
| Trận ngắn | 600 s, không sinh tử |
| Trận dài | tối đa 1800 s, có sinh tử |

---

## 9. Điều chưa chốt

- **Phân bố tám loại ô trên bàn.** Số lượng ở mục 1 đã chốt, vị trí thì chưa. Cần vẽ tay
  vài bố cục rồi chơi thử, không sinh ngẫu nhiên — nút thắt đặt sai chỗ là hỏng cả trận.
- **Hai mươi tên lãnh địa còn thiếu** để đủ 61.
- **Cân bằng vòng khắc chế bằng số liệu thật.** Mười lý do ở mục 4 đúng về mặt cơ chế,
  nhưng chỉ đối chiếu được sau vài trăm ván có ghi nhật ký.
- **Cảm giác của cơ chế sinh tử.** Mười phút bàn cờ có thể bị lật bởi một passage. Tiêu
  chí phá hoà thứ ba đã giảm bớt, nhưng phải thử với người thật trước khi chốt.
- **Bot chơi thế nào cho vui.** Bot đánh tối ưu là bot chán. Cần một lớp quyết định có
  sai sót cố ý, và sai sót đó phải nhìn ra được là "nước đi liều" chứ không phải "máy ngu".

---

## Quyết định đã chốt

Ngày 25/08/2026, chủ dự án chốt:

1. **Tướng được trao lợi thế, nhưng chỉ ở lớp bàn cờ.** Ranh giới ghi ở mục 0, ép bằng
   union đóng `SkillEffect` và kiểm tra `check-skill-boundary`. Không phá.
2. **Bốn sửa đổi thách đấu đi cùng nhau** — giá giảng hoà, một lần mỗi trận, cửa vào phút
   3 và 8 ô, sinh tử.
3. **Đi đồng thời, hồi lệnh nở theo lãnh thổ** `3,0 + 0,15 × số ô`.
4. **Đề thích ứng theo hồ sơ điểm yếu** và **cơ chế vây thành**.
5. **Câu 10 giây chảy vào hồ sơ điểm yếu, không chảy vào band và xếp hạng.**
6. **Thách đấu là sinh tử, dùng một passage.**
7. **Trận tối đa ba mươi phút** — mười phút bàn cờ, hai mươi phút passage.
