'use strict';
// Phòng luyện tập Vật lí 12 · Vật lí nhiệt: máy chủ nhỏ, không cần cài gói nào (Node 18 trở lên).
// Phục vụ NGUYÊN BẢN hai trang luyện tập và chỉ thêm một đoạn báo kết quả về cho giáo viên.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const os = require('os');

const PORT = process.env.PORT || 3000;
const TEACHER_PASS = process.env.TEACHER_PASS || 'giaovien';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const MAX_STUDENTS = 400;

const META = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'meta.json'), 'utf8'));
const PAGES = {
  tln: { file: 'bai-tra-loi-ngan-vat-li-nhiet.html', url: '/bai-tra-loi-ngan-vat-li-nhiet.html' },
  ds: { file: 'bai-day-dung-sai-vat-li-nhiet.html', url: '/bai-day-dung-sai-vat-li-nhiet.html' }
};
const QIDS = {};
for (const k of Object.keys(META)) { QIDS[k] = new Set(META[k].qs.map(q => q.id)); }

// ---- trang học sinh: giữ nguyên, chỉ chèn đoạn báo kết quả ----
const REPORTER = fs.readFileSync(path.join(__dirname, 'reporter.js'), 'utf8');
const HIDE_TEACHER = '<style>[data-role="teacher"],[data-pick="teacher"]{display:none!important}</style>';
const SERVED = {};
for (const [key, p] of Object.entries(PAGES)) {
  let html = fs.readFileSync(path.join(__dirname, p.file), 'utf8');
  const inj = HIDE_TEACHER + '<script>' + REPORTER.replace('__PAGE__', key) + '</script>';
  const i = html.lastIndexOf('</body>');
  html = i >= 0 ? html.slice(0, i) + inj + html.slice(i) : html + inj;
  const buf = Buffer.from(html, 'utf8');
  SERVED[p.url] = { raw: buf, gz: zlib.gzipSync(buf, { level: 9 }) };
}
const STATIC = {
  '/': 'index.html', '/index.html': 'index.html', '/teacher': 'teacher.html'
};

// ---- trạng thái (lưu ra file để khởi động lại không mất) ----
const STATE_FILE = path.join(DATA_DIR, 'state.json');
let state = { res: { tln: {}, ds: {} } };
try { const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); if (s && s.res) state = s; } catch (e) {}
for (const k of Object.keys(PAGES)) if (!state.res[k]) state.res[k] = {};
let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (e) {}
  }, 1000);
}

