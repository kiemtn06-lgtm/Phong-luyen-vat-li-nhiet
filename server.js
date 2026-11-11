'use strict';
// Phòng làm bài Vật lí 12 · Vật lí nhiệt: máy chủ nhỏ, không cần cài gói nào (chỉ cần Node 18 trở lên).
// Cùng động cơ với phòng khối 10, 11. Nội dung câu hỏi sinh từ 2 trang luyện tập gốc bằng tools/tao_du_lieu.js.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const zlib = require('zlib');
const ORIG = {};

const PORT = process.env.PORT || 3000;
const TEACHER_PASS = process.env.TEACHER_PASS || 'giaovien';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const MAX_STUDENTS = 400;

const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'cfg.json'), 'utf8'));
const KEY = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'key.json'), 'utf8'));
const INDEX = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));
const N = CFG.questions.length;
const BYID = {}; CFG.questions.forEach(q => { BYID[q.id] = q; });
const DEFAULT_ORDER = CFG.questions.map(q => q.id);
const VER = crypto.createHash('md5').update(INDEX).digest('hex').slice(0, 8);

// ---- trạng thái (lưu ra file để khởi động lại không mất) ----
const STATE_FILE = path.join(DATA_DIR, 'state.json');
let state = { released: 0, closed: 0, students: {} };
try { state = Object.assign(state, JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))); } catch (e) {}
function validOrder(o) { return Array.isArray(o) && o.length === DEFAULT_ORDER.length && new Set(o).size === o.length && o.every(id => BYID[id]); }
if (!validOrder(state.order)) { if (state.order) { state.released = 0; state.closed = 0; } state.order = DEFAULT_ORDER.slice(); }
function Qs() { return state.order.map(id => BYID[id]); }
state.cap = Math.max(0, Math.min(MAX_STUDENTS, parseInt(state.cap, 10) || 0));
state.locked = !!state.locked;
state.mode = state.mode === 'batch' ? 'batch' : 'single';
state.auto = !!state.auto;
state.pct = Math.max(50, Math.min(100, parseInt(state.pct, 10) || 90));
state.autoSeq = parseInt(state.autoSeq, 10) || 0;
function sessIdx(id) {
  const i = DEFAULT_ORDER.indexOf(id);
  for (let k = 0; k < (CFG.sessions || []).length; k++) if (i < CFG.sessions[k].end) return k;
  return Math.max(0, (CFG.sessions || []).length - 1);
}
// mở câu theo nhóm, dạng và số lượng: các câu được chọn chuyển lên đầu phần chưa mở
function doOpen(group, type, n) {
  const tail = state.order.slice(state.released);
  const sel = tail.filter(id => {
    const q = BYID[id];
    if (group === 'mix' && q.set !== 'mix') return false;
    if (/^\d+$/.test(group) && (q.set === 'mix' || String(q.group) !== group)) return false;
    if (type !== 'all' && q.type !== type) return false;
    return true;
  }).slice(0, n);
  if (!sel.length) return 0;
  const pick = new Set(sel);
  state.order = state.order.slice(0, state.released).concat(sel, tail.filter(id => !pick.has(id)));
  state.released += sel.length;
  return sel.length;
}
// Chế độ 2: bốc ngẫu nhiên các câu theo ma trận (CFG.matrix.rules)
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function drawMatrix() {
  const rules = CFG.matrix.rules, used = new Set(), chosen = rules.map(() => []);
  const fits = (q, r) => q.type === r.type && (r.topic == null || q.topic === r.topic) && (!r.tag || q.tag === r.tag);
  rules.forEach((r, i) => {
    shuffle(CFG.questions.filter(q => fits(q, r) && !used.has(q.id))).slice(0, r.n).forEach(q => { used.add(q.id); chosen[i].push(q.id); });
  });
  rules.forEach((r, i) => {  // thiếu câu thì lấy bù cùng dạng từ chủ đề khác
    let need = r.n - chosen[i].length;
    for (const t of [2, 3, 1]) {
      if (need <= 0) break;
      const pool = shuffle(CFG.questions.filter(q => q.type === r.type && q.topic === t && !used.has(q.id)));
      while (need > 0 && pool.length) { const q = pool.pop(); used.add(q.id); chosen[i].push(q.id); need--; }
    }
  });
  return [].concat(...chosen);
}
function joined() { return Object.keys(state.students).length; }
function classSize() { return state.cap > 0 ? state.cap : joined(); }
function isLocked() { return !!state.locked || (state.cap > 0 && joined() >= state.cap); }
// tiến độ nộp bài của câu (hoặc lô) đang mở, dùng cho vòng tròn phần trăm và chế độ tự đóng
function progressInfo() {
  if (!state.auto || state.closed >= state.released) return null;
  const size = classSize(), need = Math.max(1, Math.ceil(state.pct * size / 100));
  const studs = Object.values(state.students);
  let answered, scope;
  if (state.mode === 'batch') {
    const ids = state.order.slice(state.closed, state.released).filter(id => BYID[id].type !== 'view');
    if (!ids.length) return null;
    answered = studs.filter(x => ids.every(id => x.answers[id] != null)).length; scope = 'batch';
  } else {
    const id = state.order[state.closed];
    if (BYID[id].type === 'view') return null;
    answered = studs.filter(x => x.answers[id] != null).length; scope = 'question';
  }
  return { answered, needed: need, classSize: size, pct: state.pct, scope, index: state.closed };
}
function autoCheck() {
  if (!state.auto) return false;
  let did = false;
  for (let guard = 0; guard < 500; guard++) {
    const p = progressInfo();
    if (!p || p.answered < p.needed) break;
    if (state.mode === 'batch') state.closed = state.released; else state.closed++;
    state.autoSeq++; did = true;
  }
  return did;
}
function settingsOut() {
  return { cap: state.cap, locked: isLocked(), manualLock: state.locked, auto: state.auto, pct: state.pct, mode: state.mode, joined: joined(), classSize: classSize() };
}
let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (e) {}
  }, 800);
}

