# Phòng luyện tập Vật lí 12 · Vật lí nhiệt

Cùng động cơ và cách dùng với phòng làm bài khối 10, 11: học sinh vào bằng link, nhập họ tên là làm được, không cần tài khoản. Giáo viên vào `/teacher` bằng mật khẩu để mở câu, đóng câu, xem % đúng và danh sách đúng/sai.

Nội dung **giữ nguyên 100%** từ hai trang luyện tập gốc (thư mục `nguon-goc`): 40 câu đúng sai (10 nhóm) và 64 câu trả lời ngắn (6 bài), kèm hình, bảng, công thức, gợi ý và lời giải. Mọi câu được chuyển từ bản gốc bằng chương trình, không viết lại tay.

| Trang | Link |
|---|---|
| Phòng làm bài (học sinh) | `/` |
| Giáo viên | `/teacher` |
| Tự luyện đúng sai (trang gốc, không gửi kết quả) | `/tu-luyen/dung-sai` |
| Tự luyện trả lời ngắn (trang gốc, không gửi kết quả) | `/tu-luyen/tra-loi-ngan` |

## Hai tab: Đúng sai và Trả lời ngắn
- Cả học sinh và giáo viên có hai tab riêng: **Đúng sai** (10 nhóm, 40 câu) và **Trả lời ngắn** (6 bài, 64 câu). Mỗi tab đánh số câu từ 1 và gom câu theo nhóm hoặc bài, có tiêu đề từng nhóm và số câu đã làm.
- Nút **Mở câu** và **Mở hết nhóm** của giáo viên mở theo tab đang chọn. Ở "Cài đặt thêm", danh sách nhóm cũng chỉ hiện nhóm của tab đang chọn.
- Bảng kết quả của giáo viên tách theo tab, có hàng tiêu đề nhóm hoặc bài phía trên các cột câu; điểm và xếp hạng tính riêng theo tab.
- Ảnh trong câu hỏi hiển thị nhỏ gọn; bấm vào ảnh để phóng to, bấm lần nữa để đóng.

## Điều khiển trong buổi học (giống khối 10, 11)
- **Mở câu N**: mở từng câu. **Mở hết buổi**: mở cả buổi (mỗi nhóm hoặc bài là một buổi). **Mở tất cả**.
- **Đóng câu & hiện đáp án**: học sinh thấy đúng/sai và lời giải. **Đóng cả … câu đang mở**.
- **Cài đặt thêm**: mở câu theo nhóm, dạng (đúng sai hoặc trả lời ngắn) và số lượng; khóa phòng theo sĩ số; tự động đóng câu khi đủ phần trăm học sinh nộp.
- **Làm lại từ đầu**: xóa bài làm, đưa tiến độ về 0 (dùng sau khi chạy thử). **Tải kết quả (.csv)**.
- Bấm số câu trong bảng để xem % đúng và danh sách từng em.

Chấm điểm giống khối 10, 11: câu đúng sai chỉ tính đúng khi chọn đúng cả 4 ý; câu trả lời ngắn chấm theo sai số của đáp án gốc (kiểm tra: 64/64 đáp án gốc được chấm đúng và cách chấm khớp với trang gốc).

## Cách 1. Chạy trên laptop của giáo viên (cả lớp cùng Wi-Fi)
1. Cài Node.js (bản LTS) từ nodejs.org, nếu máy chưa có.
2. Bấm đôi `chay-tren-may.bat`, nhập mật khẩu giáo viên (gõ không dấu).
3. Cửa sổ hiện dòng **Cung Wi-Fi: http://192.168.x.x:3000/**. Học sinh mở địa chỉ đó. Giáo viên mở thêm `/teacher`.

## Cách 2. Đưa lên mạng bằng Render (học sinh vào từ bất kì đâu)
1. Kho GitHub này đã có đủ file. Vào render.com, đăng nhập bằng GitHub.
2. **New** → **Blueprint**, chọn kho `Phong-luyen-vat-li-nhiet`. Render đọc file `render.yaml`.
3. Ở ô `TEACHER_PASS`, **tự nhập** mật khẩu giáo viên (không ghi vào kho GitHub). Bấm **Apply**.
4. Đợi vài phút. Địa chỉ: `https://phong-luyen-vat-li-nhiet.onrender.com`. Học sinh: địa chỉ đó. Giáo viên: thêm `/teacher`.

### Cần biết khi dùng gói miễn phí của Render
- Máy chủ tự ngủ sau khoảng 15 phút không ai dùng. Lần mở đầu có thể chờ khoảng 1 phút. Mở `/teacher` trước giờ học 5 phút.
- Bài làm lưu trong bộ nhớ máy chủ và mất khi máy chủ ngủ, khởi động lại hoặc **cập nhật mã lên GitHub**. Cuối buổi bấm **Tải kết quả (.csv)**. Không đẩy bản mới khi học sinh đang làm.
- Tên học sinh được lưu trên máy chủ của Render. Chỉ dùng họ tên và lớp.

## Đổi nội dung bài
1. Thay file `.html` mới vào thư mục `nguon-goc` (giữ đúng tên file).
2. Chạy `node tools/tao_du_lieu.js` để tạo lại `data/cfg.json`, `data/key.json` và ảnh trong `public/img`.
3. Đẩy lên GitHub. Render tự cập nhật.

## Ghi chú kĩ thuật
- Động cơ (`server.js`, `public/index.html`) sao từ phòng khối 10, chỉ thêm: hiển thị chỉ số trên/dưới, chữ đậm, danh sách; hiển thị bảng và đồ thị gốc; ô đơn vị cạnh ô trả lời; ghi chú riêng cho giáo viên; trang tự luyện gốc ở `/tu-luyen/...`.
- Chưa có chế độ "đề ngẫu nhiên theo ma trận" như khối 10 vì chưa có ma trận cho hai bài này.
