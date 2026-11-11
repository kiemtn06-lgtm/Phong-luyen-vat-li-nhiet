# Phòng luyện tập Vật lí 12 · Vật lí nhiệt

Giống phòng làm bài khối 10, 11: học sinh vào bằng link, nhập họ tên là làm được, không cần tài khoản.
Giáo viên vào `/teacher` bằng mật khẩu để xem kết quả cả lớp.

Nội dung hai bài **giữ nguyên** (câu hỏi, hình, cách chấm). Máy chủ chỉ chèn thêm một đoạn nhỏ (`reporter.js`) để gửi kết quả đã chấm về cho giáo viên. Hai file `.html` gốc không bị sửa.

| Trang | Link |
|---|---|
| Chọn bài (gửi cho học sinh) | `/` |
| Luyện đúng sai | `/bai-day-dung-sai-vat-li-nhiet.html` |
| Luyện trả lời ngắn | `/bai-tra-loi-ngan-vat-li-nhiet.html` |
| Giáo viên | `/teacher` |

## Giáo viên xem được gì
- Danh sách học sinh, điểm (đúng sai) hoặc số câu đúng (trả lời ngắn), số câu đã làm, lần làm cuối.
- Từng câu: bao nhiêu em đã làm, bao nhiêu % đúng. Câu khó nhất xếp trên cùng để ôn lại.
- **Tải kết quả (.csv)** và **Xóa kết quả** (bắt đầu buổi mới). Bảng tự cập nhật mỗi 15 giây.

## Cách 1. Chạy trên laptop của giáo viên (cả lớp cùng Wi-Fi)
1. Cài Node.js (bản LTS) từ nodejs.org, nếu máy chưa có.
2. Bấm đôi `chay-tren-may.bat`, nhập mật khẩu giáo viên (gõ không dấu).
3. Cửa sổ hiện dòng **Cùng Wi-Fi: http://192.168.x.x:3000/**. Học sinh mở địa chỉ đó. Giáo viên mở thêm `/teacher`.

## Cách 2. Đưa lên mạng bằng Render (học sinh vào từ bất kì đâu)
1. Kho GitHub này đã có đủ file. Vào render.com, đăng nhập bằng GitHub.
2. **New** → **Blueprint**, chọn kho `phong-luyen-vat-li-nhiet`. Render đọc file `render.yaml`.
3. Ở ô `TEACHER_PASS`, **tự nhập** mật khẩu giáo viên (không ghi vào kho GitHub). Bấm **Apply**.
4. Đợi vài phút. Render cho địa chỉ dạng `https://phong-luyen-vat-li-nhiet.onrender.com`.
   - Học sinh: địa chỉ đó. Giáo viên: địa chỉ đó thêm `/teacher`.

Nếu không thấy mục Blueprint: **New** → **Web Service**, chọn kho, Runtime **Node**, Start Command `node server.js`, Instance Type **Free**, thêm biến môi trường `TEACHER_PASS`.

### Cần biết khi dùng gói miễn phí của Render
- Máy chủ tự ngủ sau khoảng 15 phút không ai dùng. Lần mở đầu có thể chờ khoảng 1 phút. Mở `/teacher` trước giờ học 5 phút.
- Kết quả lưu trong bộ nhớ máy chủ và mất khi máy chủ ngủ, khởi động lại hoặc cập nhật mã. Trước khi kết thúc buổi, bấm **Tải kết quả (.csv)**.
- Hai học sinh trùng họ tên sẽ bị gộp thành một. Nhắc các em nhập kèm lớp, ví dụ "An 12A6".
- Tên học sinh được lưu trên máy chủ của Render. Chỉ dùng họ tên và lớp, không nhập thông tin cá nhân khác.

## Đổi nội dung bài
1. Thay file `.html` mới vào thư mục này (giữ đúng tên file).
2. Chạy `node tools/tao_meta.js` để cập nhật tên câu cho bảng giáo viên.
3. Đẩy lên GitHub. Render tự cập nhật. Đừng cập nhật khi học sinh đang làm bài, vì kết quả sẽ bị xóa.

## Giới hạn
- Trang chỉ báo kết quả, không có chức năng "mở từng câu" như phòng khối 10, 11: học sinh tự chọn bài và làm theo tốc độ của mình.
- Phần chọn vai "Giáo viên" bên trong hai trang được ẩn khi chạy trong phòng này. Giáo viên dùng `/teacher`.
