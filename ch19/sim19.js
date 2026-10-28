/* =====================================================================
 * sim19.js — 19장 시뮬레이션 (교재 그림을 움직이는 버전으로 다시 그림)
 *   chartCp   장 머릿글: 연습문제 19.2 측정값을 R 단위로
 *   spring    그림 19.1  열원 속 용수철 (랑주뱅 동역학)          19.1
 *   modes     예제 19.1  제곱항 n개                               19.1
 *   gas       그림 19.3  단원자 기체의 속도 성분                  19.2
 *   diatomic  그림 19.4·19.5  이원자 분자의 회전·진동 모드        19.2
 *   solid     그림 19.6  입방 격자의 열진동                       19.2
 *   ladder    19.3 가정 1  양자화된 진동 준위                     19.3
 *   well      그림 19.7  비조화 퍼텐셜 우물                       19.3
 *   brown     19.4  큰 원판과 작은 원판들의 충돌 (브라운 운동)    19.4
 * 모든 그래프는 Book.Plot을 쓰며, 가로축이 매개변수인 그래프는 누르면 그 값으로 이동한다.
 * 수치는 해석해와 같은 화면에 나란히 보여 준다.
 * ===================================================================== */
(function(){
'use strict';
const B = window.Book, C = B.C, g = B.gauss, fmt = B.fmt, fmtP = B.fmtPlain, css = B.cssv;
const kB_meV = C.kB / C.e * 1000;           // 0.08617 meV/K
const R = C.R;

/* ---------- 공통 배치: 무대(캔버스) + 조작부 + 타일 + 그래프 ---------- */
function layout(fig, opt = {}){
  const cap = fig.querySelector('figcaption');
  const grid = document.createElement('div'); grid.className = 'sim-grid';
  const stage = document.createElement('div'); stage.className = 'sim-stage';
  const cv = document.createElement('canvas'); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', opt.aria || '시뮬레이션 화면');
  if (opt.stageH) cv.style.height = opt.stageH + 'px';
  stage.appendChild(cv);
  if (opt.note) { const n = document.createElement('div'); n.className = 'stage-note'; n.textContent = opt.note; stage.appendChild(n); }
  const side = document.createElement('div'); side.className = 'sim-ctl';
  grid.append(stage, side);
  const tiles = document.createElement('div'); tiles.className = 'sim-tiles'; tiles.setAttribute('aria-live', 'off');
  const plots = document.createElement('div'); plots.className = 'sim-plots';
  fig.insertBefore(grid, cap); fig.insertBefore(tiles, cap); fig.insertBefore(plots, cap);
  return { cv, stage, side, tiles, plots };
}
function buttons(side, list){
  const w = document.createElement('div'); w.className = 'sim-btns';
  const out = list.map(([label, cls]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sim-btn' + (cls ? ' ' + cls : ''); b.textContent = label; w.appendChild(b); return b; });
  side.appendChild(w); return out;
}
function note(side, html){ const p = document.createElement('p'); p.className = 'mini'; p.style.cssText = 'font-size:.8rem;color:var(--text-2);margin:0'; p.innerHTML = html; side.appendChild(p); B.renderMath(p); return p; }
function zigzag(ctx, x1, y1, x2, y2, n, amp){
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
  ctx.beginPath(); ctx.moveTo(x1, y1);
  const lead = Math.min(10, L * 0.12); ctx.lineTo(x1 + ux * lead, y1 + uy * lead);
  for (let i = 1; i < 2 * n; i++) { const s = lead + (L - 2 * lead) * i / (2 * n), a = (i % 2 ? 1 : -1) * amp; ctx.lineTo(x1 + ux * s + px * a, y1 + uy * s + py * a); }
  ctx.lineTo(x2 - ux * lead, y2 - uy * lead); ctx.lineTo(x2, y2); ctx.stroke();
}
function ball(ctx, x, y, r, col){
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = css('--surface'); ctx.stroke();
}
const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
function rgba(col, a){ const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(col.trim());
  if (!m) return col; return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
const logspace = (a, b, n) => Array.from({ length: n }, (_, i) => a * Math.pow(b / a, i / (n - 1)));

/* =====================================================================
 * 장 머릿글: 연습문제 19.2 측정값 (298 K, 일정 압력, J K⁻¹ mol⁻¹) — 교재 282쪽
 * ===================================================================== */
const CP_DATA = [ ['He',20.79,'g'],['Ne',20.79,'g'],['Ar',20.79,'g'],['Xe',20.79,'g'],['H₂',28.82,'g'],['N₂',29.13,'g'],['O₂',29.36,'g'],
  ['Al',24.35,'s'],['Cu',24.44,'s'],['Fe',25.10,'s'],['Zn',25.40,'s'],['Au',25.42,'s'],['Ag',25.53,'s'],['Pb',26.44,'s'] ];
function chartCp(){
  const fig = document.getElementById('fig-cp'); if (!fig) return;
  const mount = fig.querySelector('.plot-mount');
  const w = B.plotBox(mount, { title:'몰 열용량 $C_p$를 기체상수 $R$로 나눈 값 (298 K)', aria:'14가지 물질의 C_p/R 산점도',
    legend:'<span><i class="dot" style="background:var(--s1)"></i>기체</span><span><i class="dot" style="background:var(--s2)"></i>고체(금속)</span><span><i class="dash"></i>2.5, 3, 3.5</span>', height:230 });
  const p = new B.Plot(w, { yLabel:'C_p / R' });
  const xs = CP_DATA.map((d, i) => i + 1), ys = CP_DATA.map(d => d[1] / R);
  const draw = () => p.set({ xMin:0.3, xMax:CP_DATA.length + 0.7, yMin:2.3, yMax:3.75, xTicks:xs, xFmt:x => (CP_DATA[Math.round(x) - 1] || [''])[0],
    yTicks:[2.5, 3, 3.5], refs:[{ y:2.5 }, { y:3 }, { y:3.5 }],
    series:[{ xs, ys, pts:true, r:5, cols:CP_DATA.map(d => d[2] === 'g' ? '--s1' : '--s2') }],
    tip:x => { const d = CP_DATA[Math.round(x) - 1]; return d ? `${d[0]}: ${d[1].toFixed(2)} J K⁻¹ mol⁻¹ = ${(d[1] / R).toFixed(3)} R` : null; } });
  draw();
}

/* =====================================================================
 * spring — 그림 19.1: 열원 속에서 흔들리는 용수철-질량
 *   단위: 에너지 ε = k_B·300 K, 길이 ℓ0 = √(ε/(1 N/m)) = 64.36 pm, 시간 s
 *   BAOAB 랑주뱅 적분 (마찰 γ = 1 s⁻¹) → 시간 평균이 정준 앙상블 평균과 같다.
 * ===================================================================== */
function simSpring(){
  const fig = document.getElementById('sim-spring'); if (!fig) return;
  const L0 = Math.sqrt(C.kB * 300);         // m (k = 1 N/m 기준)
  const lay = layout(fig, { stageH:320, aria:'용수철에 매달린 질량이 열원 속에서 흔들리는 그림', note:'점: 열원(주변 분자)을 상징하는 그림' });
  const ui = B.controls(lay.side, [
    { key:'T', label:'열원 온도 $T$', min:50, max:1500, value:300, log:true, fmt:v => v.toFixed(0) + ' K' },
    { key:'k', label:'용수철 상수 $k$', min:0.25, max:8, value:1, log:true, fmt:v => fmtP(v, 3) + ' N/m' },
    { key:'m', label:'질량 $m$', min:0.1, max:10, value:1, log:true, fmt:v => fmtP(v, 3) + ' kg' },
    { key:'speed', label:'시간 빠르기', type:'seg', options:[[1,'×1'],[10,'×10'],[1000,'×1000']], value:10 } ]);
  const [runB, resetB] = buttons(lay.side, [['■ 멈춤', 'primary'], ['평균 다시 모으기']]);
  note(lay.side, '×1은 실제 시간이다($k=1$ N/m, $m=1$ kg이면 한 주기 약 6초). ×1000으로 두면 몇 초 만에 평균이 모인다. 매개변수를 바꾸면 평균을 처음부터 다시 모은다.');
  const tile = B.tiles(lay.tiles, [
    { key:'ke', label:'$\\langle E_{\\rm KE}\\rangle/k_BT$' }, { key:'pe', label:'$\\langle E_{\\rm PE}\\rangle/k_BT$' },
    { key:'x', label:'$x_{\\rm rms}$ 측정 / 이론 $\\sqrt{k_BT/k}$' }, { key:'v', label:'$v_{\\rm rms}$ 측정 / 이론 $\\sqrt{k_BT/m}$' },
    { key:'t', label:'모은 시간 (진동 주기 수)' } ]);
  const wRun = B.plotBox(lay.plots, { title:'누적 평균이 ½로 모이는 과정', aria:'시간에 따른 누적 평균',
    legend:'<span><i style="background:var(--s3)"></i>운동 에너지</span><span><i style="background:var(--s2)"></i>퍼텐셜 에너지</span><span><i class="dash"></i>½</span>' });
  const wT = B.plotBox(lay.plots, { title:'평균 퍼텐셜 에너지와 온도 (선: $\\tfrac12k_BT$)', aria:'온도에 따른 평균 퍼텐셜 에너지',
    legend:'<span><i style="background:var(--s1)"></i>½k_BT</span><span><i class="dot" style="background:var(--s2)"></i>지금 측정값</span>' });
  const pRun = new B.Plot(wRun, { xLabel:'모은 시간 (s)' });
  const pT = new B.Plot(wT, { xLabel:'T (K)', yLabel:'meV', onPick:x => ui.set('T', x), current:() => ui.get('T') });
  const S = { x:0, v:0, t:0, sKE:0, sPE:0, sX2:0, sV2:0, n:0, hist:[], bath:[] };
  for (let i = 0; i < 70; i++) S.bath.push({ x:Math.random(), y:Math.random() });
  const gam = 1.0;
  function reset(){ S.t = 0; S.sKE = S.sPE = S.sX2 = S.sV2 = 0; S.n = 0; S.hist = []; }
  /* 매개변수가 바뀌면 새 평형 분포에서 x, v를 다시 뽑아 과도 구간 없이 평균을 모은다 */
  function equil(){ const Tt = ui.get('T') / 300; S.x = Math.sqrt(Tt / ui.get('k')) * g(); S.v = Math.sqrt(Tt / ui.get('m')) * g(); }
  equil();
  ui.on(k => { if (k !== 'speed') equil(); reset(); });
  resetB.addEventListener('click', () => { reset(); draw(); });
  function step(dtTot){
    const Tt = ui.get('T') / 300, k = ui.get('k'), m = ui.get('m'), w = Math.sqrt(k / m);
    const dt = Math.min(0.02, 0.08 / w); let n = Math.max(1, Math.round(dtTot / dt));
    if (n > 40000) n = 40000;
    const c1 = Math.exp(-gam * dt), c2 = Math.sqrt((1 - c1 * c1) * Tt / m);
    for (let i = 0; i < n; i++) {
      S.v += -0.5 * dt * k / m * S.x; S.x += 0.5 * dt * S.v;
      S.v = c1 * S.v + c2 * g();
      S.x += 0.5 * dt * S.v; S.v += -0.5 * dt * k / m * S.x;
      const ke = 0.5 * m * S.v * S.v, pe = 0.5 * k * S.x * S.x;
      S.sKE += ke; S.sPE += pe; S.sX2 += S.x * S.x; S.sV2 += S.v * S.v; S.n++; S.t += dt;
    }
    if (!S.hist.length || S.t - S.hist[S.hist.length - 1][0] > Math.max(0.02, S.t / 300)) S.hist.push([S.t, S.sKE / S.n / Tt, S.sPE / S.n / Tt]);
  }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv);
    ctx.clearRect(0, 0, W, H);
    const Tt = ui.get('T') / 300, k = ui.get('k'), m = ui.get('m');
    /* 열원 점 */
    ctx.fillStyle = css('--muted'); ctx.globalAlpha = .35;
    const jig = 0.006 * Math.sqrt(Tt);
    for (const b of S.bath) { b.x = (b.x + jig * g() + 1) % 1; b.y = (b.y + jig * g() + 1) % 1; ctx.beginPath(); ctx.arc(b.x * W, 30 + b.y * (H - 40), 1.6, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    /* 천장 */
    const cx = Math.min(W * 0.3, 170), top = 34, eq = H * 0.56, sc = 26;
    ctx.strokeStyle = css('--text-2'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 50, top); ctx.lineTo(cx + 50, top); ctx.stroke();
    ctx.lineWidth = 1; for (let i = -50; i < 50; i += 8) { ctx.beginPath(); ctx.moveTo(cx + i, top); ctx.lineTo(cx + i + 7, top - 7); ctx.stroke(); }
    const y = Math.max(top + 40, Math.min(H - 24, eq + S.x * sc));
    ctx.setLineDash([4, 4]); ctx.strokeStyle = css('--muted'); ctx.beginPath(); ctx.moveTo(cx - 60, eq); ctx.lineTo(cx + 60, eq); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css('--muted'); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('평형 위치', cx + 62, eq + 4);
    ctx.strokeStyle = css('--text-2'); ctx.lineWidth = 1.5; zigzag(ctx, cx, top, cx, y - 14, 9, 9 + 3 / Math.sqrt(k));
    const r = 11 + 4 * Math.log10(m * 10);
    ball(ctx, cx, y, r, css('--s1'));
    ctx.fillStyle = css('--text'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('m', cx - r - 6, y);
    /* x 화살표 */
    if (Math.abs(y - eq) > 6) { ctx.strokeStyle = css('--s2'); ctx.fillStyle = css('--s2'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 34, eq); ctx.lineTo(cx + 34, y); ctx.stroke();
      const d = Math.sign(y - eq); ctx.beginPath(); ctx.moveTo(cx + 34, y); ctx.lineTo(cx + 29, y - 7 * d); ctx.lineTo(cx + 39, y - 7 * d); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillText('x', cx + 42, (y + eq) / 2); }
    /* 에너지 막대 (k_BT 단위) */
    const bx = Math.max(cx + 120, W * 0.55), bw = Math.min(46, (W - bx - 20) / 2.6), base = H - 30, top2 = 40, full = base - top2, emax = 3;
    const ke = 0.5 * m * S.v * S.v / Tt, pe = 0.5 * k * S.x * S.x / Tt;
    const aKE = S.n ? S.sKE / S.n / Tt : NaN, aPE = S.n ? S.sPE / S.n / Tt : NaN;
    [[ke, aKE, '--s3', '운동'], [pe, aPE, '--s2', '퍼텐셜']].forEach(([inst, avg, col, lab], i) => {
      const x0 = bx + i * bw * 1.4;
      ctx.fillStyle = css('--surface-2'); ctx.fillRect(x0, top2, bw, full);
      ctx.fillStyle = css(col); ctx.globalAlpha = .45; const h = Math.min(full, inst / emax * full); ctx.fillRect(x0, base - h, bw, h); ctx.globalAlpha = 1;
      if (isFinite(avg)) { const ya = base - Math.min(1, avg / emax) * full; ctx.fillStyle = css(col); ctx.fillRect(x0 - 3, ya - 1.5, bw + 6, 3); }
      ctx.fillStyle = css('--text-2'); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(lab, x0 + bw / 2, base + 4);
    });
    const yh = base - 0.5 / emax * full; ctx.setLineDash([4, 4]); ctx.strokeStyle = css('--muted'); ctx.beginPath(); ctx.moveTo(bx - 8, yh); ctx.lineTo(bx + bw * 2.4 + 8, yh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('½k_BT', bx - 10, yh);
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('k_BT 단위 · 옅게: 지금 · 굵은 선: 평균', W - 8, 8);
    /* 타일 */
    const xr = S.n ? Math.sqrt(S.sX2 / S.n) * L0 / Math.sqrt(1) : NaN, xth = Math.sqrt(C.kB * ui.get('T') / k);
    const vr = S.n ? Math.sqrt(S.sV2 / S.n) * L0 : NaN, vth = Math.sqrt(C.kB * ui.get('T') / m);
    tile('ke', fmt(aKE, 3)); tile('pe', fmt(aPE, 3));
    tile('x', `${fmt(xr * 1e12, 3)} pm`, `이론 ${fmtP(xth * 1e12, 3)} pm`);
    tile('v', `${fmt(vr, 3)} m/s`, `이론 ${fmtP(vth, 3)} m/s`);
    const per = 2 * Math.PI / Math.sqrt(k / m);
    tile('t', `${fmt(S.t, 3)} s`, `약 ${Math.floor(S.t / per)}주기`);
    const tmax = Math.max(1, S.t);
    pRun.set({ xMin:0, xMax:tmax, yMin:0, yMax:1.2, yTicks:[0, 0.5, 1], refs:[{ y:0.5, lab:'½' }],
      series:[{ xs:S.hist.map(h => h[0]), ys:S.hist.map(h => h[1]), color:'--s3' }, { xs:S.hist.map(h => h[0]), ys:S.hist.map(h => h[2]), color:'--s2' }] });
    const Ts = linspace(50, 1500, 60);
    pT.set({ xMin:50, xMax:1500, yMin:0, yMax:0.5 * kB_meV * 1500 * 1.15, series:[{ xs:Ts, ys:Ts.map(t => 0.5 * kB_meV * t), color:'--s1' }],
      markers: S.n ? [{ x:ui.get('T'), y:S.sPE / S.n * kB_meV * 300, color:'--s2' }] : [],
      tip:x => `T = ${x.toFixed(0)} K   ½k_BT = ${(0.5 * kB_meV * x).toFixed(2)} meV` });
  }
  const anim = B.animate(fig, dt => { step(dt * ui.get('speed')); draw(); });
  anim.bindButton(runB);
  ui.on(() => draw());
  B.onTheme(draw); B.onResize(draw); draw();
  B.sims.spring = { fig, play:anim.play,
    set(p){ for (const k of ['T','k','m']) if (p[k] != null) ui.set(k, p[k], true); ui.set('speed', 1000, true); equil(); reset(); draw(); },
    read(key){ if (!S.n) return null;
      if (key === 'xrms') return `${fmt(Math.sqrt(S.sX2 / S.n) * L0 * 1e12, 3)} pm (모은 시간 ${fmt(S.t, 2)} s)`;
      if (key === 'vrms') return `${fmt(Math.sqrt(S.sV2 / S.n) * L0, 3)} m/s (모은 시간 ${fmt(S.t, 2)} s)`;
      return null; } };
}

/* =====================================================================
 * modes — 예제 19.1: 독립인 제곱항 n개
 *   각 모드는 작은 포물선 우물 속 공으로 그린다. 공의 움직임은 오른슈타인-울렌벡 과정(정확한 볼츠만 분포),
 *   평균은 매 프레임 볼츠만 분포에서 직접 뽑은 표본으로 모은다. k_BT = 1.
 * ===================================================================== */
function simModes(){
  const fig = document.getElementById('sim-modes'); if (!fig) return;
  const lay = layout(fig, { stageH:250, aria:'계수가 다른 제곱항 n개가 각각 작은 우물 속 공으로 그려진 그림' });
  const ui = B.controls(lay.side, [ { key:'n', label:'제곱항 수 $n$', min:1, max:12, step:1, value:3, fmt:v => String(v) } ]);
  const [runB, mixB] = buttons(lay.side, [['■ 멈춤', 'primary'], ['계수 $\\alpha_i$ 섞기']]);
  B.renderMath(mixB);
  note(lay.side, '우물의 폭은 $\\alpha_i$에 따라 다르지만, 점선(½k_BT 높이)은 모든 우물에서 같은 높이다.');
  const tile = B.tiles(lay.tiles, [ { key:'E', label:'$\\langle E\\rangle/k_BT$ 측정' }, { key:'th', label:'예측 $n/2$' },
    { key:'rng', label:'모드별 평균의 최솟값–최댓값 ($k_BT$ 단위)' }, { key:'N', label:'표본 수' } ]);
  const wN = B.plotBox(lay.plots, { title:'평균 에너지와 제곱항 수 (선: $n/2$)', aria:'제곱항 수에 따른 평균 에너지',
    legend:'<span><i style="background:var(--s1)"></i>n/2</span><span><i class="dot" style="background:var(--s4)"></i>앞서 잰 값</span><span><i class="dot" style="background:var(--s2)"></i>지금</span>' });
  const pN = new B.Plot(wN, { xLabel:'n', yLabel:'⟨E⟩/k_BT', onPick:x => ui.set('n', x), pickSnap:x => Math.round(x), current:() => ui.get('n') });
  const wA = B.plotBox(lay.plots, { title:'모드별 평균 에너지 $\\alpha_i\\langle x_i^2\\rangle$ (선: ½)', aria:'모드별 평균 에너지 막대' });
  const pA = new B.Plot(wA, { xLabel:'모드 번호 i', yLabel:'k_BT' });
  const S = { a:[1, 4, 0.25], x:[], sE:[], sX:[], N:0, past:{} };
  const randA = () => Math.pow(10, -1 + 2 * Math.random());
  function fit(){ const n = ui.get('n'); while (S.a.length < n) S.a.push(randA()); S.a.length = n;
    S.x = S.a.map((a, i) => S.x[i] || 0); S.sE = S.a.map(() => 0); S.sX = S.a.map(() => 0); S.N = 0; }
  fit();
  ui.on(() => { fit(); draw(); });
  mixB.addEventListener('click', () => { S.a = S.a.map(randA); fit(); draw(); });
  function step(dt){
    const rho = Math.exp(-3 * dt), q = Math.sqrt(1 - rho * rho);
    S.x = S.x.map((x, i) => rho * x + q * Math.sqrt(1 / (2 * S.a[i])) * g());
    for (let s = 0; s < 120; s++) { S.a.forEach((a, i) => { const x = Math.sqrt(1 / (2 * a)) * g(); S.sE[i] += a * x * x; S.sX[i] += x * x; }); S.N++; }
  }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const n = S.a.length, cw = W / n, base = H - 46, emax = 3, hE = (base - 24) / emax;
    for (let i = 0; i < n; i++) {
      const cx = cw * (i + 0.5), half = cw * 0.44, xs = 4.2;
      ctx.strokeStyle = css('--text-2'); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let j = 0; j <= 60; j++) { const x = -xs + 2 * xs * j / 60, e = S.a[i] * x * x; if (e > emax) continue; const px = cx + x / xs * half, py = base - e * hE; ctx.lineTo(px, py); }
      ctx.stroke();
      const yh = base - 0.5 * hE; ctx.setLineDash([3, 3]); ctx.strokeStyle = css('--muted'); ctx.beginPath(); ctx.moveTo(cx - half, yh); ctx.lineTo(cx + half, yh); ctx.stroke(); ctx.setLineDash([]);
      const x = S.x[i], e = S.a[i] * x * x; const bx = cx + Math.max(-1, Math.min(1, x / xs)) * half, by = base - Math.min(emax, e) * hE;
      ball(ctx, bx, by - 6, 6, css('--s2'));
      ctx.fillStyle = css('--text-2'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(`x${i + 1}`, cx, base + 4); ctx.fillStyle = css('--muted'); ctx.fillText(`α=${fmtP(S.a[i], 2)}`, cx, base + 20);
    }
    ctx.fillStyle = css('--muted'); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('점선: ½k_BT 높이', 6, 4);
    const tot = S.N ? S.sE.reduce((s, v) => s + v, 0) / S.N : NaN; if (S.N) S.past[n] = tot;
    const per = S.sE.map(v => S.N ? v / S.N : NaN);
    tile('E', fmt(tot, 4)); tile('th', fmt(n / 2, 3)); tile('rng', S.N ? `${fmtP(Math.min(...per), 3)} – ${fmtP(Math.max(...per), 3)}` : '—'); tile('N', S.N.toLocaleString('en'));
    const ns = linspace(1, 12, 12), pk = Object.keys(S.past).map(Number);
    pN.set({ xMin:0.5, xMax:12.5, yMin:0, yMax:6.6, xTicks:ns.filter(v => v % 1 === 0 && (v % 2 === 0 || v === 1)), series:[{ xs:[0.5, 12.5], ys:[0.25, 6.25], color:'--s1' },
      { xs:pk, ys:pk.map(k => S.past[k]), pts:true, r:3.5, color:'--s4' }], markers: S.N ? [{ x:n, y:tot, color:'--s2' }] : [],
      tip:x => `n = ${Math.round(x)}  →  n/2 = ${Math.round(x) / 2}` });
    pA.set({ xMin:0.4, xMax:n + 0.6, yMin:0, yMax:0.8, xTicks:linspace(1, n, n), yTicks:[0, 0.25, 0.5, 0.75], refs:[{ y:0.5 }],
      series:[{ xs:linspace(1, n, n), ys:per, bars:true, w:0.7, color:'--s2', alpha:.55 }],
      tip:x => { const i = Math.round(x) - 1; return per[i] != null ? `x${i + 1}: α = ${fmtP(S.a[i], 3)},  α⟨x²⟩ = ${fmtP(per[i], 3)} k_BT,  ⟨x²⟩ = ${fmtP(S.sX[i] / S.N, 3)}` : null; } });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); });
  anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.modes = { fig, play:anim.play,
    set(p){ if (p.alphas) { ui.set('n', p.alphas.length, true); S.a = p.alphas.slice(); S.x = []; fit(); } draw(); },
    read(key){ const m = /^ratio:(\d+):(\d+)$/.exec(key); if (!m || !S.N) return null; const i = +m[1], j = +m[2]; if (S.sX[i] == null || S.sX[j] == null) return null;
      return `${fmt(S.sX[i] / S.sX[j], 4)} (표본 ${S.N.toLocaleString('en')}개)`; } };
}

/* =====================================================================
 * gas — 그림 19.3: 단원자 기체 원자의 속도 v = (v_x, v_y, v_z)
 *   실제 속력(m/s)을 화면 속도로 비례 축소한다. 벽·원자 사이 충돌은
 *   무작위로 고른 원자의 속도를 그 온도의 맥스웰 분포에서 다시 뽑는 것으로 흉내 낸다(모형 가정).
 * ===================================================================== */
const GASES = [['He', 4.002602], ['Ne', 20.1797], ['Ar', 39.948], ['Kr', 83.798], ['Xe', 131.293]];
function simGas(){
  const fig = document.getElementById('sim-gas'); if (!fig) return;
  const lay = layout(fig, { stageH:320, aria:'상자 속 단원자 기체 원자들과 한 원자의 속도 성분', note:'빨간 원자의 속도와 세 성분을 화살표로 표시' });
  const ui = B.controls(lay.side, [
    { key:'gas', label:'기체', type:'seg', options:GASES.map(d => [d[0], d[0]]), value:'Ar' },
    { key:'T', label:'온도 $T$', min:50, max:1000, value:300, log:true, fmt:v => v.toFixed(0) + ' K' } ]);
  const [runB, resetB] = buttons(lay.side, [['■ 멈춤', 'primary'], ['평균 다시 모으기']]);
  note(lay.side, '화면 속도는 실제 속력에 비례한다(He가 가장 빠르다). 질량은 $\\mathrm{u}$ 단위 원자량을 썼다.');
  const tile = B.tiles(lay.tiles, [ { key:'ex', label:'$\\langle\\tfrac12mv_x^2\\rangle/k_BT$' }, { key:'ey', label:'$\\langle\\tfrac12mv_y^2\\rangle/k_BT$' },
    { key:'ez', label:'$\\langle\\tfrac12mv_z^2\\rangle/k_BT$' }, { key:'E', label:'$\\langle E\\rangle$ 측정 / $\\tfrac32k_BT$' }, { key:'v', label:'$v_{\\rm rms}=\\sqrt{3k_BT/m}$' } ]);
  const wH = B.plotBox(lay.plots, { title:'$v_y$ 분포: 막대(측정)와 선(볼츠만 분포)', aria:'속도 성분 히스토그램' });
  const pH = new B.Plot(wH, { xLabel:'v_y (m/s)' });
  const wM = B.plotBox(lay.plots, { title:'평균 병진 에너지와 원자 질량 (선: $\\tfrac32k_BT$)', aria:'원자 질량에 따른 평균 에너지',
    legend:'<span><i style="background:var(--s1)"></i>3/2 k_BT</span><span><i class="dot" style="background:var(--s4)"></i>앞서 잰 기체</span><span><i class="dot" style="background:var(--s2)"></i>지금</span>' });
  const pM = new B.Plot(wM, { xLabel:'원자 질량 (u)', yLabel:'meV',
    onPick:x => { let best = GASES[0]; for (const d of GASES) if (Math.abs(Math.log(d[1] / x)) < Math.abs(Math.log(best[1] / x))) best = d; ui.set('gas', best[0]); },
    current:() => (GASES.find(d => d[0] === ui.get('gas')) || GASES[0])[1] });
  const N = 90, SCALE = 4.0e-4;
  const A = []; let S;
  const mass = () => (GASES.find(d => d[0] === ui.get('gas')) || GASES[2])[1] * C.u;
  const sig = () => Math.sqrt(C.kB * ui.get('T') / mass());
  function resample(a){ const s = sig(); a.vx = s * g(); a.vy = s * g(); a.vz = s * g(); }
  for (let i = 0; i < N; i++) { const a = { x:Math.random(), y:Math.random(), z:Math.random() }; A.push(a); }
  const past = {};
  function reset(){ A.forEach(resample); S = { sx:0, sy:0, sz:0, n:0, hist:new Array(40).fill(0), hn:0 }; }
  reset(); ui.on(() => { reset(); draw(); }); resetB.addEventListener('click', () => { reset(); draw(); });
  function step(dt){
    const m = mass();
    for (const a of A) {
      if (Math.random() < 0.6 * dt) resample(a);
      a.x += a.vx * SCALE * dt; a.y += a.vy * SCALE * dt; a.z += a.vz * SCALE * dt;
      for (const k of ['x', 'y', 'z']) { const vk = 'v' + k; if (a[k] < 0) { a[k] = -a[k]; a[vk] = Math.abs(a[vk]); } if (a[k] > 1) { a[k] = 2 - a[k]; a[vk] = -Math.abs(a[vk]); } }
      S.sx += 0.5 * m * a.vx * a.vx; S.sy += 0.5 * m * a.vy * a.vy; S.sz += 0.5 * m * a.vz * a.vz;
      const s = sig(), b = Math.floor((a.vy / s + 4) / 8 * 40); if (b >= 0 && b < 40) { S.hist[b]++; } S.hn++;
    }
    S.n += N;
  }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const Sz = Math.min(W * 0.62, H * 0.66), ox = W * 0.5 - Sz * 0.3, oy = H * 0.62 + Sz * 0.12;
    /* 그림 19.3의 축 배치: v_z 위, v_y 오른쪽, v_x 앞(왼쪽 아래) */
    const P = (x, y, z) => [ox + Sz * (y - 0.42 * x), oy - Sz * (z - 0.30 * x) + 0];
    ctx.strokeStyle = css('--line'); ctx.lineWidth = 1;
    const cube = [[0,0,0],[0,1,0],[0,1,1],[0,0,1],[1,0,0],[1,1,0],[1,1,1],[1,0,1]];
    const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    ctx.beginPath(); for (const [i, j] of edges) { const a = P(...cube[i]), b = P(...cube[j]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke();
    const order = A.map((a, i) => i).sort((i, j) => A[i].x - A[j].x);
    for (const i of order) { const a = A[i], [px, py] = P(a.x, a.y, a.z), r = 2.5 + 2.5 * a.x;
      ctx.globalAlpha = 0.45 + 0.5 * a.x; ball(ctx, px, py, r, i === 0 ? css('--bad') : css('--s1')); }
    ctx.globalAlpha = 1;
    /* 빨간 원자의 속도와 성분 */
    const a = A[0], [px, py] = P(a.x, a.y, a.z), vs = 0.16 / (sig() * 1.6);
    const arrow = (dx, dy, dz, col, lab) => { const [qx, qy] = P(a.x + dx * vs, a.y + dy * vs, a.z + dz * vs);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke();
      const ang = Math.atan2(qy - py, qx - px); ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(qx - 7 * Math.cos(ang - .4), qy - 7 * Math.sin(ang - .4)); ctx.lineTo(qx - 7 * Math.cos(ang + .4), qy - 7 * Math.sin(ang + .4)); ctx.fill();
      if (lab) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(lab, qx + 4, qy); } };
    arrow(a.vx, 0, 0, css('--s4'), 'v_x'); arrow(0, a.vy, 0, css('--s3'), 'v_y'); arrow(0, 0, a.vz, css('--s5'), 'v_z'); arrow(a.vx, a.vy, a.vz, css('--bad'), 'v');
    /* 축 기호 (그림 19.3) */
    const gx = 34, gy = H - 30;
    ctx.strokeStyle = css('--text-2'); ctx.fillStyle = css('--text-2'); ctx.lineWidth = 1.2;
    [[0, -26, 'v_z'], [28, 0, 'v_y'], [-16, 14, 'v_x']].forEach(([dx, dy, l]) => { ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + dx, gy + dy); ctx.stroke(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l, gx + dx * 1.35, gy + dy * 1.35); });
    /* 수치 */
    const kT = C.kB * ui.get('T'), m = mass();
    const ex = S.n ? S.sx / S.n / kT : NaN, ey = S.n ? S.sy / S.n / kT : NaN, ez = S.n ? S.sz / S.n / kT : NaN, Em = (S.sx + S.sy + S.sz) / S.n;
    if (S.n) past[ui.get('gas')] = Em / C.e * 1000;
    tile('ex', fmt(ex, 3)); tile('ey', fmt(ey, 3)); tile('ez', fmt(ez, 3));
    tile('E', S.n ? `${fmt(Em / C.e * 1000, 3)} meV` : '—', `이론 ${fmtP(1.5 * kT / C.e * 1000, 3)} meV = ${fmtP(1.5 * kT / C.e, 3)} eV`);
    tile('v', `${fmt(Math.sqrt(3 * kT / m), 3)} m/s`);
    const s = sig(), xs = linspace(-4 + 0.1, 4 - 0.1, 40).map(u => u * s), w = 8 * s / 40;
    const hy = S.hist.map(c => S.hn ? c / (S.hn * w) : 0), gx2 = linspace(-4 * s, 4 * s, 120);
    pH.set({ xMin:-4 * s, xMax:4 * s, yMin:0, yMax:1.25 / (s * Math.sqrt(2 * Math.PI)),
      yTicks:[0], series:[{ xs, ys:hy, bars:true, w, color:'--s3', alpha:.4 }, { xs:gx2, ys:gx2.map(v => Math.exp(-v * v / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI))), color:'--s3' }],
      tip:v => `v_y = ${v.toFixed(0)} m/s` });
    const ms = logspace(2, 200, 40), pk = Object.keys(past), Eth = 1.5 * kT / C.e * 1000;
    pM.set({ xMin:2, xMax:200, xLog:true, yMin:0, yMax:Math.max(Eth * 1.6, 1), xTicks:[2, 5, 10, 20, 50, 100, 200],
      series:[{ xs:ms, ys:ms.map(() => Eth), color:'--s1' }, { xs:pk.map(k => GASES.find(d => d[0] === k)[1]), ys:pk.map(k => past[k]), pts:true, r:3.5, color:'--s4' }],
      labels:GASES.map(d => ({ x:d[1], y:Eth * 0.2, text:d[0], align:'center', dx:0 })),
      markers: S.n ? [{ x:m / C.u, y:Em / C.e * 1000, color:'--s2' }] : [],
      tip:x => `질량 ${x.toFixed(1)} u   3/2 k_BT = ${Eth.toFixed(2)} meV (질량과 무관)` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); });
  anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.gas = { fig, play:anim.play,
    set(p){ if (p.gas) ui.set('gas', p.gas, true); if (p.T) ui.set('T', p.T, true); reset(); draw(); },
    read(key){ if (!S.n) return null; const E = (S.sx + S.sy + S.sz) / S.n / C.e;
      if (key === 'E_eV') return `${fmt(E, 4)} eV (원자·시간 평균 ${S.n.toLocaleString('en')}개)`; return null; } };
}

/* =====================================================================
 * diatomic — 그림 19.4(회전)·19.5(진동): 이원자 분자의 제곱항 7개
 *   k_BT = 1 단위. 병진 3, 회전 2(결합축 둘레 회전은 없음), 진동 2(운동·퍼텐셜).
 *   각 자유도에 랑주뱅 열원을 붙여 시간 평균을 모은다.
 * ===================================================================== */
function simDiatomic(){
  const fig = document.getElementById('sim-diatomic'); if (!fig) return;
  const lay = layout(fig, { stageH:320, aria:'상자 속에서 움직이고 회전하고 진동하는 이원자 분자', note:'진동 폭은 잘 보이도록 과장했다' });
  const ui = B.controls(lay.side, [
    { key:'rot', label:'회전 모드 2개 (축 1, 2) 켜기', type:'check', value:true },
    { key:'vib', label:'진동 모드 2개 (운동·퍼텐셜) 켜기', type:'check', value:true } ]);
  const [runB, resetB] = buttons(lay.side, [['■ 멈춤', 'primary'], ['평균 다시 모으기']]);
  note(lay.side, '결합축(축 3) 둘레의 회전은 처음부터 넣지 않았다. 그 이유는 19.3절에서 다룬다.');
  const tile = B.tiles(lay.tiles, [ { key:'f', label:'세어진 제곱항 수 $f$' }, { key:'E', label:'$\\langle E\\rangle/k_BT$ 측정 / 예측 $f/2$' },
    { key:'cv', label:'$C_V/R = f/2$' }, { key:'cp', label:'$C_p/R = f/2+1$' }, { key:'g', label:'$\\gamma = 1+2/f$' } ]);
  const LABS = ['v_x', 'v_y', 'v_z', 'L₁', 'L₂', '진동 운동', '진동 퍼텐셜'];
  const wB = B.plotBox(lay.plots, { title:'제곱항별 평균 에너지 ($k_BT$ 단위, 점선 ½)', aria:'일곱 제곱항의 평균 에너지 막대',
    legend:'<span><i style="background:var(--s1);opacity:.5"></i>누적 평균</span><span><i class="dot" style="background:var(--s2)"></i>지금 값</span>' });
  const pB = new B.Plot(wB, {});
  const GAS_LINES = [['He·Ne·Ar·Xe', 20.79], ['H₂', 28.82], ['N₂', 29.13], ['O₂', 29.36]];
  const wF = B.plotBox(lay.plots, { title:'예측 $C_p/R$와 측정값 (298 K, 교재 연습문제 19.2)', aria:'자유도 수에 따른 Cp/R 예측과 측정',
    legend:'<span><i style="background:var(--s1)"></i>f/2+1</span><span><i class="dash"></i>측정값</span>' });
  const pF = new B.Plot(wF, { xLabel:'f', yLabel:'C_p/R',
    onPick:x => { const f = [3, 5, 7].reduce((b, v) => Math.abs(v - x) < Math.abs(b - x) ? v : b, 3); ui.set('rot', f >= 5, true); ui.set('vib', f === 7, true); equil(); reset(); draw(); },
    current:() => fOf() });
  const fOf = () => 3 + (ui.get('rot') ? 2 : 0) + (ui.get('vib') ? 2 : 0);
  const I = 0.5, M = 1, mu = 0.25, kap = 36, gam = 1.5, Tt = 1, L0 = 0.62;
  const S = { p:[0, 0, 0], V:[0.5, -0.3, 0.2], n:[1, 0, 0], e1:[0, 1, 0], w:[0, 0.8, 0.6], xi:0, xd:0, sums:new Array(7).fill(0), cnt:0, inst:new Array(7).fill(0) };
  /* 평균용 앙상블: 보이는 분자와 같은 규칙(같은 열원·같은 질량·관성모멘트·용수철)을 따르는 분자 60개 */
  const K = 60, EV = new Float64Array(3 * K), EW = new Float64Array(2 * K), EX = new Float64Array(K), EXD = new Float64Array(K);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
  function reset(){ S.sums.fill(0); S.cnt = 0; }
  /* 켜는 순간 그 모드를 평형 분포에서 뽑아 넣는다 */
  function equil(){
    S.xi = Math.sqrt(Tt / kap) * g(); S.xd = Math.sqrt(Tt / mu) * g();
    const r = [g(), g(), g()].map(v => v * Math.sqrt(Tt / I)); S.w = r.map((v, k) => v - dot(r, S.n) * S.n[k]);
    S.V = S.V.map(() => Math.sqrt(Tt / M) * g());
    for (let i = 0; i < K; i++) { for (let k = 0; k < 3; k++) EV[3 * i + k] = Math.sqrt(Tt / M) * g(); EW[2 * i] = Math.sqrt(Tt / I) * g(); EW[2 * i + 1] = Math.sqrt(Tt / I) * g();
      EX[i] = Math.sqrt(Tt / kap) * g(); EXD[i] = Math.sqrt(Tt / mu) * g(); }
  }
  equil();
  ui.on(() => { equil(); reset(); draw(); }); resetB.addEventListener('click', () => { reset(); draw(); });
  function step(dtTot){
    const dt = 0.004, n = Math.min(60, Math.ceil(dtTot / dt));
    const c1 = Math.exp(-gam * dt), q = k => Math.sqrt((1 - c1 * c1) * Tt / k);
    for (let s = 0; s < n; s++) {
      for (let k = 0; k < 3; k++) { S.V[k] = c1 * S.V[k] + q(M) * g(); S.p[k] += S.V[k] * dt * 0.35;
        if (S.p[k] < -1) { S.p[k] = -2 - S.p[k]; S.V[k] = Math.abs(S.V[k]); } if (S.p[k] > 1) { S.p[k] = 2 - S.p[k]; S.V[k] = -Math.abs(S.V[k]); } }
      if (ui.get('rot')) {
        let w = S.w.map(v => c1 * v + q(I) * g()); w = w.map((v, k) => v - dot(w, S.n) * S.n[k]); S.w = w;
        const dn = cross(S.w, S.n); S.n = nrm(S.n.map((v, k) => v + dn[k] * dt));
        S.w = S.w.map((v, k) => v - dot(S.w, S.n) * S.n[k]);
        S.e1 = nrm(S.e1.map((v, k) => v - dot(S.e1, S.n) * S.n[k]));
      }
      if (ui.get('vib')) { S.xd += -0.5 * dt * kap / mu * S.xi; S.xi += 0.5 * dt * S.xd; S.xd = c1 * S.xd + q(mu) * g(); S.xi += 0.5 * dt * S.xd; S.xd += -0.5 * dt * kap / mu * S.xi; }
      const e2 = cross(S.n, S.e1);
      const inst = [0.5 * M * S.V[0] ** 2, 0.5 * M * S.V[1] ** 2, 0.5 * M * S.V[2] ** 2,
        ui.get('rot') ? 0.5 * I * dot(S.w, S.e1) ** 2 : 0, ui.get('rot') ? 0.5 * I * dot(S.w, e2) ** 2 : 0,
        ui.get('vib') ? 0.5 * mu * S.xd ** 2 : 0, ui.get('vib') ? 0.5 * kap * S.xi ** 2 : 0];
      S.inst = inst;
      const rot = ui.get('rot'), vib = ui.get('vib'), acc = new Array(7).fill(0);
      for (let i = 0; i < K; i++) {
        for (let k = 0; k < 3; k++) { const j = 3 * i + k; EV[j] = c1 * EV[j] + q(M) * g(); acc[k] += 0.5 * M * EV[j] * EV[j]; }
        if (rot) for (let k = 0; k < 2; k++) { const j = 2 * i + k; EW[j] = c1 * EW[j] + q(I) * g(); acc[3 + k] += 0.5 * I * EW[j] * EW[j]; }
        if (vib) { EXD[i] += -0.5 * dt * kap / mu * EX[i]; EX[i] += 0.5 * dt * EXD[i]; EXD[i] = c1 * EXD[i] + q(mu) * g(); EX[i] += 0.5 * dt * EXD[i]; EXD[i] += -0.5 * dt * kap / mu * EX[i];
          acc[5] += 0.5 * mu * EXD[i] * EXD[i]; acc[6] += 0.5 * kap * EX[i] * EX[i]; }
      }
      for (let k = 0; k < 7; k++) S.sums[k] += acc[k] / K; S.cnt++;
    }
  }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const Sz = Math.min(W * 0.36, H * 0.38), ox = W / 2, oy = H / 2 + 10;
    const P = v => [ox + Sz * (v[1] - 0.45 * v[0]), oy - Sz * (v[2] - 0.32 * v[0])];
    ctx.strokeStyle = css('--line'); ctx.lineWidth = 1; ctx.beginPath();
    const c = [-1.15, 1.15]; const corners = []; for (const x of c) for (const y of c) for (const z of c) corners.push([x, y, z]);
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const d = corners[i].reduce((s, v, k) => s + (v !== corners[j][k] ? 1 : 0), 0); if (d === 1) { const a = P(corners[i]), b = P(corners[j]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } }
    ctx.stroke();
    const half = (L0 + (ui.get('vib') ? S.xi * 0.9 : 0)) / 2;
    const A1 = S.p.map((v, k) => v + S.n[k] * half), A2 = S.p.map((v, k) => v - S.n[k] * half);
    const [x1, y1] = P(A1), [x2, y2] = P(A2), [xc, yc] = P(S.p);
    const e2 = cross(S.n, S.e1);
    /* 축 1, 2, 3 (그림 19.4) */
    ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    [[S.e1, '1', '--s3'], [e2, '2', '--s5'], [S.n, '3', '--muted']].forEach(([ax, lab, col]) => {
      const a = P(S.p.map((v, k) => v + ax[k] * 0.62)), b = P(S.p.map((v, k) => v - ax[k] * 0.62));
      ctx.strokeStyle = css(col); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.stroke();
      ctx.fillStyle = css(col); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lab, a[0] + (a[0] - xc) * 0.12, a[1] + (a[1] - yc) * 0.12);
    });
    ctx.setLineDash([]);
    ctx.strokeStyle = css('--text-2'); ctx.lineWidth = ui.get('vib') ? 1.6 : 4;
    if (ui.get('vib')) zigzag(ctx, x1, y1, x2, y2, 6, 5); else { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    const front = (A1[0] > A2[0]);
    const r = Math.max(9, Sz * 0.11);
    if (front) { ball(ctx, x2, y2, r, css('--s1')); ball(ctx, x1, y1, r, css('--s1')); } else { ball(ctx, x1, y1, r, css('--s1')); ball(ctx, x2, y2, r, css('--s1')); }
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('축 3(결합축) 둘레 회전: 넣지 않음', 8, 8);
    const f = fOf(), avg = S.sums.map(v => S.cnt ? v / S.cnt / Tt : NaN), tot = avg.reduce((s, v) => s + v, 0);
    tile('f', String(f), f === 3 ? '병진만' : f === 5 ? '병진 + 회전' : f === 7 ? '병진 + 회전 + 진동' : '병진 + 진동');
    tile('E', `${fmt(tot, 3)} / ${f / 2}`); tile('cv', fmt(f / 2, 3)); tile('cp', fmt(f / 2 + 1, 3)); tile('g', `${fmt(1 + 2 / f, 4)}`, f === 3 ? '= 5/3' : f === 5 ? '= 7/5' : f === 7 ? '= 9/7' : '');
    const on = [1, 1, 1, ui.get('rot'), ui.get('rot'), ui.get('vib'), ui.get('vib')];
    pB.set({ xMin:0.4, xMax:7.6, yMin:0, yMax:2.2, xTicks:[1, 2, 3, 4, 5, 6, 7], xFmt:x => ['', 'v_x', 'v_y', 'v_z', 'L₁', 'L₂', '진K', '진V'][x] || '', yTicks:[0, 0.5, 1, 1.5, 2], refs:[{ y:0.5 }],
      series:[{ xs:[1, 2, 3, 4, 5, 6, 7], ys:avg.map((v, i) => on[i] ? v : 0), bars:true, w:0.72, color:'--s1', alpha:.5 },
        { xs:[1, 2, 3, 4, 5, 6, 7], ys:S.inst.map((v, i) => on[i] ? Math.min(2.15, v / Tt) : NaN), pts:true, r:3.5, color:'--s2' }],
      tip:x => { const i = Math.round(x) - 1; return LABS[i] ? `${LABS[i]}: 평균 ${on[i] ? fmtP(avg[i], 3) : '꺼짐'} k_BT` : null; } });
    pF.set({ xMin:2, xMax:8, yMin:2, yMax:5, xTicks:[3, 5, 7], yTicks:[2.5, 3.5, 4.5], series:[{ xs:[2, 8], ys:[2, 5], color:'--s1' }],
      refs:GAS_LINES.map(([n, v]) => ({ y:v / R, lab:n === 'H₂' ? 'N₂ 3.50 · O₂ 3.53 · H₂ 3.47' : (n.startsWith('He') ? `${n} 2.50` : ''), labX:2.05, labAlign:'left' })),
      markers:[{ x:f, y:f / 2 + 1, color:'--s2', label:`f=${f}` }], tip:x => `f = ${x.toFixed(1)} → C_p/R = ${(x / 2 + 1).toFixed(2)}` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); });
  anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.diatomic = { fig, play:anim.play,
    set(p){ if (p.rot != null) ui.set('rot', p.rot, true); if (p.vib != null) ui.set('vib', p.vib, true); equil(); reset(); draw(); },
    read(key){ const f = fOf(); if (key === 'gamma') return `${fmt(1 + 2 / f, 4)} (f = ${f})`; if (key === 'cp') return `${fmt(f / 2 + 1, 3)} R (f = ${f})`; return null; } };
}

/* =====================================================================
 * solid — 그림 19.6: 입방 격자 (4×4×4 원자, 바깥은 고정된 벽에 연결)
 *   가장 가까운 이웃끼리 용수철. 각 원자에 랑주뱅 열원. 진폭은 보기 쉽게 과장.
 * ===================================================================== */
function simSolid(){
  const fig = document.getElementById('sim-solid'); if (!fig) return;
  const lay = layout(fig, { stageH:330, aria:'용수철로 연결된 입방 격자의 원자들이 열진동하는 그림', note:'진폭은 보기 쉽게 과장했다' });
  const ui = B.controls(lay.side, [
    { key:'T', label:'온도 $T$', min:50, max:1000, value:300, log:true, fmt:v => v.toFixed(0) + ' K' },
    { key:'focus', label:'그림 19.6처럼 원자 하나와 이웃 6개만 강조', type:'check', value:false } ]);
  const [runB, resetB] = buttons(lay.side, [['■ 멈춤', 'primary'], ['평균 다시 모으기']]);
  note(lay.side, '원자 64개, 바깥 원자는 고정된 벽과 용수철로 이어져 있다. 원자 하나에 붙은 용수철은 6개다.');
  const tile = B.tiles(lay.tiles, [ { key:'ke', label:'$\\langle E_{\\rm KE}\\rangle/Nk_BT$ (예측 3/2)' }, { key:'pe', label:'$\\langle E_{\\rm PE}\\rangle/Nk_BT$ (예측 3/2)' },
    { key:'E', label:'$\\langle E\\rangle/Nk_BT$ (예측 3)' }, { key:'C', label:'몰 열용량 (측정에서 환산)' } ]);
  const wD = B.plotBox(lay.plots, { title:'금속의 측정값 $C_p/R$ (298 K, 교재 연습문제 19.2)', aria:'금속 일곱 가지의 Cp/R',
    legend:'<span><i class="dot" style="background:var(--s2)"></i>측정</span><span><i class="dash"></i>뒬롱-프티 3R</span>' });
  const pD = new B.Plot(wD, { yLabel:'C_p/R' });
  const wT = B.plotBox(lay.plots, { title:'원자당 평균 에너지와 온도 (선: $3k_BT$)', aria:'온도에 따른 원자당 평균 에너지',
    legend:'<span><i style="background:var(--s1)"></i>3k_BT</span><span><i class="dot" style="background:var(--s2)"></i>지금 측정</span>' });
  const pT = new B.Plot(wT, { xLabel:'T (K)', yLabel:'meV', onPick:x => ui.set('T', x), current:() => ui.get('T') });
  const L = 4, N = L * L * L, kap = 1, gam = 1, dt = 0.05;
  const idx = (i, j, k) => (i * L + j) * L + k;
  const u = new Float64Array(3 * N), v = new Float64Array(3 * N), f = new Float64Array(3 * N);
  const S = { sKE:0, sPE:0, n:0 };
  const Tt = () => 0.038 * ui.get('T') / 300;
  function forces(){ f.fill(0); let pe = 0;
    for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) for (let k = 0; k < L; k++) {
      const a = idx(i, j, k);
      for (const [di, dj, dk] of [[1,0,0],[0,1,0],[0,0,1]]) {
        const ii = i + di, jj = j + dj, kk = k + dk, inside = ii < L && jj < L && kk < L;
        for (let c = 0; c < 3; c++) { const d = u[3 * a + c] - (inside ? u[3 * idx(ii, jj, kk) + c] : 0); pe += 0.5 * kap * d * d; f[3 * a + c] -= kap * d; if (inside) f[3 * idx(ii, jj, kk) + c] += kap * d; }
      }
      for (const [di, dj, dk] of [[-1,0,0],[0,-1,0],[0,0,-1]]) { if (i + di >= 0 && j + dj >= 0 && k + dk >= 0) continue;
        for (let c = 0; c < 3; c++) { const d = u[3 * a + c]; pe += 0.5 * kap * d * d; f[3 * a + c] -= kap * d; } }
    }
    return pe; }
  let PE = forces();
  function reset(){ S.sKE = S.sPE = 0; S.n = 0; }
  let lastT = Tt();
  /* 조화 격자이므로 x, v를 √(T'/T)배 하면 새 온도의 평형 분포가 된다 */
  ui.on((k) => { if (k === 'T') { const s = Math.sqrt(Tt() / lastT); lastT = Tt(); for (let i = 0; i < 3 * N; i++) { v[i] *= s; u[i] *= s; } PE = forces(); reset(); } draw(); });
  resetB.addEventListener('click', () => { reset(); draw(); });
  function step(dtTot){
    const n = Math.min(12, Math.max(1, Math.round(dtTot / 0.016 * 2))), T = Tt();
    const c1 = Math.exp(-gam * dt), c2 = Math.sqrt((1 - c1 * c1) * T);
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < 3 * N; i++) { v[i] += 0.5 * dt * f[i]; u[i] += 0.5 * dt * v[i]; v[i] = c1 * v[i] + c2 * g(); u[i] += 0.5 * dt * v[i]; }
      PE = forces(); let KE = 0;
      for (let i = 0; i < 3 * N; i++) { v[i] += 0.5 * dt * f[i]; KE += 0.5 * v[i] * v[i]; }
      S.sKE += KE; S.sPE += PE; S.n++;
    }
  }
  const DATA = [['Al',24.35],['Cu',24.44],['Fe',25.10],['Zn',25.40],['Au',25.42],['Ag',25.53],['Pb',26.44]];
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const sp = Math.min(W, H * 1.25) / 7.2, ox = W / 2 - sp * 0.9, oy = H / 2 + sp * 1.9, amp = 1.6;
    const P = (i, j, k, a) => { const x = i - 1.5 + (a ? u[3 * a.i] * amp : 0), y = j - 1.5 + (a ? u[3 * a.i + 1] * amp : 0), z = k - 1.5 + (a ? u[3 * a.i + 2] * amp : 0);
      return [ox + sp * (x + 0.5 * z), oy - sp * (y + 0.38 * z) - sp * 1.5]; };
    const focus = ui.get('focus'), ctr = idx(1, 1, 1), nb = new Set([idx(0,1,1), idx(2,1,1), idx(1,0,1), idx(1,2,1), idx(1,1,0), idx(1,1,2)]);
    const pos = []; for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) for (let k = 0; k < L; k++) { const a = idx(i, j, k); pos[a] = P(i, j, k, { i:a }); }
    ctx.lineWidth = 1.2;
    for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) for (let k = 0; k < L; k++) {
      const a = idx(i, j, k);
      for (const [di, dj, dk] of [[1,0,0],[0,1,0],[0,0,1]]) { const ii = i + di, jj = j + dj, kk = k + dk; if (ii >= L || jj >= L || kk >= L) continue;
        const b = idx(ii, jj, kk), hi = focus && (a === ctr || b === ctr);
        ctx.strokeStyle = hi ? css('--s2') : css('--line'); ctx.globalAlpha = focus && !hi ? 0.35 : 1;
        ctx.beginPath(); ctx.moveTo(pos[a][0], pos[a][1]); ctx.lineTo(pos[b][0], pos[b][1]); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    const order = [...Array(N).keys()].sort((a, b) => (a % L) - (b % L) || 0).reverse();
    for (const a of order) { const k = a % L; const r = sp * (0.17 + 0.03 * (3 - k) / 3);
      let col = css('--s1'), al = 0.55 + 0.45 * (3 - k) / 3;
      if (focus) { if (a === ctr) { col = css('--bad'); al = 1; } else if (nb.has(a)) { col = css('--s1'); al = 1; } else al = 0.18; }
      ctx.globalAlpha = al; ball(ctx, pos[a][0], pos[a][1], r, col); }
    ctx.globalAlpha = 1;
    const T = Tt(), ke = S.n ? S.sKE / S.n / (N * T) : NaN, pe = S.n ? S.sPE / S.n / (N * T) : NaN;
    tile('ke', fmt(ke, 3)); tile('pe', fmt(pe, 3)); tile('E', fmt(ke + pe, 3));
    tile('C', S.n ? `${fmt((ke + pe) * R, 4)} J K⁻¹ mol⁻¹` : '—', `뒬롱-프티 3R = ${(3 * R).toFixed(2)}`);
    pD.set({ xMin:0.4, xMax:DATA.length + 0.6, yMin:2.6, yMax:3.4, xTicks:DATA.map((d, i) => i + 1), xFmt:x => (DATA[Math.round(x) - 1] || [''])[0], yTicks:[2.8, 3, 3.2],
      refs:[{ y:3, lab:'3R' }], series:[{ xs:DATA.map((d, i) => i + 1), ys:DATA.map(d => d[1] / R), pts:true, r:5, color:'--s2' }],
      tip:x => { const d = DATA[Math.round(x) - 1]; return d ? `${d[0]}: ${d[1]} J K⁻¹ mol⁻¹ = ${(d[1] / R).toFixed(3)} R` : null; } });
    const Ts = linspace(50, 1000, 50);
    pT.set({ xMin:50, xMax:1000, yMin:0, yMax:3 * kB_meV * 1000 * 1.12, series:[{ xs:Ts, ys:Ts.map(t => 3 * kB_meV * t), color:'--s1' }],
      markers: S.n ? [{ x:ui.get('T'), y:(ke + pe) * kB_meV * ui.get('T'), color:'--s2' }] : [],
      tip:x => `T = ${x.toFixed(0)} K   3k_BT = ${(3 * kB_meV * x).toFixed(1)} meV` });
  }
  { const s = Math.sqrt(Tt()); for (let i = 0; i < 3 * N; i++) { v[i] = s * g(); u[i] = s * 0.4 * g(); } PE = forces(); }
  const anim = B.animate(fig, dt => { step(dt); draw(); });
  anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.solid = { fig, play:anim.play, set(p){ if (p.T) ui.set('T', p.T); reset(); draw(); },
    read(key){ if (!S.n || key !== 'Cmol') return null; const T = Tt(); return `${fmt((S.sKE + S.sPE) / S.n / (N * T) * R, 4)} J K⁻¹ mol⁻¹ (${S.n} 단계 평균)`; } };
}

