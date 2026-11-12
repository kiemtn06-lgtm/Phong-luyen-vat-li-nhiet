/* Kiểm tra dữ liệu phòng sau khi chạy tools/tao_du_lieu.js:  node tools/kiem_tra.js
   - đúng định dạng (tf có đủ ý và đáp án, short có đáp án và sai số, mọi câu có lời giải)
   - đáp án gốc được động cơ chấm ĐÚNG (dùng đúng hàm chấm của server.js)
   - ảnh được tham chiếu đều có trong public/img
   Với trang gốc có hàm chấm riêng, hãy so thêm bằng tay (xem QUY_TRINH_TAO_PHONG_MOI.md, bước 5). */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'data', 'cfg.json'), 'utf8'));
const key = JSON.parse(fs.readFileSync(path.join(root, 'data', 'key.json'), 'utf8'));
const num = x => { const n = parseFloat(String(x).trim().replace(',', '.')); return isFinite(n) ? n : NaN; };
function grade(q, ans, k) {   // sao y server.js
  if (q.type === 'view' || ans == null || k == null) return null;
  if (q.type === 'mc') return ans === k;
  if (q.type === 'tf') return Array.isArray(ans) && JSON.stringify(ans) === JSON.stringify(k);
  const kv = k && k.v != null ? k.v : k, tol = (k && k.tol) || 0, a = num(ans), b = num(kv);
  if (isFinite(a) && isFinite(b)) return Math.abs(a - b) <= tol + 1e-9;
  return String(ans).trim().toLowerCase() === String(kv).trim().toLowerCase();
}
const loi = [], ids = new Set();
for (const q of cfg.questions) {
  if (ids.has(q.id)) loi.push('Trùng mã câu: ' + q.id); ids.add(q.id);
  const k = key.answers[q.id];
  if (q.type !== 'view' && k == null) { loi.push('Thiếu đáp án: ' + q.id); continue; }
  if (q.type === 'tf' && !(Array.isArray(k) && k.length === (q.options || []).length && k.every(v => typeof v === 'boolean'))) loi.push('Đáp án đúng/sai sai định dạng: ' + q.id);
  if (q.type === 'mc' && !['A', 'B', 'C', 'D'].includes(k)) loi.push('Đáp án trắc nghiệm sai định dạng: ' + q.id);
  if (q.type === 'short' && (k.v == null || !(k.tol >= 0))) loi.push('Đáp án trả lời ngắn thiếu v hoặc tol: ' + q.id);
  if (q.type === 'tf') { if (grade(q, k, k) !== true) loi.push('Động cơ chấm sai đáp án gốc: ' + q.id); }
  else if (q.type === 'short') { if (grade(q, k.v, k) !== true) loi.push('Động cơ chấm sai đáp án gốc: ' + q.id); }
  else if (q.type === 'mc') { if (grade(q, k, k) !== true) loi.push('Động cơ chấm sai đáp án gốc: ' + q.id); }
  if (q.type !== 'view' && !key.explain[q.id]) loi.push('Thiếu lời giải: ' + q.id);
  if (q.fig && q.fig.img) for (const f of [].concat(q.fig.img)) if (!fs.existsSync(path.join(root, 'public', 'img', f))) loi.push('Thiếu ảnh ' + f + ' (câu ' + q.id + ')');
  if (cfg.groups && !cfg.groups[q.group]) loi.push('Nhóm chưa đặt tên: ' + q.group + ' (câu ' + q.id + ')');
}
const dem = {}; cfg.questions.forEach(q => { dem[q.type] = (dem[q.type] || 0) + 1; });
console.log('Số câu:', cfg.questions.length, JSON.stringify(dem), '| nhóm:', Object.keys(cfg.groups || {}).length, '| buổi:', (cfg.sessions || []).length);
if (loi.length) { console.log('CÓ ' + loi.length + ' LỖI:'); loi.slice(0, 30).forEach(x => console.log(' - ' + x)); process.exit(1); }
console.log('Không có lỗi: mọi đáp án gốc được chấm đúng, định dạng hợp lệ.');
