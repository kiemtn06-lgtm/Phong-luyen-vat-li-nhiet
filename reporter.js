/* Đoạn này được máy chủ chèn vào cuối hai trang luyện tập khi học sinh mở trang từ phòng.
   Nó không đổi nội dung hay cách chấm của trang, chỉ gửi kết quả đã chấm về cho giáo viên. */
(function () {
  var PAGE = '__PAGE__';
  if (location.protocol === 'file:') return;
  var timer = null, last = '';
  function payload() {
    var q = {};
    try {
      if (PAGE === 'tln') {
        Q.forEach(function (x) { var id = qid(x), r = S.r[id]; if (r && r.t) q[id] = { t: r.t, k: (r.ok && !r.view) ? 1 : 0, h: r.hint ? 1 : 0, v: r.view ? 1 : 0 }; });
      } else {
        Q.forEach(function (x) { var id = qid(x); if (S.chk[id]) { var c = nCorrect(x); q[id] = { c: c, p: pts(c) }; } });
      }
    } catch (e) { return null; }
    return { page: PAGE, name: NAME, q: q };
  }
  function send() {
    timer = null;
    if (ROLE !== 'student' || !NAME) return;
    var p = payload(); if (!p) return;
    var s = JSON.stringify(p); if (s === last) return;
    last = s;
    try { fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: s, keepalive: true }).catch(function () { last = ''; }); } catch (e) { last = ''; }
  }
  var orig = save;
  save = function () { var r = orig.apply(this, arguments); if (timer) clearTimeout(timer); timer = setTimeout(send, 1500); return r; };
  window.addEventListener('pagehide', send);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(); });
  setTimeout(send, 2500);
})();