/* =====================================================================
 * ladder — 19.3 가정 1: 조화 진동자의 양자화된 준위 E_n = (n+½)ħω
 *   공 하나가 메트로폴리스 규칙으로 준위 사이를 오르내린다 → 볼츠만 분포.
 * ===================================================================== */
function simLadder(){
  const fig = document.getElementById('sim-ladder'); if (!fig) return;
  const lay = layout(fig, { stageH:320, aria:'양자화된 에너지 준위 사다리와 그 위를 오르내리는 공' });
  const ui = B.controls(lay.side, [ { key:'t', label:'$k_BT/\\hbar\\omega$', min:0.05, max:20, value:1, log:true, fmt:v => fmtP(v, 3) } ]);
  const [runB, resetB] = buttons(lay.side, [['■ 멈춤', 'primary'], ['횟수 다시 세기']]);
  note(lay.side, '공은 한 번에 한 칸씩 오르내릴 수 있고, 오를 때는 확률 $e^{-\\hbar\\omega/k_BT}$로만 성공한다.');
  const tile = B.tiles(lay.tiles, [ { key:'r', label:'열에너지 비 $\\dfrac{\\langle E\\rangle-\\frac12\\hbar\\omega}{k_BT}$ (정확)' }, { key:'n', label:'평균 준위 $\\langle n\\rangle$ 정확 / 공의 기록' },
    { key:'p0', label:'바닥 상태 확률 $1-e^{-\\hbar\\omega/k_BT}$' }, { key:'c', label:'열용량 $C/k_B$' } ]);
  const wU = B.plotBox(lay.plots, { title:'평균 에너지 $\\langle E\\rangle/\\hbar\\omega$ (실선: 양자, 점선: 고전 $k_BT$)', aria:'온도에 따른 평균 에너지',
    legend:'<span><i style="background:var(--s1)"></i>양자 ⟨E⟩</span><span><i style="background:var(--s3)"></i>⟨E⟩−½ħω</span><span><i class="dash"></i>고전 k_BT</span>' });
  const pU = new B.Plot(wU, { xLabel:'k_BT/ħω', onPick:x => ui.set('t', x), current:() => ui.get('t') });
  const wC = B.plotBox(lay.plots, { title:'열용량 $C/k_B$ (점선: 등분배 값 1)', aria:'온도에 따른 열용량' });
  const pC = new B.Plot(wC, { xLabel:'k_BT/ħω', xLog:true, onPick:x => ui.set('t', x), current:() => ui.get('t') });
  const S = { n:0, y:0, cnt:[], tot:0, sn:0 };
  function reset(){ S.cnt = []; S.tot = 0; S.sn = 0; }
  ui.on(() => { reset(); draw(); }); resetB.addEventListener('click', () => { reset(); draw(); });
  const U = t => 0.5 + 1 / (Math.exp(1 / t) - 1);
  const Cv = t => { const x = 1 / t; if (x > 700) return 0; const e = Math.exp(x); return x * x * e / ((e - 1) * (e - 1)); };
  let acc = 0;
  function step(dt){
    const x = 1 / ui.get('t'); acc += dt * 40;
    while (acc >= 1) { acc -= 1;
      const up = Math.random() < 0.5; if (up) { if (Math.random() < Math.exp(-x)) S.n++; } else if (S.n > 0) S.n--;
      S.cnt[S.n] = (S.cnt[S.n] || 0) + 1; S.tot++; S.sn += S.n; }
    S.y += (S.n - S.y) * Math.min(1, dt * 10);
  }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const t = ui.get('t'), x = 1 / t, Emax = Math.max(5, 4.5 * t + 1), top = 26, base = H - 22, sc = (base - top) / Emax;
    const nmax = Math.floor(Emax - 0.5), lx = 46, lw = Math.min(150, W * 0.28), px0 = lx + lw + 14, pw = Math.min(170, W * 0.25);
    ctx.strokeStyle = css('--text-2'); ctx.lineWidth = nmax > 40 ? 0.6 : 1.4;
    ctx.fillStyle = css('--muted'); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const step = Math.max(1, Math.ceil(nmax / 12));
    for (let n = 0; n <= nmax; n++) { const y = base - (n + 0.5) * sc; ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + lw, y); ctx.stroke();
      if (n % step === 0) ctx.fillText(`n=${n}`, lx - 6, y); }
    ctx.beginPath(); ctx.strokeStyle = css('--line'); ctx.moveTo(lx, base); ctx.lineTo(lx + lw, base); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = css('--muted'); ctx.fillText('E=0', lx + lw + 4, base);
    const Z = 1 / (1 - Math.exp(-x));
    for (let n = 0; n <= nmax; n++) { const p = Math.exp(-n * x) / Z, y = base - (n + 0.5) * sc, bh = Math.max(1.5, Math.min(sc * 0.7, 10));
      ctx.fillStyle = css('--s1'); ctx.globalAlpha = .55; ctx.fillRect(px0, y - bh / 2, p * pw, bh); ctx.globalAlpha = 1;
      if (S.tot) { const q = (S.cnt[n] || 0) / S.tot; if (q > 0) { ctx.fillStyle = css('--s2'); ctx.beginPath(); ctx.arc(px0 + q * pw, y, 3, 0, 7); ctx.fill(); } } }
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('막대: 볼츠만 확률 · 점: 공의 기록', 6, 4);
    const yb = base - (S.y + 0.5) * sc; ball(ctx, lx + lw * 0.5, yb - 7, 7, css('--s2'));
    const cx0 = px0 + pw + 16;
    if (cx0 + 40 < W) { const grd = ctx.createLinearGradient(0, base, 0, top); const c1 = css('--s4');
      for (let i = 0; i <= 10; i++) { const E = Emax * i / 10; grd.addColorStop(i / 10, rgba(c1, Math.exp(-E / t))); }
      ctx.fillStyle = grd; ctx.fillRect(cx0, top, 26, base - top);
      ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('고전: 연속', cx0 - 4, base + 4); }
    const yU = base - U(t) * sc, yC = base - t * sc;
    ctx.setLineDash([]); ctx.strokeStyle = css('--s1'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx - 4, yU); ctx.lineTo(lx + lw + 4, yU); ctx.stroke();
    ctx.setLineDash([5, 4]); ctx.strokeStyle = css('--muted'); ctx.beginPath(); ctx.moveTo(lx - 4, yC); ctx.lineTo(lx + lw + 4, yC); ctx.stroke(); ctx.setLineDash([]);
    if (yU > top) { ctx.fillStyle = css('--s1'); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('양자 ⟨E⟩', lx + lw, yU - 2); }
    if (yC > top) { ctx.fillStyle = css('--muted'); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('고전 k_BT', lx + 2, yC + 2); }
    const r = x > 700 ? 0 : x / (Math.exp(x) - 1);
    tile('r', fmt(r, 4)); tile('n', `${fmt(1 / (Math.exp(x) - 1), 3)} / ${S.tot ? fmtP(S.sn / S.tot, 3) : '—'}`); tile('p0', fmt(1 - Math.exp(-x), 4)); tile('c', fmt(Cv(t), 4));
    const ts = linspace(0.02, 3, 150);
    pU.set({ xMin:0, xMax:3, yMin:0, yMax:3.6, series:[{ xs:ts, ys:ts.map(U), color:'--s1' }, { xs:ts, ys:ts.map(s => U(s) - 0.5), color:'--s3' }],
      refs:[{ fn:s => s, lab:'k_BT' }, { y:0.5, lab:'½ħω (영점)' }], markers:[{ x:Math.min(3, t), y:U(Math.min(3, t)), color:'--s2' }],
      tip:s => `k_BT/ħω=${s.toFixed(2)}  양자 ${U(s).toFixed(3)}  고전 ${s.toFixed(3)}` });
    const tl = logspace(0.05, 20, 160);
    pC.set({ xMin:0.05, xMax:20, xLog:true, yMin:0, yMax:1.15, yTicks:[0, 0.5, 1], refs:[{ y:1, lab:'등분배' }],
      series:[{ xs:tl, ys:tl.map(Cv), color:'--s1' }], markers:[{ x:t, y:Cv(t), color:'--s2' }],
      tip:s => `k_BT/ħω=${fmtP(s, 3)}  C/k_B=${Cv(s).toFixed(4)}` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); });
  anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.ladder = { fig, play:anim.play, set(p){ if (p.t) ui.set('t', p.t, true); reset(); draw(); },
    read(key){ const x = 1 / ui.get('t'); if (key === 'ratio') return `${fmt(x / (Math.exp(x) - 1), 4)} (그래프의 정확한 곡선 값, k_BT/ħω = ${fmtP(ui.get('t'), 3)})`; return null; } };
}