// ---- tiện ích ----
function send(res, code, body, type) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': buf.length });
  res.end(buf);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 20000) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
function isTeacher(req) {
  const p = String(req.headers['x-teacher-pass'] || '');
  const a = crypto.createHash('sha256').update(p).digest();
  const b = crypto.createHash('sha256').update(TEACHER_PASS).digest();
  return crypto.timingSafeEqual(a, b);
}
function publicConfig() {
  // câu chưa mở chỉ gửi mã và dạng, không gửi nội dung
  return {
    title: CFG.title, groups: CFG.groups, sessions: CFG.sessions, total: N, hasView: CFG.questions.some(q => q.type === 'view'),
    released: state.released, closed: state.closed,
    settings: settingsOut(), progress: progressInfo(), autoSeq: state.autoSeq,
    questions: Qs().map((q, i) => i < state.released ? q : { id: q.id, type: 'hidden', group: q.group })
  };
}
function reveal() {
  const r = { answers: {}, explain: {} };
  for (let i = 0; i < state.closed; i++) {
    const id = state.order[i];
    r.answers[id] = KEY.answers[id];
    if (KEY.explain[id]) r.explain[id] = KEY.explain[id];
  }
  return r;
}
function csvCell(s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function num(x) { const n = parseFloat(String(x).trim().replace(',', '.')); return isFinite(n) ? n : NaN; }
function grade(q, ans, k) {
  if (q.type === 'view' || ans == null || k == null) return null;
  if (q.type === 'mc') return ans === k;
  if (q.type === 'tf') return Array.isArray(ans) && same(ans, k);
  const kv = k && k.v != null ? k.v : k, tol = (k && k.tol) || 0, a = num(ans), b = num(kv);
  if (isFinite(a) && isFinite(b)) return Math.abs(a - b) <= tol + 1e-9;
  return String(ans).trim().toLowerCase() === String(kv).trim().toLowerCase();
}
function ansText(q, a) {
  if (a == null) return '';
  if (q.type === 'tf') return a.map((v, i) => 'abcd'[i] + ':' + (v === true ? 'Đ' : v === false ? 'S' : '-')).join(' ');
  return String(a);
}

// ---- xử lý yêu cầu ----
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    if (req.method === 'GET' && (p === '/' || p === '/teacher' || p === '/index.html')) return send(res, 200, INDEX, 'text/html; charset=utf-8');
    if (req.method === 'GET' && p === '/healthz') return send(res, 200, 'ok', 'text/plain');

    // học sinh
    if (req.method === 'GET' && p === '/api/state') {
      const sid = url.searchParams.get('sid') || '';
      const st = state.students[sid];
      return send(res, 200, { v: VER, config: publicConfig(), reveal: reveal(), mine: st ? { name: st.name, answers: st.answers } : null });
    }
    if (req.method === 'POST' && p === '/api/join') {
      const b = await readJson(req);
      const name = String(b.name || '').trim().slice(0, 60);
      if (!name) return send(res, 400, { error: 'Nhập họ tên' });
      let sid = String(b.sid || '');
      if (state.students[sid]) { state.students[sid].name = name; save(); return send(res, 200, { sid }); }
      if (isLocked()) return send(res, 403, { error: 'Phòng đã khóa, không nhận thêm học sinh. Em báo thầy cô nhé.' });
      if (Object.keys(state.students).length >= MAX_STUDENTS) return send(res, 429, { error: 'Phòng đã đầy' });
      sid = crypto.randomBytes(12).toString('hex');
      state.students[sid] = { name, answers: {}, joined: Date.now() };
      save();
      return send(res, 200, { sid });
    }
    if (req.method === 'POST' && p === '/api/answer') {
      const b = await readJson(req);
      const st = state.students[String(b.sid || '')];
      if (!st) return send(res, 403, { error: 'Chưa vào phòng' });
      const i = state.order.indexOf(b.qid);
      if (i < 0 || i >= state.released || i < state.closed) return send(res, 409, { error: 'Câu này không còn mở' });
      if (st.answers[b.qid] != null) return send(res, 409, { error: 'Em đã gửi câu này rồi' });
      const q = BYID[b.qid]; let v = b.value;
      if (q.type === 'view') return send(res, 400, { error: 'Câu này chỉ để xem' });
      if (q.type === 'mc') { if (!['A', 'B', 'C', 'D'].includes(v)) return send(res, 400, { error: 'Đáp án không hợp lệ' }); }
      else if (q.type === 'tf') { if (!Array.isArray(v) || v.length !== q.options.length || !v.every(x => x === true || x === false)) return send(res, 400, { error: 'Chọn đủ Đúng/Sai cho các ý' }); }
      else { v = String(v == null ? '' : v).trim().slice(0, 30); if (!v) return send(res, 400, { error: 'Nhập đáp án' }); }
      st.answers[b.qid] = v; autoCheck(); save();
      return send(res, 200, { ok: true });
    }

    // giáo viên
    if (p.startsWith('/api/t/')) {
      if (!isTeacher(req)) return send(res, 401, { error: 'Sai mật khẩu' });
      if (req.method === 'GET' && p === '/api/t/state') {
        const students = {};
        for (const [sid, s] of Object.entries(state.students)) students[sid] = { name: s.name, answers: s.answers };
        return send(res, 200, { v: VER, config: Object.assign({}, CFG, { questions: Qs(), released: state.released, closed: state.closed, total: N, settings: settingsOut(), progress: progressInfo(), autoSeq: state.autoSeq }), key: KEY, responses: students });
      }
      if (req.method === 'POST' && p === '/api/t/ctl') {
        const b = await readJson(req); const a = b.action;
        if (a === 'open') {
          const group = String(b.group || 'plan'), type = ['mc', 'tf', 'short', 'view'].includes(b.type) ? b.type : 'all';
          if (!(group === 'plan' || group === 'mix' || /^\d+$/.test(group))) return send(res, 400, { error: 'Nhóm không hợp lệ' });
          const n = b.n === 'all' ? Infinity : Math.max(1, Math.min(500, parseInt(b.n, 10) || 1));
          if (!doOpen(group, type, n)) return send(res, 409, { error: 'Không còn câu phù hợp để mở' });
        }
        else if (a === 'openSession') {
          const tail = state.order.slice(state.released);
          if (tail.length) {
            const s0 = sessIdx(tail[0]), sel = tail.filter(id => sessIdx(id) === s0), pick = new Set(sel);
            state.order = state.order.slice(0, state.released).concat(sel, tail.filter(id => !pick.has(id)));
            state.released += sel.length;
          }
        }
        else if (a === 'openNext') doOpen('plan', 'all', 1);
        else if (a === 'openAll') doOpen('plan', 'all', Infinity);
        else if (a === 'closeNext') { if (state.closed < state.released) state.closed++; }
        else if (a === 'closeAll') state.closed = state.released;
        else if (a === 'settings') {
          if (b.cap !== undefined) state.cap = Math.max(0, Math.min(MAX_STUDENTS, parseInt(b.cap, 10) || 0));
          if (b.locked !== undefined) state.locked = !!b.locked;
          if (b.mode !== undefined) state.mode = b.mode === 'batch' ? 'batch' : 'single';
          if (b.auto !== undefined) state.auto = !!b.auto;
          if (b.pct !== undefined) state.pct = Math.max(50, Math.min(100, parseInt(b.pct, 10) || 90));
          autoCheck();
        }
        else if (a === 'draw') {
          if (!CFG.matrix) return send(res, 400, { error: 'Chưa có ma trận để bốc đề' });
          if (state.released > 0) return send(res, 409, { error: 'Phòng đã mở câu. Bấm “Làm lại từ đầu” rồi mới soạn đề ngẫu nhiên.' });
          const ids = drawMatrix(), pick = new Set(ids);
          state.order = ids.concat(DEFAULT_ORDER.filter(id => !pick.has(id)));
          state.released = ids.length; state.closed = 0; state.mode = 'batch'; state.drawn = ids;
        }
        else if (a === 'reset') { state = { released: 0, closed: 0, order: DEFAULT_ORDER.slice(), students: {}, cap: state.cap, locked: false, mode: state.mode, auto: state.auto, pct: state.pct, autoSeq: state.autoSeq }; }
        else return send(res, 400, { error: 'Lệnh không hợp lệ' });
        save();
        return send(res, 200, { released: state.released, closed: state.closed });
      }
      if (req.method === 'GET' && p === '/api/t/export.csv') {
        const qs = Qs();
        const rows = [['Họ tên'].concat(qs.map((q, i) => 'Câu ' + (i + 1) + ' (' + q.id + ')')).concat(['Số câu đúng', 'Tỉ lệ đúng (%)', 'Điểm (thang 10)'])];
        for (const s of Object.values(state.students)) {
          let right = 0, shown = 0;
          const cells = qs.map((q, i) => {
            if (i >= state.released) return '';
            if (q.type === 'view') return '(chỉ xem)';
            const a = s.answers[q.id]; shown++;
            const g = grade(q, a, KEY.answers[q.id]);
            if (g === true) right++;
            return a == null ? '(chưa làm)' : ansText(q, a) + (g === true ? ' ✓' : g === false ? ' ✗' : '');
          });
          rows.push([s.name].concat(cells).concat([right, shown ? Math.round(right * 100 / shown) : 0, shown ? (Math.round(right * 100 / shown) / 10).toFixed(1).replace('.', ',') : '0,0']));
        }
        const csv = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ket-qua-li12-vat-li-nhiet.csv"' });
        return res.end(csv);
      }
    }
    // hai trang luyện tập gốc, giữ nguyên, để học sinh tự luyện ngoài giờ (không gửi kết quả về giáo viên)
    if (req.method === 'GET' && (p === '/tu-luyen/dung-sai' || p === '/tu-luyen/tra-loi-ngan')) {
      const f = p.endsWith('dung-sai') ? 'bai-day-dung-sai-vat-li-nhiet.html' : 'bai-tra-loi-ngan-vat-li-nhiet.html';
      const gz = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
      if (!ORIG[f]) { const raw = fs.readFileSync(path.join(__dirname, 'nguon-goc', f)); ORIG[f] = { raw, gz: zlib.gzipSync(raw, { level: 9 }) }; }
      const o = ORIG[f];
      res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', Vary: 'Accept-Encoding' }, gz ? { 'Content-Encoding': 'gzip' } : {}, { 'Content-Length': (gz ? o.gz : o.raw).length }));
      return res.end(gz ? o.gz : o.raw);
    }
    if (req.method === 'GET' && p.startsWith('/img/')) {
      const f = path.basename(p), fp = path.join(__dirname, 'public', 'img', f);
      const m = /^[\w.-]+\.(png|jpe?g|gif|webp)$/i.exec(f);
      if (m && fs.existsSync(fp)) {
        const ext = m[1].toLowerCase(), ct = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const buf = fs.readFileSync(fp);
        res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400', 'Content-Length': buf.length });
        return res.end(buf);
      }
    }
    send(res, 404, { error: 'Không tìm thấy' });
  } catch (e) {
    send(res, 400, { error: 'Yêu cầu không hợp lệ' });
  }
});

server.listen(PORT, () => {
  console.log('Phong lam bai dang chay o cong ' + PORT);
  console.log('  Hoc sinh:    http://localhost:' + PORT + '/');
  console.log('  Giao vien:   http://localhost:' + PORT + '/teacher');
  console.log('  Mat khau giao vien: ' + (process.env.TEACHER_PASS ? '(da dat)' : TEACHER_PASS + '   <- nen dat bien TEACHER_PASS'));
  for (const list of Object.values(os.networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) console.log('  Cung Wi-Fi:  http://' + n.address + ':' + PORT + '/');
});