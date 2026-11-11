/* Tạo data/meta.json (tên bài và danh sách câu) từ 2 trang luyện tập, để bảng giáo viên hiện đúng tên câu.
   Chạy lại sau khi thay file .html:  node tools/tao_meta.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
function lay(file, from, to, names) {
  const t = fs.readFileSync(path.join(root, file), 'utf8');
  const a = t.indexOf(from), b = t.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('Không tìm thấy dữ liệu trong ' + file);
  const src = t.slice(a, b) + ';({' + names.join(',') + '})';
  return vm.runInNewContext(src, { document: { getElementById: () => ({}) }, window: {}, console }, { timeout: 5000 });
}
const tln = lay('bai-tra-loi-ngan-vat-li-nhiet.html', 'const BAI=[', 'function tbl(', ['BAI', 'Q']);
const ds = lay('bai-day-dung-sai-vat-li-nhiet.html', 'const GROUPS=[', 'const IMG=', ['GROUPS', 'Q']);
const meta = {
  tln: { ten: 'Luyện trả lời ngắn', nhom: tln.BAI.map(b => ({ n: b.n, t: b.t })), qs: tln.Q.map(q => ({ id: q.b + '-' + q.n, g: q.b, n: q.n, t: q.t })) },
  ds: { ten: 'Luyện đúng sai', nhom: ds.GROUPS.map(g => ({ n: g.n, t: g.t })), qs: ds.Q.map(q => ({ id: q.g + '-' + q.n, g: q.g, n: q.n, t: q.t })) }
};
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data', 'meta.json'), JSON.stringify(meta));
console.log('meta.json: trả lời ngắn', meta.tln.qs.length, 'câu,', meta.tln.nhom.length, 'bài; đúng sai', meta.ds.qs.length, 'câu,', meta.ds.nhom.length, 'nhóm');