/* =====================================================================
 * well — 그림 19.7: 제곱 꼴이 아닌 퍼텐셜 우물
 *   V(x) 세 가지: 조화 x², 그림 19.7 꼴 x²−x³+0.27x⁴ (오른쪽에 어깨), 4차 x⁴ (교재 각주 4)
 *   정확한 평균은 수치 적분, 움직이는 공은 랑주뱅 동역학.
 * ===================================================================== */
const POTS = {
  harm: { lab:'조화 $x^2$', V:x => x * x, dV:x => 2 * x, k2:2 },
  fig7: { lab:'그림 19.7 꼴', V:x => x * x - x * x * x + 0.27 * x ** 4, dV:x => 2 * x - 3 * x * x + 1.08 * x ** 3, k2:2 },
  quart:{ lab:'4차 $x^4$', V:x => x ** 4, dV:x => 4 * x ** 3, k2:0 } };
function thermal(V, T){
  const a = -3, b = 4.5, n = 6000, h = (b - a) / n; let Z = 0, sV = 0, sx = 0, sx2 = 0;
  for (let i = 0; i <= n; i++) { const x = a + i * h, v = V(x), w = Math.exp(-v / T) * (i === 0 || i === n ? 0.5 : 1); Z += w; sV += w * v; sx += w * x; sx2 += w * x * x; }
  return { V:sV / Z, x:sx / Z, x2:sx2 / Z };
}
function simWell(){
  const fig = document.getElementById('sim-well'); if (!fig) return;
  const lay = layout(fig, { stageH:300, aria:'퍼텐셜 우물 속에서 열적으로 흔들리는 공' });
  const ui = B.controls(lay.side, [
    { key:'pot', label:'퍼텐셜 모양', type:'seg', options:Object.entries(POTS).map(([k, p]) => [k, p.lab]), value:'fig7' },
    { key:'T', label:'$k_BT$ (단위 $\\varepsilon$)', min:0.005, max:1, value:0.05, log:true, fmt:v => fmtP(v, 3) } ]);
  const [runB, resetB] = buttons(lay.side, [['■ 멈춤', 'primary'], ['평균 다시 모으기']]);
  note(lay.side, '길이 단위 $a$, 에너지 단위 $\\varepsilon$. 점선은 바닥에서의 제곱 근사 $\\tfrac12V\'\'(0)x^2$ (식 19.27).');
  const tile = B.tiles(lay.tiles, [ { key:'v', label:'$\\langle V-V_{\\min}\\rangle/k_BT$ 정확' }, { key:'vm', label:'같은 값, 공의 시간 평균' },
    { key:'x', label:'평균 위치 $\\langle x\\rangle$' }, { key:'x2', label:'$\\langle x^2\\rangle$ 정확 / 조화 근사 $k_BT/V\'\'(0)$' } ]);
  const wV = B.plotBox(lay.plots, { title:'$\\langle V-V_{\\min}\\rangle/k_BT$와 온도', aria:'온도에 따른 평균 퍼텐셜 에너지 비',
    legend:'<span><i style="background:var(--s1)"></i>지금 고른 우물</span><span><i style="background:var(--muted);opacity:.6"></i>다른 우물</span><span><i class="dot" style="background:var(--s2)"></i>공의 시간 평균</span>' });
  const pV = new B.Plot(wV, { xLabel:'k_BT/ε', xLog:true, onPick:x => ui.set('T', x), current:() => ui.get('T') });
  const S = { x:0, v:0, sV:0, n:0, trail:[] };
  const curves = {}; const Ts = logspace(0.005, 1, 60);
  for (const k of Object.keys(POTS)) curves[k] = Ts.map(T => thermal(POTS[k].V, T).V / T);
  let th = thermal(POTS.fig7.V, 0.05);
  function reset(){ S.sV = 0; S.n = 0; S.skip = 300; th = thermal(POTS[ui.get('pot')].V, ui.get('T')); }
  ui.on(() => { reset(); draw(); }); resetB.addEventListener('click', () => { reset(); draw(); });
  function step(dtTot){
    const p = POTS[ui.get('pot')], T = ui.get('T'), dt = 0.004, gam = 2, n = Math.min(80, Math.ceil(dtTot * 1.2 / dt));
    const c1 = Math.exp(-gam * dt), c2 = Math.sqrt((1 - c1 * c1) * T);
    for (let i = 0; i < n; i++) { S.v += -0.5 * dt * p.dV(S.x); S.x += 0.5 * dt * S.v; S.v = c1 * S.v + c2 * g(); S.x += 0.5 * dt * S.v; S.v += -0.5 * dt * p.dV(S.x);
      if (S.skip > 0) { S.skip--; continue; } S.sV += p.V(S.x); S.n++; }
    S.trail.push(S.x); if (S.trail.length > 90) S.trail.shift();
  }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const p = POTS[ui.get('pot')], T = ui.get('T');
    const xa = -1.4, xb = 2.4, ya = -0.05, yb = 1.0, l = 34, r = W - 12, t = 14, b = H - 28;
    const X = x => l + (x - xa) / (xb - xa) * (r - l), Y = y => b - (y - ya) / (yb - ya) * (b - t);
    ctx.strokeStyle = css('--line'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l, Y(0)); ctx.lineTo(r, Y(0)); ctx.moveTo(X(0), t); ctx.lineTo(X(0), b); ctx.stroke();
    ctx.fillStyle = css('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('x₀ = 0', X(0), b + 4); ctx.fillText('x (단위 a)', r - 30, b + 4);
    /* 볼츠만 분포 음영 */
    const xs = linspace(xa, xb, 300), Z = xs.reduce((s, x) => s + Math.exp(-p.V(x) / T), 0) * (xb - xa) / 299;
    const pm = Math.max(...xs.map(x => Math.exp(-p.V(x) / T) / Z));
    ctx.fillStyle = css('--s1'); ctx.globalAlpha = .15; ctx.beginPath(); ctx.moveTo(X(xa), b);
    xs.forEach(x => ctx.lineTo(X(x), b - Math.exp(-p.V(x) / T) / Z / pm * (b - t) * 0.45)); ctx.lineTo(X(xb), b); ctx.fill(); ctx.globalAlpha = 1;
    /* 퍼텐셜과 제곱 근사 */
    ctx.strokeStyle = css('--text'); ctx.lineWidth = 2; ctx.beginPath(); let st = false;
    xs.forEach(x => { const y = p.V(x); if (y > yb + 0.3) { st = false; return; } st ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); st = true; }); ctx.stroke();
    if (p.k2) { ctx.setLineDash([5, 4]); ctx.strokeStyle = css('--s3'); ctx.lineWidth = 1.5; ctx.beginPath(); st = false;
      xs.forEach(x => { const y = 0.5 * p.k2 * x * x; if (y > yb + 0.3) { st = false; return; } st ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); st = true; }); ctx.stroke(); ctx.setLineDash([]); }
    /* k_BT 높이 */
    ctx.setLineDash([2, 3]); ctx.strokeStyle = css('--s2'); ctx.beginPath(); ctx.moveTo(l, Y(T)); ctx.lineTo(r, Y(T)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css('--s2'); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; if (T < yb) ctx.fillText('k_BT 높이', r, Y(T) - 2);
    /* 공과 자취, 평균 위치 */
    ctx.strokeStyle = css('--s2'); ctx.globalAlpha = .25; ctx.lineWidth = 1; ctx.beginPath();
    S.trail.forEach((x, i) => { const px = X(Math.max(xa, Math.min(xb, x))), py = Y(Math.min(yb, p.V(x))) - 6; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); ctx.globalAlpha = 1;
    const bx = Math.max(xa, Math.min(xb, S.x)); ball(ctx, X(bx), Y(Math.min(yb, p.V(bx))) - 7, 7, css('--s2'));
    ctx.strokeStyle = css('--s4'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(th.x), b); ctx.lineTo(X(th.x), b - 14); ctx.stroke();
    ctx.fillStyle = css('--s4'); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('⟨x⟩', X(th.x) + 3, b - 2);
    tile('v', fmt(th.V / T, 4)); tile('vm', S.n ? fmt(S.sV / S.n / T, 3) : '—', S.n ? `${S.n.toLocaleString('en')} 단계` : '');
    tile('x', fmt(th.x, 3)); tile('x2', `${fmt(th.x2, 3)} / ${p.k2 ? fmtP(T / p.k2, 3) : '근사 불가'}`, p.k2 ? '' : "V''(0) = 0");
    const others = Object.keys(POTS).filter(k => k !== ui.get('pot'));
    pV.set({ xMin:0.005, xMax:1, xLog:true, yMin:0, yMax:0.95, yTicks:[0, 0.25, 0.5, 0.75], refs:[{ y:0.5, lab:'½ (제곱)' }, { y:0.25, lab:'¼ (4차)' }],
      series:others.map(k => ({ xs:Ts, ys:curves[k], color:'--muted', width:1.2, alpha:.6 })).concat([{ xs:Ts, ys:curves[ui.get('pot')], color:'--s1', width:2.4 }]),
      markers: S.n ? [{ x:T, y:S.sV / S.n / T, color:'--s2' }] : [{ x:T, y:th.V / T, color:'--s2' }],
      tip:x => { const v = thermal(p.V, x).V / x; return `k_BT=${fmtP(x, 3)}  ⟨V⟩/k_BT=${v.toFixed(3)}`; } });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); });
  anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.well = { fig, play:anim.play, set(p){ if (p.pot) ui.set('pot', p.pot, true); if (p.T) ui.set('T', p.T, true); reset(); draw(); },
    read(key){ if (key === 'x2') return `${fmt(th.x2, 4)} (정확한 수치 적분)`; return null; } };
}

