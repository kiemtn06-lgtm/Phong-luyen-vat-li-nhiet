// Điểm quá trình (cộng dồn qua các buổi), đếm số bài đã gửi theo từng câu, địa chỉ mạng LAN cho mã QR.
//
// Máy chủ Render bản miễn phí xóa dữ liệu khi ngủ, nên điểm các buổi được giữ ở HAI nơi:
//   - state.hist trên máy chủ (mất khi máy chủ ngủ / khởi động lại),
//   - trình duyệt của giáo viên (trang /teacher tự đồng bộ: kéo về, và nạp lại lên máy chủ khi máy chủ mất dữ liệu).
// Một buổi = từ lúc bắt đầu (hoặc "Làm lại từ đầu") tới lần "Làm lại từ đầu" kế tiếp.
// Điểm buổi = số câu đúng gửi kịp / số câu đã đóng (không tính câu chỉ xem) × 10. Học sinh nhận ra nhau theo họ tên (bỏ dấu, không phân biệt hoa thường).
//
// hist = { sess: { mãBuổi: { d: thời điểm bắt đầu, t: tên buổi, g: số câu đã chấm } },
//          sc:   { khóaTên: { n: tên hiển thị, v: { mãBuổi: số câu đúng } } },
//          del:  [mã buổi đã xóa] }
const crypto = require('crypto');
const os = require('os');

