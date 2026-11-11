/* Chuyển 2 trang luyện tập gốc (thư mục nguon-goc) sang dữ liệu của phòng làm bài: data/cfg.json, data/key.json, public/img/*.
   Giữ NGUYÊN VĂN từng câu, phương án, lời giải, gợi ý, hình, bảng và đáp án. Không viết lại nội dung.
   Chạy lại sau khi thay file gốc:  node tools/tao_du_lieu.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'nguon-goc', f), 'utf8');
const cut = (t, from, to) => { const a = t.indexOf(from), b = t.indexOf(to, a + from.length); if (a < 0 || b < 0) throw new Error('Không tìm thấy "' + from + '"'); return t.slice(a, b); };
const ctx = () => ({ document: { getElementById: () => ({}), createElement: () => ({}) }, window: {}, console, Math, String, Array, JSON, Number, Object });
const evalNames = (src, names) => vm.runInNewContext(src + ';({' + names.join(',') + '})', ctx(), { timeout: 8000 });

// ---- trang trả lời ngắn ----
const tText = read('bai-tra-loi-ngan-vat-li-nhiet.html');
const tln = evalNames(cut(tText, 'const BAI=[', 'const SKEY='), ['BAI', 'Q', 'FIG']);

// ---- trang đúng sai ----
const dText = read('bai-day-dung-sai-vat-li-nhiet.html');
const ds1 = evalNames(cut(dText, 'const GROUPS=[', 'const IMG='), ['GROUPS', 'Q']);
const ds2 = evalNames(cut(dText, 'const IMGMAP=', 'const SKEY='), ['IMGMAP', 'FIG']);
const iImg = dText.indexOf('const IMG='), jImg = dText.indexOf('\n', iImg);
if (iImg < 0 || jImg < 0) throw new Error('Không tìm thấy dữ liệu ảnh (const IMG=)');
const IMG = JSON.parse(dText.slice(iImg + 'const IMG='.length, jImg).trim().replace(/;$/, ''));

// ---- hình ảnh ----
const imgDir = path.join(root, 'public', 'img');
fs.mkdirSync(imgDir, { recursive: true });
const imgFiles = {};
for (const [name, uri] of Object.entries(IMG)) {
  const m = /^data:image\/(png|jpeg|jpg|gif|webp);base64,([\s\S]+)$/.exec(uri);
  if (!m) throw new Error('Ảnh không hợp lệ: ' + name);
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1], file = name + '.' + ext;
  fs.writeFileSync(path.join(imgDir, file), Buffer.from(m[2], 'base64'));
  imgFiles[name] = file;
}

// ---- cấu hình ----
const groups = {}, sessions = [], questions = [], answers = {}, explain = {}, note = {};
let count = 0;
function addGroup(g, name) { groups[g] = name; }
ds1.GROUPS.forEach(g => addGroup(g.n, 'Đúng sai · Nhóm ' + g.n + ' · ' + g.t));
tln.BAI.forEach(b => addGroup(10 + b.n, 'Trả lời ngắn · Bài ' + b.n + ' · ' + b.t));

const decs = a => { const p = String(a).split(','); return p[1] ? p[1].length : 0; };
const num = s => parseFloat(String(s).replace(',', '.'));

// đúng sai
ds1.Q.forEach(q => {
  const id = 'ds' + q.g + '_' + q.n;
  const o = { id, group: q.g, set: 'g', topic: q.g, type: 'tf', options: q.items.map(it => it[0]), text: '<b>Câu ' + q.n + '. ' + q.t + '</b>\n' + q.stem };
  const fig = {};
  const imgs = (ds2.IMGMAP[q.g + '-' + q.n] || []).map(n => imgFiles[n]).filter(Boolean);
  if (imgs.length) { fig.img = imgs; fig.alt = 'Hình của câu ' + q.n; }
  if (q.fig && ds2.FIG[q.fig]) { const h = ds2.FIG[q.fig](); if (h) fig.html = h; }
  if (fig.img || fig.html) o.fig = fig;
  questions.push(o);
  answers[id] = q.items.map(it => !!it[1]);
  const L = q.items.map((it, i) => 'abcd'[i] + ') ' + (it[1] ? 'Đúng' : 'Sai') + '. ' + it[2]);
  if (q.flow) {
    const f = q.flow;
    L.push('Tiến trình thí nghiệm:');
    [['Giả thuyết', f.gt], ['Dụng cụ', f.dc], ['Tiến hành', f.th], ['Kết quả', f.kq], ['Kết luận', f.kl]].forEach(([k, v]) => { if (v) L.push('- ' + k + ': ' + v); });
    if (f.v) L.push('Nhận xét: ' + f.v);
  }
  if (q.hint && q.hint.length) L.push('Gợi ý: ' + q.hint.join(' · '));
  explain[id] = L.join('\n');
});
// trả lời ngắn
tln.Q.forEach(q => {
  const id = 'tl' + q.b + '_' + q.n, a = num(q.a);
  let text = '<b>Câu ' + q.n + '. ' + q.t + '</b>\n' + q.q;
  if (q.ref) text += '\n📎 Các phát biểu nằm trong đề gốc (bản Word chỉ có lời giải); hãy xem đề rồi nhập đáp số.';
  const o = { id, group: 10 + q.b, set: 'g', topic: 10 + q.b, type: 'short', text };
  if (q.u) o.unit = q.u;
  if (q.fig && tln.FIG[q.fig]) o.fig = { html: tln.FIG[q.fig]() };
  questions.push(o);
  const tol = q.x ? 0 : Math.max(0.49 * Math.pow(10, -decs(q.a)), 0.002 * Math.abs(a));
  answers[id] = { v: q.a, tol: Math.round(tol * 1e9) / 1e9 };
  const L = [];
  if (q.h) L.push('Gợi ý: ' + q.h);
  L.push('Lời giải:'); q.s.forEach(x => L.push(x));
  L.push('Đáp án: ' + q.a + (q.u ? ' ' + q.u : ''));
  explain[id] = L.join('\n');
  if (q.tn) note[id] = q.tn;
});

// buổi = mỗi nhóm một buổi
const order = Object.keys(groups).map(Number).sort((a, b) => a - b);
order.forEach(g => {
  count += questions.filter(q => q.group === g).length;
  const first = count - questions.filter(q => q.group === g).length + 1;
  sessions.push({ name: 'Buổi ' + (sessions.length + 1) + ' · ' + groups[g] + ' (câu ' + first + '–' + count + ')', end: count });
});
// bảo đảm thứ tự câu khớp thứ tự buổi: đúng sai (nhóm 1–10) rồi trả lời ngắn (nhóm 11–16)
questions.sort((a, b) => a.group - b.group || 0);

const cfg = { title: 'Luyện tập Vật lí 12 · Vật lí nhiệt', released: 0, closed: 0, groups, sessions, questions };
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data', 'cfg.json'), JSON.stringify(cfg));
fs.writeFileSync(path.join(root, 'data', 'key.json'), JSON.stringify({ answers, explain, note }));
console.log('Đã tạo: ' + questions.length + ' câu (' + questions.filter(q => q.type === 'tf').length + ' đúng sai, ' + questions.filter(q => q.type === 'short').length + ' trả lời ngắn), ' + sessions.length + ' buổi, ' + Object.keys(imgFiles).length + ' ảnh');