/* =====================================================================
 * brown — 19.4: 무거운 원판 하나 + 가벼운 원판 여럿 (2차원, 탄성 충돌)
 *   열원 없이 충돌만으로 평형에 이른다. 큰 원판의 평균 운동 에너지가 작은 원판과 같아지는지 본다.
 * ===================================================================== */
function simBrown(){
  const fig = document.getElementById('sim-brown'); if (!fig) return;
  const lay = layout(fig, { stageH:330, aria:'작은 원판들과 충돌하며 불규칙하게 움직이는 큰 원판', note:'큰 원판의 최근 자취를 선으로 남긴다' });
  const ui = B.controls(lay.side, [
    { key:'ratio', label:'질량비 $M/m$', min:1, max:100, value:25, log:true, fmt:v => fmtP(v, 3) },
    { key:'N', label:'작은 원판 수', min:100, max:360, step:20, value:300, fmt:v => String(v) },
    { key:'speed', label:'시간 빠르기', type:'seg', options:[[1,'×1'],[4,'×4']], value:1 } ]);
  const [runB, resetB] = buttons(lay.side, [['■ 멈춤', 'primary'], ['처음부터']]);
  note(lay.side, '열원은 없다. 처음에 큰 원판 4개는 멈춰 있고, 작은 원판들만 움직인다. 평균은 큰 원판 4개에 대해 낸다. 질량비나 원판 수를 바꾸면 처음부터 다시 시작한다.');
  const tile = B.tiles(lay.tiles, [ { key:'k', label:'$\\langle\\tfrac12MV^2\\rangle\\,/\\,\\langle\\tfrac12mv^2\\rangle$ (예측 1)' }, { key:'v', label:'속력 비 $V_{\\rm rms}/v_{\\rm rms}$ 측정 / $\\sqrt{m/M}$' },
    { key:'t', label:'모은 시간' }, { key:'hit', label:'큰 원판들이 받은 충돌 수' } ]);
  const wR = B.plotBox(lay.plots, { title:'속력 비와 질량비 (선: $\\sqrt{m/M}$)', aria:'질량비에 따른 속력 비',
    legend:'<span><i style="background:var(--s1)"></i>(M/m)^−½</span><span><i class="dot" style="background:var(--s2)"></i>지금 측정</span>' });
  const pR = new B.Plot(wR, { xLabel:'M/m', xLog:true, yLog:true, onPick:x => ui.set('ratio', x), current:() => ui.get('ratio') });
  const wK = B.plotBox(lay.plots, { title:'누적 평균 운동 에너지 비 (점선: 1)', aria:'시간에 따른 운동 에너지 비' });
  const pK = new B.Plot(wK, { xLabel:'모은 시간 (s)' });
  const AR = 1.6, rs = 0.012, RB = 0.07, m = 1, T0 = 0.08, NB = 4, WARM = 4;
  let P, S;
  function init(){
    const N = ui.get('N'); P = [];
    for (let b = 0; b < NB; b++) P.push({ x:AR * (b + 0.5) / NB, y:b % 2 ? 0.3 : 0.7, vx:0, vy:0, r:RB, m:m * ui.get('ratio') });
    let tries = 0;
    while (P.length < N + NB && tries < 30000) { tries++;
      const x = rs + Math.random() * (AR - 2 * rs), y = rs + Math.random() * (1 - 2 * rs);
      if (P.some(q => (q.x - x) ** 2 + (q.y - y) ** 2 < (q.r + rs + 0.002) ** 2)) continue;
      const s = Math.sqrt(T0 / m); P.push({ x, y, vx:s * g(), vy:s * g(), r:rs, m }); }
    S = { t:0, sBig:0, sSmall:0, n:0, hits:0, trail:[], hist:[] };
  }
  init();
  ui.on(k => { if (k !== 'speed') { init(); draw(); } }); resetB.addEventListener('click', () => { init(); draw(); });
  const cell = 0.03;
  function collide(a, b){
    const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, rr = a.r + b.r; if (d2 >= rr * rr || d2 === 0) return false;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    const ov = rr - d, ia = 1 / a.m, ib = 1 / b.m; a.x -= nx * ov * ia / (ia + ib); a.y -= ny * ov * ia / (ia + ib); b.x += nx * ov * ib / (ia + ib); b.y += ny * ov * ib / (ia + ib);
    if (rel >= 0) return false;
    const J = 2 * rel / (ia + ib); a.vx += J * ia * nx; a.vy += J * ia * ny; b.vx -= J * ib * nx; b.vy -= J * ib * ny; return true;
  }
  function step(dtTot){
    const dt = 1 / 600, n = Math.min(80, Math.round(dtTot / dt));
    for (let s = 0; s < n; s++) {
      for (const p of P) { p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx); } if (p.x > AR - p.r) { p.x = AR - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy); } if (p.y > 1 - p.r) { p.y = 1 - p.r; p.vy = -Math.abs(p.vy); } }
      const grid = new Map();
      for (let i = NB; i < P.length; i++) { const p = P[i], key = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell); (grid.get(key) || grid.set(key, []).get(key)).push(i); }
      for (let i = NB; i < P.length; i++) { const p = P[i], cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const l = grid.get((cx + ox) + ',' + (cy + oy)); if (!l) continue; for (const j of l) if (j > i) collide(p, P[j]); } }
      for (let b = 0; b < NB; b++) { for (let i = NB; i < P.length; i++) if (collide(P[b], P[i])) S.hits++; for (let c = b + 1; c < NB; c++) collide(P[b], P[c]); }
      let ks = 0, kb = 0; for (let i = NB; i < P.length; i++) ks += 0.5 * P[i].m * (P[i].vx ** 2 + P[i].vy ** 2);
      for (let b = 0; b < NB; b++) kb += 0.5 * P[b].m * (P[b].vx ** 2 + P[b].vy ** 2);
      S.t += dt; if (S.t < WARM) continue;   /* 큰 원판이 멈춘 채 시작하므로 처음 몇 초는 평균에서 뺀다 */
      S.sBig += kb / NB; S.sSmall += ks / (P.length - NB); S.n++;
    }
    S.trail.push([P[0].x, P[0].y]); if (S.trail.length > 700) S.trail.shift();
    if (S.n && (!S.hist.length || S.t - WARM - S.hist[S.hist.length - 1][0] > 0.2)) S.hist.push([S.t - WARM, S.sBig / S.sSmall]);
  }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const sc = Math.min((W - 8) / AR, H - 8), ox = (W - AR * sc) / 2, oy = (H - sc) / 2;
    ctx.strokeStyle = css('--line'); ctx.strokeRect(ox, oy, AR * sc, sc);
    ctx.fillStyle = css('--s1'); ctx.globalAlpha = .6;
    for (let i = NB; i < P.length; i++) { ctx.beginPath(); ctx.arc(ox + P[i].x * sc, oy + P[i].y * sc, Math.max(1.5, rs * sc), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = css('--s2'); ctx.lineWidth = 1.4; ctx.beginPath(); S.trail.forEach(([x, y], i) => i ? ctx.lineTo(ox + x * sc, oy + y * sc) : ctx.moveTo(ox + x * sc, oy + y * sc)); ctx.stroke();
    for (let b = NB - 1; b >= 0; b--) { ctx.globalAlpha = b ? 0.55 : 1; ball(ctx, ox + P[b].x * sc, oy + P[b].y * sc, RB * sc, css('--s2')); } ctx.globalAlpha = 1;
    const k = S.n ? S.sBig / S.sSmall : NaN, vr = Math.sqrt(k / ui.get('ratio'));
    tile('k', fmt(k, 3)); tile('v', `${fmt(vr, 3)} / ${fmtP(1 / Math.sqrt(ui.get('ratio')), 3)}`); tile('t', S.t < WARM ? `준비 중 (${fmt(WARM - S.t, 2)} s)` : `${fmt(S.t - WARM, 3)} s`, `처음 ${WARM} s는 평균에서 뺌`); tile('hit', S.hits.toLocaleString('en'));
    const rr = logspace(1, 100, 50);
    pR.set({ xMin:1, xMax:100, xLog:true, yLog:true, yMin:0.07, yMax:1.5, xTicks:[1, 2, 5, 10, 20, 50, 100], yTicks:[0.1, 0.2, 0.5, 1],
      series:[{ xs:rr, ys:rr.map(r => 1 / Math.sqrt(r)), color:'--s1' }], markers: S.n && vr > 0 ? [{ x:ui.get('ratio'), y:vr, color:'--s2' }] : [],
      tip:x => `M/m=${fmtP(x, 3)}  (m/M)^½=${(1 / Math.sqrt(x)).toFixed(3)}` });
    pK.set({ xMin:0, xMax:Math.max(5, S.t - WARM), yMin:0, yMax:2, yTicks:[0, 0.5, 1, 1.5, 2], refs:[{ y:1, lab:'1' }],
      series:[{ xs:S.hist.map(h => h[0]), ys:S.hist.map(h => h[1]), color:'--s2' }] });
  }
  const anim = B.animate(fig, dt => { step(dt * ui.get('speed')); draw(); });
  anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.brown = { fig, play:anim.play, set(p){ if (p.ratio) ui.set('ratio', p.ratio, true); ui.set('speed', 4, true); init(); draw(); },
    read(key){ if (!S.n || key !== 'vratio') return null; return `${fmt(Math.sqrt(S.sBig / S.sSmall / ui.get('ratio')), 3)} (모은 시간 ${fmt(S.t - WARM, 2)} s)`; } };
}

B.ready(() => { chartCp(); simSpring(); simModes(); simGas(); simDiatomic(); simSolid(); simLadder(); simWell(); simBrown(); });
})();