// ---- tiện ích ----
function send(res, code, body, type, extra) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  res.writeHead(code, Object.assign({ 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': buf.length }, extra || {}));
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
function nameKey(n) { return String(n).trim().replace(/\s+/g, ' ').toLowerCase(); }
function csvCell(s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
const int = (v, lo, hi) => { v = parseInt(v, 10); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : 0; };

// chặn gửi dồn: mỗi địa chỉ tối đa 60 lần mỗi phút
const hits = {};
function limited(ip) {
  const m = Math.floor(Date.now() / 60000), h = hits[ip] || (hits[ip] = { m, n: 0 });
  if (h.m !== m) { h.m = m; h.n = 0; }
  return ++h.n > 60;
}
setInterval(() => { const m = Math.floor(Date.now() / 60000); for (const ip of Object.keys(hits)) if (hits[ip].m < m - 1) delete hits[ip]; }, 120000).unref();

function csvOf(page) {
  const M = META[page], rows = Object.values(state.res[page]).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const head = ['Họ tên', page === 'tln' ? 'Số câu đúng' : 'Điểm', 'Số câu đã làm'].concat(M.qs.map(q => (page === 'tln' ? 'Bài ' : 'Nhóm ') + q.g + ' câu ' + q.n));
  const lines = [head.map(csvCell).join(',')];
  for (const r of rows) {
    let tot = 0, done = 0;
    const cells = M.qs.map(q => {
      const x = r.q[q.id]; if (!x) return '';
      done++;
      if (page === 'tln') { tot += x.k ? 1 : 0; return x.k ? 'Đúng' : (x.v ? 'Đã xem đáp án' : 'Sai'); }
      tot += x.p || 0; return (x.c || 0) + '/4';
    });
    lines.push([r.name, Math.round(tot * 100) / 100, done].concat(cells).map(csvCell).join(','));
  }
  return '﻿' + lines.join('\r\n');
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    if (req.method === 'GET' && p === '/healthz') return send(res, 200, 'ok', 'text/plain');
    if (req.method === 'GET' && SERVED[p]) {
      const s = SERVED[p], gz = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
      return send(res, 200, gz ? s.gz : s.raw, 'text/html; charset=utf-8', Object.assign({ 'Cache-Control': 'no-cache' }, gz ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : { Vary: 'Accept-Encoding' }));
    }
    if (req.method === 'GET' && STATIC[p]) return send(res, 200, fs.readFileSync(path.join(__dirname, STATIC[p])), 'text/html; charset=utf-8');

    // học sinh gửi kết quả (chỉ ghi số liệu, không có nội dung do học sinh gõ ngoài họ tên)
    if (req.method === 'POST' && p === '/api/report') {
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (limited(ip)) return send(res, 429, { error: 'Gửi quá nhanh' });
      const b = await readJson(req);
      const page = b.page;
      if (!PAGES[page]) return send(res, 400, { error: 'Trang không hợp lệ' });
      const name = String(b.name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!name) return send(res, 400, { error: 'Thiếu họ tên' });
      const key = nameKey(name), store = state.res[page];
      if (!store[key] && Object.keys(store).length >= MAX_STUDENTS) return send(res, 429, { error: 'Phòng đã đầy' });
      const q = {};
      for (const id of Object.keys(b.q || {})) {
        if (!QIDS[page].has(id)) continue;
        const x = b.q[id] || {};
        q[id] = page === 'tln'
          ? { t: int(x.t, 0, 99), k: x.k ? 1 : 0, h: x.h ? 1 : 0, v: x.v ? 1 : 0 }
          : { c: int(x.c, 0, 4), p: [0, 0.1, 0.25, 0.5, 1][int(x.c, 0, 4)] };
      }
      store[key] = { name, t: Date.now(), q };
      save();
      return send(res, 200, { ok: true });
    }

    // giáo viên
    if (p.startsWith('/api/t/')) {
      if (!isTeacher(req)) return send(res, 401, { error: 'Sai mật khẩu' });
      if (req.method === 'GET' && p === '/api/t/state') return send(res, 200, { meta: META, res: state.res, now: Date.now() });
      if (req.method === 'GET' && p === '/api/t/export.csv') {
        const page = url.searchParams.get('page');
        if (!PAGES[page]) return send(res, 400, { error: 'Trang không hợp lệ' });
        return send(res, 200, csvOf(page), 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="ket-qua-' + (page === 'tln' ? 'tra-loi-ngan' : 'dung-sai') + '.csv"' });
      }
      if (req.method === 'POST' && p === '/api/t/reset') {
        const b = await readJson(req);
        if (b.page === 'all') state.res = { tln: {}, ds: {} };
        else if (PAGES[b.page]) state.res[b.page] = {};
        else return send(res, 400, { error: 'Trang không hợp lệ' });
        save();
        return send(res, 200, { ok: true });
      }
      return send(res, 404, { error: 'Không có' });
    }
    send(res, 404, 'Không tìm thấy', 'text/plain; charset=utf-8');
  } catch (e) {
    try { send(res, 500, { error: 'Lỗi máy chủ' }); } catch (e2) {}
  }
});
server.listen(PORT, () => {
  console.log('Phòng luyện tập Vật lí 12 · Vật lí nhiệt đang chạy.');
  console.log('  Học sinh:    http://localhost:' + PORT + '/');
  console.log('  Giáo viên:   http://localhost:' + PORT + '/teacher');
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log('  Cùng Wi-Fi:  http://' + a.address + ':' + PORT + '/');
  console.log('  Mật khẩu giáo viên: ' + (process.env.TEACHER_PASS ? '(đã đặt)' : TEACHER_PASS + '   <- nên đặt biến TEACHER_PASS'));
});
