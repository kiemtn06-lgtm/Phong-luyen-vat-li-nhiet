/* MẪU tạo file Word "đường link phòng" (khổ A4, Arial). Sửa BASE và nội dung cho phòng mới.
   Cần thư viện docx: tạo thư mục tạm, chạy `npm install docx` ở đó, chép file này vào và chạy:
   node mau_tao_word.js "<đường dẫn file .docx cần tạo>"
   Nếu Word đang mở file cũ thì không ghi đè được: lưu tên khác rồi đổi tên sau khi đóng Word. */
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  ExternalHyperlink, LevelFormat, AlignmentType } = require('docx');

const BASE = 'https://phong-luyen-vat-li-nhiet.onrender.com';
const FONT = 'Arial';
const TEAL = '0A6C78', GRAY = '55606B';
const OUT = process.argv[2];

const run = (t, o) => new TextRun(Object.assign({ text: t, font: FONT, size: 22 }, o || {}));
const link = (url) => new ExternalHyperlink({ link: url, children: [new TextRun({ text: url, font: FONT, size: 22, color: '1155CC', underline: {} })] });
const p = (children, o) => new Paragraph(Object.assign({ children: Array.isArray(children) ? children : [children], spacing: { after: 120 } }, o || {}));
const bullet = (t) => new Paragraph({ numbering: { reference: 'bl', level: 0 }, spacing: { after: 80 }, children: [run(t)] });
const h1 = (t) => new Paragraph({ heading: 'Heading1', children: [new TextRun({ text: t })] });

const border = { style: BorderStyle.SINGLE, size: 4, color: 'B9C4CF' };
const borders = { top: border, bottom: border, left: border, right: border };
const W1 = 2400, W2 = 6626;
const cell = (children, w, fill) => new TableCell({
  width: { size: w, type: WidthType.DXA }, borders,
  margins: { top: 100, bottom: 100, left: 140, right: 140 },
  shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
  children
});
const row = (a, bChildren, head) => new TableRow({
  tableHeader: !!head,
  children: [cell([p([run(a, { bold: true })], { spacing: { after: 0 } })], W1, head ? 'E6EEF5' : undefined), cell(bChildren, W2, head ? 'E6EEF5' : undefined)]
});
const note = (t) => p([run(t, { size: 20, color: GRAY })], { spacing: { before: 40, after: 0 } });

const table = new Table({
  width: { size: W1 + W2, type: WidthType.DXA }, columnWidths: [W1, W2],
  rows: [
    row('Dành cho', [p([run('Đường link', { bold: true })], { spacing: { after: 0 } })], true),
    row('Học sinh', [p([link(BASE)], { spacing: { after: 0 } }), note('Mở link, chọn bài, nhập họ tên kèm lớp (ví dụ: An 12A6). Không cần tài khoản.')]),
    row('Giáo viên', [p([link(BASE + '/teacher')], { spacing: { after: 0 } }), note('Đăng nhập bằng mật khẩu giáo viên (TEACHER_PASS) đặt trên Render.')]),
    row('Tự luyện đúng sai', [p([link(BASE + '/tu-luyen/dung-sai')], { spacing: { after: 0 } }), note('Trang gốc để học sinh tự luyện ngoài giờ. Không gửi kết quả về cho giáo viên.')]),
    row('Tự luyện trả lời ngắn', [p([link(BASE + '/tu-luyen/tra-loi-ngan')], { spacing: { after: 0 } }), note('Trang gốc để học sinh tự luyện ngoài giờ. Không gửi kết quả về cho giáo viên.')])
  ]
});

const doc = new Document({
  creator: 'Hồ sơ dạy học số',
  title: 'Đường link phòng luyện tập Vật lí 12 · Vật lí nhiệt',
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 44, bold: true, color: '14263B' }, paragraph: { spacing: { before: 0, after: 80 }, keepNext: true } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 28, bold: true, color: TEAL }, paragraph: { spacing: { before: 320, after: 140 }, keepNext: true, outlineLevel: 0 } }
    ]
  },
  numbering: { config: [{ reference: 'bl', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: [
      new Paragraph({ style: 'Title', children: [new TextRun({ text: 'Phòng luyện tập Vật lí 12' })] }),
      new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 6 } }, spacing: { after: 240 },
        children: [run('Chương I · Vật lí nhiệt (luyện đúng sai và luyện trả lời ngắn)', { color: GRAY, size: 24 })] }),

      h1('Địa chỉ phòng'),
      table,

      h1('Nội dung phòng'),
      bullet('104 câu, giữ nguyên 100% từ hai bài luyện gốc: 40 câu đúng sai (10 nhóm) và 64 câu trả lời ngắn (6 bài), có hình, bảng, công thức, gợi ý và lời giải.'),
      bullet('Mỗi nhóm hoặc bài là một buổi. Giáo viên mở từng câu, cả buổi, hoặc theo nhóm, dạng và số lượng.'),

      h1('Giáo viên điều khiển (giống phòng khối 10, 11)'),
      bullet('Mở câu, Mở hết buổi, Mở tất cả. Đóng câu và hiện đáp án: học sinh thấy đúng sai và lời giải.'),
      bullet('Cài đặt thêm: khóa phòng theo sĩ số, tự động đóng câu khi đủ phần trăm học sinh nộp bài.'),
      bullet('Xem phần trăm đúng của từng câu và kết quả từng học sinh. Nút "Làm lại từ đầu" để bắt đầu buổi mới và "Tải kết quả (.csv)" để lưu điểm.'),

      h1('Cần nhớ'),
      bullet('Các link này không đổi khi cập nhật bản mới lên GitHub.'),
      bullet('Mở trang giáo viên trước giờ học khoảng 5 phút, vì máy chủ miễn phí tự ngủ sau khoảng 15 phút không ai dùng (đánh thức mất khoảng 1 phút).'),
      bullet('Kết quả lưu trong bộ nhớ máy chủ và bị xóa khi máy chủ ngủ hoặc khởi động lại. Cuối mỗi buổi bấm "Tải kết quả (.csv)" để lưu điểm.'),
      bullet('Nhắc học sinh nhập họ tên kèm lớp (ví dụ: An 12A6) để giáo viên nhận ra bài làm.'),
      bullet('Không cập nhật bản mới lên GitHub khi học sinh đang làm bài, vì bài làm sẽ bị xóa.'),
      bullet('Mật khẩu giáo viên không ghi trong file này. Bạn tự cất ở nơi riêng.')
    ]
  }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log('ok', b.length); });
