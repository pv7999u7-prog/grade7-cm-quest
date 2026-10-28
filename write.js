'use strict';
// 手寫生字題（t: 'write'）：看注音，在田字格裡用手指或 Apple Pencil 寫出國字
// 題目格式：{ t: 'write', q: '海邊的岩（ㄐㄧㄤ）冒出熱泉。', w: '漿', e: '說明' }
//   q 裡用全形括號（ ）包住要寫的注音；w 是答案（可以是 1～3 個字，每個字一格）
// 批改：
//   auto：把筆畫座標送到 Google 手寫辨識，答案出現在候選字前幾名就算對；寫錯可以再寫一次
//   self：寫完後把自己的字和正確答案放在一起，自己判斷對錯（沒有網路時也會自動改用這個）

const HW_TOP = 10;          // 答案在辨識候選字前幾名內就算寫對
const HW_TIMEOUT = 7000;    // 辨識最多等幾毫秒
const HW_URL = 'https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8';

let hw = null; // 目前這題的手寫狀態

function writeQuestionHtml(q) {
  const parts = q.q.split(/（([^）]*)）/);
  const body = parts.map((t, i) => i % 2 ? `<span class="zy-blank">${esc(t)}</span>` : esc(t)).join('');
  return `<div class="small muted" style="font-weight:700">✍️ 看注音，寫出國字</div>${body}`;
}

function writeBodyHtml(q) {
  const n = [...q.w].length;
  const px = Math.floor(Math.min(240, (Math.min(innerWidth, 760) - 64 - (n - 1) * 12) / n));
  return `
    <div class="hw-row">${[...q.w].map((_, k) => `
      <div class="hw-cell">
        <canvas class="hw-pad" id="hw${k}" style="width:${px}px;height:${px}px"></canvas>
        <button class="btn-sm hw-clear" onclick="writeClear(${k})">↺ 擦掉</button>
      </div>`).join('')}</div>
    <div id="hwmsg" class="small center" style="min-height:24px;margin-top:6px"></div>
    <div id="hwbtns" style="margin-top:8px"><button class="big-btn" onclick="writeSubmit()">✔ 寫好了</button></div>
    <div id="fb"></div>`;
}

function writeInit(q) {
  hw = { q, tries: 0, boxes: [], busy: false };
  [...q.w].forEach((_, k) => {
    const cv = document.getElementById('hw' + k);
    const size = cv.clientWidth, dpr = window.devicePixelRatio || 1;
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, size / 26);
    ctx.strokeStyle = '#1d1b19';
    const box = { cv, ctx, size, strokes: [], cur: null };
    hw.boxes.push(box);
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => {
      if (sess?.answered || hw.busy) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 沒有實體指標時（測試）忽略 */ }
      const [x, y] = pos(e);
      box.cur = [[x], [y], [Date.now()]];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke();
    });
    cv.addEventListener('pointermove', e => {
      if (!box.cur) return;
      e.preventDefault();
      const co = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      const evs = co.length ? co : [e];
      for (const ev of evs) {
        const [x, y] = pos(ev);
        const xs = box.cur[0], ys = box.cur[1];
        ctx.beginPath(); ctx.moveTo(xs[xs.length - 1], ys[ys.length - 1]); ctx.lineTo(x, y); ctx.stroke();
        xs.push(x); ys.push(y); box.cur[2].push(Date.now());
      }
    });
    const end = () => { if (box.cur) { box.strokes.push(box.cur); box.cur = null; } };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  });
}

function writeClear(k) {
  if (!hw || sess?.answered || hw.busy) return;
  const b = hw.boxes[k];
  b.strokes = []; b.cur = null;
  b.ctx.clearRect(0, 0, b.size, b.size);
}

function writeMsg(html) { const el = document.getElementById('hwmsg'); if (el) el.innerHTML = html; }

// 送一格的筆跡去辨識，回傳候選字陣列；失敗回傳 null
async function writeRecognize(b) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), HW_TIMEOUT);
  try {
    const res = await fetch(HW_URL, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        options: 'enable_pre_space',
        requests: [{ writing_guide: { writing_area_width: b.size, writing_area_height: b.size }, ink: b.strokes.map(([xs, ys, ts]) => [xs.map(Math.round), ys.map(Math.round), ts.map(t => t - b.strokes[0][2][0])]), language: 'zh_TW' }],
      }),
    });
    const j = await res.json();
    return j[0] === 'SUCCESS' ? (j[1][0][1] || []) : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function writeSubmit() {
  if (!hw || sess?.answered || hw.busy) return;
  if (hw.boxes.some(b => !b.strokes.length)) { toast('每一格都要寫喔'); return; }
  const chars = [...hw.q.w];
  if (S.hwMode === 'self' || !navigator.onLine) { writeSelfCheck(); return; }
  hw.busy = true;
  writeMsg('🔍 正在看你寫的字…');
  const results = await Promise.all(hw.boxes.map(writeRecognize));
  hw.busy = false;
  if (!sess || sess.answered || hw.q !== sess.qs[sess.i]) return;
  if (results.some(r => r === null)) { writeMsg('⚠️ 連不上手寫辨識，改成自己對答案'); writeSelfCheck(); return; }
  const okEach = results.map((r, k) => r.slice(0, HW_TOP).includes(chars[k]));
  if (okEach.every(Boolean)) { writeMsg(''); writeFinish(true); return; }
  hw.tries++;
  const guess = results.map((r, k) => okEach[k] ? chars[k] : (r[0] || '？')).join('');
  if (hw.tries < 2) {
    writeMsg(`🤔 看起來像「${esc(guess)}」，筆畫寫清楚一點，再寫一次看看！（還有 1 次機會）`);
    okEach.forEach((ok, k) => { if (!ok) writeClear(k); });
    app.querySelector('.question')?.classList.add('shake');
    setTimeout(() => app.querySelector('.question')?.classList.remove('shake'), 500);
    return;
  }
  writeMsg(`看起來像「${esc(guess)}」`);
  writeFinish(false);
}