module.exports = function (ctx) {
  const { CFG, KEY, BYID, grade } = ctx;

  function nameKey(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
      .toLowerCase().replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim();
  }
  // cùng một học sinh gõ tên lúc có dấu lúc không: giữ tên có nhiều dấu hơn, bằng nhau thì lấy tên mới
  function betterName(a, b) {
    const d = s => (String(s || '').normalize('NFD').match(/[̀-ͯ]|[đĐ]/g) || []).length;
    return !a ? b : !b ? a : d(b) >= d(a) ? b : a;
  }
  function empty() { return { sess: {}, sc: {}, del: [] }; }
  function clean(h) {
    const o = empty();
    if (!h || typeof h !== 'object') return o;
    o.del = Array.isArray(h.del) ? h.del.filter(x => typeof x === 'string').slice(-500) : [];
    for (const [id, s] of Object.entries(h.sess || {})) {
      if (!s || o.del.includes(id)) continue;
      o.sess[String(id).slice(0, 40)] = { d: +s.d || 0, t: String(s.t || '').slice(0, 120), g: Math.max(0, parseInt(s.g, 10) || 0) };
    }
    for (const [k, r] of Object.entries(h.sc || {})) {
      if (!r || typeof r.v !== 'object') continue;
      const v = {};
      for (const [id, x] of Object.entries(r.v)) if (o.sess[id]) v[id] = Math.max(0, parseInt(x, 10) || 0);
      if (Object.keys(v).length) o.sc[String(k).slice(0, 80)] = { n: String(r.n || k).slice(0, 60), v };
    }
    return o;
  }
  // gộp hai bản: hợp các buổi, cùng buổi thì lấy số lớn hơn (điểm trong một buổi chỉ tăng); buổi đã xóa thì bỏ
  function merge(a, b) {
    a = clean(a); b = clean(b);
    const o = empty();
    o.del = Array.from(new Set(a.del.concat(b.del)));
    for (const h of [a, b]) for (const [id, s] of Object.entries(h.sess)) {
      if (o.del.includes(id)) continue;
      const c = o.sess[id];
      o.sess[id] = c ? { d: c.d || s.d, t: s.g >= c.g ? s.t || c.t : c.t || s.t, g: Math.max(c.g, s.g) } : Object.assign({}, s);
    }
    for (const h of [a, b]) for (const [k, r] of Object.entries(h.sc)) {
      const c = o.sc[k] || (o.sc[k] = { n: r.n, v: {} });
      c.n = betterName(c.n, r.n);
      for (const [id, x] of Object.entries(r.v)) if (o.sess[id]) c.v[id] = Math.max(c.v[id] || 0, x);
    }
    for (const k of Object.keys(o.sc)) if (!Object.keys(o.sc[k].v).length) delete o.sc[k];
    return o;
  }

  function ensure(state, hist) {
    state.hist = clean(hist || state.hist);
    if (!state.sessId) { state.sessId = crypto.randomBytes(6).toString('hex'); state.sessAt = Date.now(); }
  }
  function isLate(st, id) { return !!(st.late && st.late[id]); }
  function closedIds(state) { return state.order.slice(0, state.closed).filter(id => BYID[id] && BYID[id].type !== 'view'); }
  function title(state) {
    const names = [];
    for (const id of state.order.slice(0, state.released)) {
      const q = BYID[id], g = q && q.group, n = (CFG.groups && (CFG.groups[g] || CFG.groups[String(g)])) || '';
      if (n && !names.includes(n)) names.push(n);
    }
    return names.length ? names.slice(0, 3).join('; ') + (names.length > 3 ? '; …' : '') : (CFG.title || '');
  }
  function right(st, ids) {
    let r = 0;
    for (const id of ids) if (st.answers[id] != null && !isLate(st, id) && grade(BYID[id], st.answers[id], KEY.answers[id]) === true) r++;
    return r;
  }
  // buổi đang làm, dạng một mẩu hist (null nếu chưa đóng câu nào)
  function live(state) {
    const ids = closedIds(state);
    if (!ids.length) return null;
    const h = empty();
    h.sess[state.sessId] = { d: state.sessAt || Date.now(), t: title(state), g: ids.length };
    for (const st of Object.values(state.students)) {
      const k = nameKey(st.name); if (!k) continue;
      const r = right(st, ids), c = h.sc[k];
      if (!c || r >= c.v[state.sessId]) h.sc[k] = { n: c ? betterName(c.n, st.name) : st.name, v: { [state.sessId]: r } };
    }
    return h;
  }
  function all(state) { const l = live(state); return l ? merge(state.hist, l) : clean(state.hist); }

  // cho trang học sinh: điểm buổi này và các buổi trước của chính em
  function mine(state, st) {
    const ids = closedIds(state), k = nameKey(st.name), h = state.hist || empty(), r = h.sc[k];
    const past = [];
    if (r) for (const [id, x] of Object.entries(r.v)) {
      const s = h.sess[id];
      if (s && id !== state.sessId && s.g) past.push({ d: s.d, t: s.t, r: x, g: s.g });
    }
    past.sort((a, b) => a.d - b.d);
    return { cur: { r: right(st, ids), g: ids.length }, past };
  }
  // số học sinh đã gửi đáp án của từng câu đã mở
  function sent(state) {
    const o = {}, studs = Object.values(state.students);
    for (const id of state.order.slice(0, state.released)) {
      if (!BYID[id] || BYID[id].type === 'view') continue;
      let n = 0; for (const s of studs) if (s.answers[id] != null) n++;
      o[id] = n;
    }
    return o;
  }
  // gọi trước khi "Làm lại từ đầu": cất điểm buổi vừa xong, trả về hist cho buổi mới
  function finish(state) { return all(state); }

  async function route(req, res, p, state, send, readJson) {
    if (req.method === 'GET' && p === '/api/t/hist') { send(res, 200, { hist: all(state), cur: state.sessId }); return true; }
    if (req.method === 'POST' && p === '/api/t/hist') {
      const b = await readJson(req);
      if (b.clear) { const h = all(state); state.hist = empty(); state.hist.del = h.del.concat(Object.keys(h.sess)); state.sessId = null; ensure(state); }
      else if (b.del) { state.hist = merge(state.hist, { sess: {}, sc: {}, del: [String(b.del)] }); if (b.del === state.sessId) { state.sessId = null; ensure(state); } }
      else if (b.hist) state.hist = merge(state.hist, b.hist);
      ctx.save && ctx.save();
      send(res, 200, { hist: all(state), cur: state.sessId }); return true;
    }
    if (req.method === 'GET' && p === '/api/t/lan') {
      const ips = [];
      for (const list of Object.values(os.networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
      send(res, 200, { ips, port: req.socket.localPort }); return true;
    }
    return false;
  }

  return { ensure, mine, sent, finish, route, nameKey };
};
