# Quy trình tạo một phòng làm bài mới (theo mẫu phòng Vật lí 12 · Vật lí nhiệt)

Tài liệu này để làm tiếp cho khối khác (ví dụ Lí 10) mà không phải nhớ lại từ đầu. Mẫu hoàn chỉnh là kho này (`D:\phong-luyen-vat-li-nhiet`). Hồ sơ nằm ở `D:\Hồ sơ dạy học số`.

## Nguyên tắc (do giáo viên đặt ra)
1. **Nội dung giữ nguyên 100%.** Không viết lại câu hỏi, đáp án, lời giải. Chuyển bằng chương trình từ nguồn của giáo viên, không gõ lại tay.
2. **Luôn hỏi trước khi `git push`.** Kho công khai, không đưa tên học sinh, danh sách lớp, file `.csv`, mật khẩu.
3. **Không nhập mật khẩu, khóa, mã truy cập thay giáo viên.** Mật khẩu giáo viên (`TEACHER_PASS`) do giáo viên tự gõ trên Render.
4. Chỉ nhập mật khẩu thử khi chạy bản thử của chính mình trên `localhost` (mật khẩu thử tự đặt, xong thì tắt máy chủ và xóa dữ liệu thử).
5. Trình bày bằng tiếng Việt, ngắn gọn, nói rõ cái gì đã thử và cái gì chưa thử.

## Các bước
**Bước 0. Làm rõ việc cần làm.** Chương nào, nguồn nào, có cần hai tab (như Lí 12) hay giữ một danh sách (như phòng khối 10, 11), có cần đưa vào hồ sơ không.

**Bước 1. Nguồn.** Giáo viên đưa nguồn vào thư mục `nguon-goc` của kho mới. Hai dạng đã gặp:
- Trang HTML luyện tập (có sẵn mảng câu hỏi trong mã), như Lí 12. Xem `tools/tao_du_lieu.js`.
- File Word ngân hàng câu hỏi (như phòng Lí 10): xem `D:\phong-lam-bai-10\cong_cu_soan\` (`parse_docx.py`, `build_bank.py`).
Nếu nguồn có cấu trúc khác thì sửa `tools/tao_du_lieu.js` cho phù hợp, vẫn giữ nguyên văn.

**Bước 2. Tạo kho.** Chép các file động cơ từ kho mẫu: `server.js`, `public/index.html`, `package.json`, `render.yaml` (đổi tên dịch vụ), `chay-tren-may.bat`, `tools/`, `.gitignore`. Chạy `node tools/tao_du_lieu.js` để sinh `data/cfg.json`, `data/key.json`, `public/img/*`.
- Định dạng câu hỏi: `id, group, set:'g', type: mc|tf|short|view, text, options` (tf, mc), `unit` (short), `fig: {img:[tên ảnh], html:'<chuỗi HTML gốc của bảng hoặc đồ thị>'}`. Đáp án: `answers[id]` (mc: 'A'..'D'; tf: mảng boolean; short: `{v, tol}`), `explain[id]` (lời giải), `note[id]` (ghi chú chỉ giáo viên thấy).
- Văn bản hỗ trợ: công thức `$...$`, chữ đậm, nghiêng, chỉ số trên và dưới, danh sách, xuống dòng. Thẻ khác bị vô hiệu.
- `cfg.tabs = [{id, ten, types:[...]}]` bật chế độ hai tab. `cfg.groups`, `cfg.sessions` đặt tên nhóm và buổi. Không đặt `cfg.matrix` thì không có "đề ngẫu nhiên theo ma trận".

**Bước 3. Kiểm tra dữ liệu.** `node tools/kiem_tra.js`: đúng định dạng, đáp án gốc được chấm đúng, ảnh có đủ.

**Bước 4. Chạy thử trong máy.** `PORT=3100 TEACHER_PASS=<mật khẩu thử> DATA_DIR=<thư mục tạm> node server.js`. Mở `/teacher`, mở vài câu, vào bằng học sinh thử, nộp đúng và sai, đóng câu, tải `.csv`. Xem ảnh, bảng, công thức hiển thị đúng. Tắt máy chủ và xóa thư mục tạm khi xong.

**Bước 5. So cách chấm với nguồn gốc.** Nếu trang gốc có hàm chấm riêng (sai số, nhiều kiểu nhập), chạy thử nhiều kiểu nhập (dấu phẩy, dấu chấm, sai nhẹ, rỗng) qua cả hai hàm chấm và đối chiếu. Phòng Lí 12 đã đạt 64/64 đáp án và 0 chỗ khác nhau.

**Bước 6. Tạo file Word đường link.** Mẫu: `tools/mau_tao_word.js` (cần `npm install docx` trong thư mục tạm). Nếu Word đang mở file cũ thì lưu tên khác rồi đổi tên sau.

**Bước 7. Đưa lên.**
1. Giáo viên tạo **kho rỗng Public** trên github.com. Chú ý tên kho có phân biệt chữ hoa (ví dụ `Phong-luyen-vat-li-nhiet`). Tôi cung cấp lệnh `git remote add` và hỏi trước khi `git push`.
2. Trên Render: **Configure account** để cấp quyền cho kho mới, rồi **New, Blueprint**, chọn kho. Giáo viên tự nhập `TEACHER_PASS`. Địa chỉ thường là `https://<tên-dịch-vụ>.onrender.com`.
3. Kiểm tra từ ngoài: `/healthz` trả 200, `/api/t/state` không mật khẩu trả 401, `/api/state` cho biết số câu.

**Bước 8. Gắn vào hồ sơ.** Trong `D:\Hồ sơ dạy học số\nguon\config.js`: thêm địa chỉ phòng vào `congCu` mục `ph` (theo khối). Chạy `node tools/dong_goi.js` để gộp thành `Ho-so-day-hoc-so.html`. Trang Làm bài trực tuyến tự hiện link học sinh, nút đánh thức máy chủ và bảng giáo viên nhúng sẵn.

## Điều đã học được (tránh lặp lại lỗi)
- Động cơ khối 10 gốc chỉ liệt kê tối đa 6 nhóm trong "Mở câu theo nhóm" và tự gắn chữ "Nhóm n" vào tên. Bản trong kho này đã sửa. Nếu chép động cơ từ khối 10 mới thì phải sửa lại, hoặc chép từ kho này.
- Máy chủ phải gửi `tabs` trong `publicConfig` và `tab` cho câu chưa mở, nếu không số đếm tab sai.
- Cập nhật mã lên GitHub làm Render khởi động lại và **xóa bài làm đang có**. Không đẩy khi học sinh đang làm.
- Gói miễn phí của Render tự ngủ sau khoảng 15 phút: mở trang giáo viên trước giờ học 5 phút.
- Trang tự luyện gốc có ô mật khẩu giáo viên chỉ kiểm tra trong trình duyệt, không phải bảo vệ thật. Phòng làm bài dùng mật khẩu kiểm tra ở máy chủ.
- Cảnh báo "LF will be replaced by CRLF" của git là bình thường. Máy chưa cấu hình tên tác giả git: dùng `git -c user.name=... -c user.email=...` lấy từ commit trước, không sửa cấu hình git.
- Máy không có LibreOffice và `pdftoppm`, nên chưa xem được file Word dạng hiển thị: chỉ kiểm tra được cấu trúc và nội dung.