// 自己對答案：自己的字和正確的字並排
function writeSelfCheck() {
  writeMsg('');
  document.getElementById('hwbtns').innerHTML = `
    <div class="hw-compare">${writeCompareHtml()}</div>
    <div class="small muted center" style="margin:6px 0 10px">仔細比一比每一筆，寫得一模一樣才算對喔！</div>
    <div class="grid2"><button class="big-btn green" onclick="writeFinish(true)">✅ 我寫對了</button><button class="big-btn" style="background:var(--bad)" onclick="writeFinish(false)">❌ 我寫錯了</button></div>`;
  hw.busy = true;
}

function writeCompareHtml() {
  return `<div class="hw-cmp-col"><span class="small muted">我寫的</span><div class="row">${hw.boxes.map(b => `<img src="${b.cv.toDataURL()}" class="hw-img">`).join('')}</div></div>
    <div class="hw-cmp-col"><span class="small muted">正確答案</span><div class="hw-ans">${esc(hw.q.w)}</div></div>`;
}

function writeFinish(ok) {
  if (!hw || sess?.answered) return;
  sess.answered = true;
  hw.busy = true;
  const btns = document.getElementById('hwbtns');
  btns.innerHTML = ok ? '' : `<div class="hw-compare">${writeCompareHtml()}</div>`;
  document.querySelectorAll('.hw-clear').forEach(b => { b.disabled = true; });
  document.querySelectorAll('.hw-pad').forEach(c => c.classList.add(ok ? 'right' : 'wrong'));
  afterAnswer(hw.q, ok, ok ? `「${hw.q.w}」寫對了！` : `正確答案：${hw.q.w}`);
}

// ───────── 家長頁設定 ─────────
function writeSettingHtml() {
  const mode = S.hwMode || 'auto';
  return `
    <div class="card">
      <h3>✍️ 手寫生字批改方式</h3>
      <div class="grid2" style="margin-top:8px">
        <button class="big-btn ${mode === 'auto' ? 'green' : 'ghost'}" onclick="setHwMode('auto')">🤖 自動辨識${mode === 'auto' ? ' ✓' : ''}</button>
        <button class="big-btn ${mode === 'self' ? 'green' : 'ghost'}" onclick="setHwMode('self')">👀 自己對答案${mode === 'self' ? ' ✓' : ''}</button>
      </div>
      <p class="small muted">自動辨識：寫完會把「筆畫的線條座標」送到 Google 手寫辨識服務判斷寫的是哪個字（不含姓名或其他資料），答案在前 ${HW_TOP} 個候選字內就算對；第一次沒過可以再寫一次。<br>
        自己對答案：不連網，寫完把自己的字和正確答案放在一起，自己按對或錯。沒有網路時會自動改用這個方式。</p>
    </div>`;
}
function setHwMode(m) { S.hwMode = m; save(); toast(m === 'auto' ? '手寫題改為自動辨識' : '手寫題改為自己對答案'); parentPage(); }

(function writeStyles() {
  const css = `
  .zy-blank { display: inline-block; min-width: 2.2em; margin: 0 4px; padding: 0 6px 2px; border-bottom: 3px solid var(--brand); color: var(--brand-dark); font-weight: 800; letter-spacing: 1px; }
  .hw-row { display: flex; justify-content: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
  .hw-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .hw-pad { touch-action: none; border-radius: 12px; border: 3px solid #e2a3a3; background-color: #fff;
    background-image: linear-gradient(#f3c9c9, #f3c9c9), linear-gradient(#f3c9c9, #f3c9c9);
    background-size: 100% 2px, 2px 100%; background-position: center; background-repeat: no-repeat; cursor: crosshair; }
  .hw-pad.right { border-color: var(--ok); } .hw-pad.wrong { border-color: var(--bad); }
  .hw-compare { display: flex; justify-content: center; gap: 24px; align-items: flex-end; flex-wrap: wrap; margin-top: 8px; }
  .hw-cmp-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .hw-img { width: 84px; height: 84px; border: 2px solid var(--line); border-radius: 10px; background: #fff; margin: 0 2px; }
  .hw-ans { font-family: 'Kaiti TC', 'BiauKai', 'DFKai-SB', 'STKaiti', 'KaiTi', serif; font-size: 72px; line-height: 84px; color: var(--ok); font-weight: 600; }
  `;
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
})();
