/* =====================================================================
 * sim26.js — 26장 실제 기체
 *   vdw       그림 26.1·26.2·26.5·26.6  반데르발스 등온선, 막스웰 작도, 피스톤 압축, p–T 상도표   26.1
 *   gibbs     그림 26.3·26.4  깁스 함수 지형과 준안정 (구르는 공)                              26.1
 *   dieterici 그림 26.7 · 표 26.1  벽 근처의 볼츠만 인자, 두 모형의 등온선과 p_cV_c/RT_c        26.2
 *   mayer     그림 26.8·26.9·26.10  분자 쌍의 퍼텐셜과 메이어 함수, B(T)                       26.3
 *   ljgas     26.3  레너드-존스 분자 기체(2차원)에서 압축인자 Z 재기                              26.3
 *   coexist   그림 26.11  액체-기체 공존 곡선: 모형과 경험식                                    26.4
 *   collapse  26.4  세 기체의 B(T)가 환산 좌표에서 한 곡선이 되는 것                            26.4
 * 환산 변수: p̃ = p/p_c, Ṽ = V/V_c, T̃ = T/T_c (식 26.61)
 * ===================================================================== */
(function(){
'use strict';
const B = window.Book, K = B.kit, g = B.gauss, fmt = B.fmt, fmtP = B.fmtPlain, css = B.cssv;
const lin = K.linspace, logs = K.logspace;

/* ---------- 상태방정식 (환산 변수) ---------- */
const EOS = {
  vdw: { name:'반데르발스', Vmin:1 / 3,
    p:(V, T) => 8 * T / (3 * V - 1) - 3 / (V * V),
    dp:(V, T) => -24 * T / (3 * V - 1) ** 2 + 6 / V ** 3,
    I(a, b, T){ return (8 * T / 3) * Math.log((3 * b - 1) / (3 * a - 1)) + 3 / b - 3 / a; },
    spin(T){ if (T >= 1) return null; const f = V => this.dp(V, T); return [K.bisect(f, 1 / 3 + 1e-9, 1), K.bisect(f, 1, 60)]; } },
  die: { name:'디테리치', Vmin:0.5,
    p:(V, T) => T / (2 * V - 1) * Math.exp(2 - 2 / (T * V)),
    dp(V, T){ return this.p(V, T) * (-2 / (2 * V - 1) + 2 / (T * V * V)); },
    I(a, b, T){ const la = Math.log(a), lb = Math.log(b); return K.simpson(u => { const V = Math.exp(u); return this.p(V, T) * V; }, la, lb, 800); },
    spin(T){ if (T >= 1) return null; const r = Math.sqrt(1 - T); return [(1 - r) / T, (1 + r) / T]; } }
};
function maxwell(E, T){
  const sp = E.spin(T); if (!sp) return null;
  const [s1, s2] = sp, pLo = Math.max(E.p(s1, T), 1e-14), pHi = E.p(s2, T);
  if (!(pHi > pLo)) return null;
  const roots = P => { const Vl = K.bisect(V => E.p(V, T) - P, E.Vmin + 1e-12, s1);
    let hi = s2 * 2; while (E.p(hi, T) > P && hi < 1e12) hi *= 2;
    return [Vl, K.bisect(V => E.p(V, T) - P, s2, hi)]; };
  const area = P => { const [a, b] = roots(P); return E.I(a, b, T) - P * (b - a); };
  const Pv = K.bisect(area, pLo * (1 + 1e-9), pHi * (1 - 1e-9), 70);
  const [Vl, Vg] = roots(Pv);
  return { Pv, Vl, Vg, s1, s2, pX:E.p(s1, T), pY:pHi, Vm:K.bisect(V => E.p(V, T) - Pv, s1, s2) };
}
const COEX = {}, CACHE = {};
function coex(key){ if (COEX[key]) return COEX[key];
  const E = EOS[key], Ts = key === 'vdw' ? lin(0.25, 0.999, 70) : lin(0.45, 0.999, 60), out = [];
  for (const T of Ts) { const m = maxwell(E, T); if (m && isFinite(m.Pv)) out.push({ T, ...m }); }
  out.push({ T:1, Pv:1, Vl:1, Vg:1 }); return (COEX[key] = out); }
function mw(key, T){ const k = key + ':' + T.toFixed(4); if (!(k in CACHE)) CACHE[k] = maxwell(EOS[key], T); return CACHE[k]; }
/* 그림에서 쓸 깔끔한 진동 (기체 입자) */
function bounce(a, x0, y0, x1, y1){ if (a.x < x0) { a.x = 2 * x0 - a.x; a.vx = Math.abs(a.vx); } if (a.x > x1) { a.x = 2 * x1 - a.x; a.vx = -Math.abs(a.vx); }
  if (a.y < y0) { a.y = 2 * y0 - a.y; a.vy = Math.abs(a.vy); } if (a.y > y1) { a.y = 2 * y1 - a.y; a.vy = -Math.abs(a.vy); } }

/* =====================================================================
 * vdw — 그림 26.1, 26.2, 26.5, 26.6
 * ===================================================================== */
function simVdw(){
  const fig = document.getElementById('sim-vdw'); if (!fig) return;
  const lay = K.layout(fig, { stageH:300, aria:'피스톤 속 반데르발스 기체를 등온 압축하는 그림', note:'아래 진한 층: 액체 · 위: 기체 (공존 영역에서)' });
  const ui = B.controls(lay.side, [
    { key:'T', label:'온도 $\\tilde T=T/T_c$', min:0.6, max:1.4, step:0.005, value:0.9, fmt:v => v.toFixed(3) },
    { key:'V', label:'부피 $\\tilde V=V/V_c$ (피스톤)', min:0.42, max:10, value:3, log:true, fmt:v => v.toFixed(3) },
    { key:'mx', label:'막스웰 작도 쓰기 (평형 상태)', type:'check', value:true },
    { key:'id', label:'같은 온도의 이상기체 등온선 (그림 26.1)', type:'check', value:false } ]);
  const [runB] = K.buttons(lay.side, [['■ 멈춤', 'primary']]);
  K.note(lay.side, '막스웰 작도를 끄면 반데르발스 식이 주는 압력을 그대로 따른다. 그때 공존 영역 가운데에서는 압축률이 음수가 된다.');
  const tile = B.tiles(lay.tiles, [ { key:'p', label:'압력 $\\tilde p$: 반데르발스 식 / 평형(작도)' }, { key:'st', label:'상태' },
    { key:'k', label:'반데르발스 식의 $(\\partial p/\\partial V)_T$' }, { key:'z', label:'압축인자 $Z=pV/RT$' } ]);
  const wP = B.plotBox(lay.plots, { title:'등온선 $\\tilde p(\\tilde V)$ (그림 26.2, 26.5)', aria:'반데르발스 등온선',
    legend:'<span><i style="background:var(--text)"></i>지금 온도</span><span><i class="dash"></i>공존 경계</span><span><i style="background:var(--s2);opacity:.4"></i>같은 넓이</span><span><i class="dot" style="background:var(--s2)"></i>상태</span>', height:230 });
  const pP = new B.Plot(wP, { xLabel:'Ṽ (로그)', yLabel:'p̃', onPick:x => ui.set('V', x), current:() => ui.get('V') });
  const wT = B.plotBox(lay.plots, { title:'$p$–$T$ 상도표 (그림 26.6)', aria:'반데르발스 기체의 압력-온도 상도표', height:230 });
  const pT = new B.Plot(wT, { xLabel:'T̃', yLabel:'p̃ (로그)', onPick:x => ui.set('T', x), current:() => ui.get('T') });
  const CX = coex('vdw');
  const N = 90, D = []; for (let i = 0; i < N; i++) D.push({ x:Math.random(), y:Math.random(), vx:g() * 0.3, vy:g() * 0.3, ox:Math.random(), oy:Math.random() });
  function state(){
    const T = ui.get('T'), V = ui.get('V'), raw = EOS.vdw.p(V, T), m = T < 1 ? mw('vdw', T) : null;
    let pe = raw, xl = 0, ph = T >= 1 ? '초임계 유체' : (V < 1 ? '액체' : '기체');
    if (m && ui.get('mx')) { if (V > m.Vl && V < m.Vg) { pe = m.Pv; xl = (m.Vg - V) / (m.Vg - m.Vl); ph = `공존: 액체 ${(xl * 100).toFixed(0)}% (몰 비)`; }
      else ph = V <= m.Vl ? '액체' : '기체'; }
    else if (m && V > m.Vl && V < m.Vg) ph = (EOS.vdw.dp(V, T) > 0 ? '불안정 (압축률 < 0)' : '준안정') + ' — 작도 없음';
    return { T, V, raw, pe, xl, ph, m };
  }
  function step(dt){ const s = state(), sp = s.T >= 1 ? 0.5 : 0.45;
    for (const d of D) { d.x += d.vx * dt * sp * 2; d.y += d.vy * dt * sp * 2; bounce(d, 0, 0, 1, 1); if (Math.random() < 0.5 * dt) { d.vx = g() * 0.3; d.vy = g() * 0.3; } } }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const s = state(), cw = Math.min(W * 0.5, 240), cx = (W - cw) / 2, bot = H - 30, hmax = H - 52;
    const f = Math.log(s.V / 0.42) / Math.log(10 / 0.42), h = 30 + f * (hmax - 30), top = bot - h;
    ctx.strokeStyle = css('--text-2'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, 10); ctx.lineTo(cx, bot); ctx.lineTo(cx + cw, bot); ctx.lineTo(cx + cw, 10); ctx.stroke();
    ctx.fillStyle = css('--surface-3'); ctx.fillRect(cx + 2, top - 10, cw - 4, 10); ctx.fillRect(cx + cw / 2 - 4, 4, 8, top - 14);
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(`Ṽ = ${s.V.toFixed(2)}`, cx + cw + 8, top - 5);
    const liqFrac = s.xl > 0 ? Math.min(1, s.xl * s.m.Vl / s.V) : (s.ph === '액체' ? 1 : 0);
    const hl = liqFrac * h, nl = s.xl > 0 ? Math.round(s.xl * N) : (s.ph === '액체' ? N : 0);
    if (hl > 0) { ctx.fillStyle = css('--s1'); ctx.globalAlpha = .14; ctx.fillRect(cx + 2, bot - hl, cw - 4, hl); ctx.globalAlpha = 1; }
    D.forEach((d, i) => { let x, y, r = 3;
      if (i < nl) { x = cx + 4 + d.ox * (cw - 8) + 1.5 * Math.sin(performance.now() / 120 + i); y = bot - 3 - d.oy * Math.max(2, hl - 6); }
      else { const gh = h - hl; x = cx + 4 + d.x * (cw - 8); y = top + 3 + d.y * Math.max(2, gh - 6); }
      K.ball(ctx, x, y, r, i < nl ? css('--s1') : (s.T >= 1 ? css('--s4') : css('--s2'))); });
    const Z = s.pe * s.V / (8 * s.T / 3);
    tile('p', `${fmt(s.raw, 3)} / ${fmt(s.pe, 3)}`); tile('st', s.ph); tile('k', fmt(EOS.vdw.dp(s.V, s.T), 3), EOS.vdw.dp(s.V, s.T) > 0 ? '양수 → 압축률 음수(불안정)' : '음수 → 안정'); tile('z', fmt(Z, 3), '이상기체는 1');
    const Vs = logs(0.42, 10, 260), fam = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3].filter(t => Math.abs(t - s.T) > 0.004);
    const series = fam.map(t => ({ xs:Vs, ys:Vs.map(V => EOS.vdw.p(V, t)), color:'--muted', width:1, alpha:.5 }));
    const bL = CX.filter(c => c.T < 1), dash = { xs:bL.map(c => c.Vl).concat([1], bL.slice().reverse().map(c => c.Vg)), ys:bL.map(c => c.Pv).concat([1], bL.slice().reverse().map(c => c.Pv)), color:'--muted', dash:[5, 4], width:1.4 };
    if (s.m && ui.get('mx')) { const m = s.m;
      const a1 = Vs.filter(V => V >= m.Vl && V <= m.Vm), a2 = Vs.filter(V => V >= m.Vm && V <= m.Vg);
      series.push({ xs:a1, ys:a1.map(V => EOS.vdw.p(V, s.T)), fill:true, base:m.Pv, color:'--s2', alpha:.3 }, { xs:a2, ys:a2.map(V => EOS.vdw.p(V, s.T)), fill:true, base:m.Pv, color:'--s2', alpha:.3 }); }
    series.push(dash);
    if (ui.get('id')) series.push({ xs:Vs, ys:Vs.map(V => 8 * s.T / (3 * V)), color:'--s3', dash:[2, 3], width:1.6 });
    series.push({ xs:Vs, ys:Vs.map(V => EOS.vdw.p(V, s.T)), color:'--text', width:2.4 });
    if (s.m && ui.get('mx')) series.push({ xs:[s.m.Vl, s.m.Vg], ys:[s.m.Pv, s.m.Pv], color:'--s2', width:2 });
    pP.set({ xMin:0.42, xMax:10, xLog:true, yMin:-0.6, yMax:2.4, xTicks:[0.5, 1, 2, 5, 10], yTicks:[0, 0.5, 1, 1.5, 2], series,
      refs:[{ y:0 }], markers:[{ x:s.V, y:s.pe, color:'--s2' }, { x:1, y:1, color:'--text', r:3.5, vline:false }],
      tip:V => `Ṽ = ${V.toFixed(3)}   p̃ = ${EOS.vdw.p(V, s.T).toFixed(3)}` + (ui.get('id') ? `   이상기체 ${(8 * s.T / (3 * V)).toFixed(3)}` : '') });
    pT.set({ xMin:0.25, xMax:1.4, yMin:1e-5, yMax:5, yLog:true, xTicks:[0.4, 0.6, 0.8, 1, 1.2], series:[{ xs:CX.map(c => c.T), ys:CX.map(c => c.Pv), color:'--text', width:2 }],
      labels:[{ x:0.5, y:0.05, text:'액체', color:'--s1' }, { x:0.75, y:2e-4, text:'기체', color:'--s2' }, { x:1.05, y:2, text:'초임계', color:'--s4' }],
      markers:[{ x:1, y:1, color:'--text', r:4, vline:false }, { x:s.T, y:Math.max(1e-5, s.pe), color:'--s2' }],
      tip:T => { if (T >= 1) return `T̃ = ${T.toFixed(3)} (임계온도 위)`; const m = mw('vdw', Math.round(T * 200) / 200); return m ? `T̃ = ${T.toFixed(3)}   공존 압력 p̃ = ${fmtP(m.Pv, 3)}` : null; } });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); ui.on(() => draw()); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.vdw = { fig, play:anim.play, set(p){ if (p.T) ui.set('T', p.T, true); if (p.V) ui.set('V', p.V, true); if (p.mx != null) ui.set('mx', p.mx, true); draw(); },
    read(k){ const s = state(); if (k === 'praw') return `${fmt(s.raw, 4)} (T̃ = ${s.T.toFixed(3)}, Ṽ = ${s.V.toFixed(3)})`; if (k === 'pv') return s.m ? `${fmt(s.m.Pv, 4)} (T̃ = ${s.T.toFixed(3)})` : '임계온도 위'; return null; } };
}

/* =====================================================================
 * gibbs — 그림 26.3, 26.4: 일정 T, p에서 G(V) = −(8T̃/3) ln(3Ṽ−1) − 3/Ṽ + p̃Ṽ  (단위 p_cV_c, 상수 f(T) 생략)
 *   공(계의 상태)은 이 지형에서 약한 요동을 받으며 내리막으로 간다 → 준안정 상태에 머무를 수 있다.
 * ===================================================================== */
function simGibbs(){
  const fig = document.getElementById('sim-gibbs'); if (!fig) return;
  const lay = K.layout(fig, { stageH:280, aria:'압력에 따라 모양이 바뀌는 깁스 함수 지형 위의 공' });
  const ui = B.controls(lay.side, [
    { key:'T', label:'온도 $\\tilde T$', min:0.75, max:1.05, step:0.005, value:0.9, fmt:v => v.toFixed(3) },
    { key:'p', label:'압력 $\\tilde p$', min:0.2, max:1.2, step:0.002, value:0.5, fmt:v => v.toFixed(3) } ]);
  const [runB, sweepB, resetB] = K.buttons(lay.side, [['■ 멈춤', 'primary'], ['▶ 압력 천천히 올렸다 내리기'], ['자취 지우기']]);
  K.note(lay.side, '요동이 작아서 공은 장벽을 거의 넘지 못한다. 그래서 공존 압력을 지나도 한동안 원래 골짜기에 머문다(준안정).');
  const tile = B.tiles(lay.tiles, [ { key:'ph', label:'공이 있는 골짜기' }, { key:'st', label:'안정성' },
    { key:'X', label:'$\\tilde p_X$ (액체 골짜기가 사라짐)' }, { key:'Bp', label:'$\\tilde p_B$ (두 골짜기 높이가 같음)' }, { key:'Y', label:'$\\tilde p_Y$ (기체 골짜기가 사라짐)' } ]);
  const wV = B.plotBox(lay.plots, { title:'부피와 압력 (그림 26.3 위)', aria:'압력에 따른 부피',
    legend:'<span><i style="background:var(--text)"></i>반데르발스</span><span><i class="dot" style="background:var(--s4)"></i>공의 자취</span><span><i class="dash"></i>X, B, Y</span>', height:220 });
  const pV = new B.Plot(wV, { xLabel:'p̃', yLabel:'Ṽ', onPick:x => ui.set('p', x), current:() => ui.get('p') });
  const wG = B.plotBox(lay.plots, { title:'깁스 함수와 압력 (그림 26.3 아래)', aria:'압력에 따른 깁스 함수', height:220 });
  const pG = new B.Plot(wG, { xLabel:'p̃', yLabel:'G', onPick:x => ui.set('p', x), current:() => ui.get('p') });
  const Gf = (V, T, p) => -(8 * T / 3) * Math.log(3 * V - 1) - 3 / V + p * V;
  const S = { s:Math.log(3), trail:[] }; let sweep = 0, sweepDir = 1;
  sweepB.addEventListener('click', () => { sweep = sweep ? 0 : 1; sweepB.textContent = sweep ? '■ 압력 훑기 멈춤' : '▶ 압력 천천히 올렸다 내리기'; if (sweep) { ui.set('p', 0.3, true); S.s = Math.log(4); sweepDir = 1; S.trail = []; } });
  resetB.addEventListener('click', () => { S.trail = []; draw(); });
  ui.on(k => { if (k === 'T') S.trail = []; draw(); });
  function step(dt){
    if (sweep) { let p = ui.get('p') + sweepDir * 0.06 * dt; if (p > 0.9) { p = 0.9; sweepDir = -1; } if (p < 0.3) { p = 0.3; sweepDir = 1; sweep = 0; sweepB.textContent = '▶ 압력 천천히 올렸다 내리기'; } ui.set('p', p, true); }
    const T = ui.get('T'), p = ui.get('p'), mu = 3, th = 0.0015, h = 0.004, n = Math.round(dt / h);
    for (let i = 0; i < n; i++) { const V = Math.exp(S.s), dG = V * (p - EOS.vdw.p(V, T)); S.s += -mu * dG * h + Math.sqrt(2 * mu * th * h) * g(); S.s = Math.max(Math.log(0.36), Math.min(Math.log(12), S.s)); }
    S.trail.push([p, Math.exp(S.s)]); if (S.trail.length > 1500) S.trail.shift();
  }
  function minima(T, p){ const out = []; const vs = logs(0.36, 12, 400); for (let i = 1; i < vs.length - 1; i++) { const a = Gf(vs[i - 1], T, p), b = Gf(vs[i], T, p), c = Gf(vs[i + 1], T, p); if (b < a && b <= c) out.push(vs[i]); } return out; }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const T = ui.get('T'), p = ui.get('p'), sa = Math.log(0.4), sb = Math.log(8), N = 300;
    const ss = lin(sa, sb, N), Gs = ss.map(s => Gf(Math.exp(s), T, p));
    const mins = minima(T, p), Gm = Math.min(...Gs), ref = mins.length ? Math.max(...mins.map(V => Gf(V, T, p))) : Gm;
    const yTop = ref + Math.max(0.25, (ref - Gm) * 2.5), yBot = Gm - 0.05 * (yTop - Gm);
    const l = 30, r = W - 10, t = 22, b = H - 26;
    const X = s => l + (s - sa) / (sb - sa) * (r - l), Y = G => b - (G - yBot) / (yTop - yBot) * (b - t);
    ctx.strokeStyle = css('--text'); ctx.lineWidth = 2; ctx.beginPath(); let st = false;
    ss.forEach((s, i) => { const y = Y(Gs[i]); if (y < t - 40) { st = false; return; } st ? ctx.lineTo(X(s), y) : ctx.moveTo(X(s), y); st = true; }); ctx.stroke();
    ctx.fillStyle = css('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const V of [0.5, 1, 2, 4, 8]) { const x = X(Math.log(V)); ctx.fillText(String(V), x, b + 4); }
    mins.forEach(V => { const x = X(Math.log(V)), y = Y(Gf(V, T, p)), stable = Math.abs(Gf(V, T, p) - Math.min(...mins.map(v => Gf(v, T, p)))) < 1e-9;
      ctx.fillStyle = stable ? css('--good') : css('--warn'); ctx.textBaseline = 'top'; ctx.fillText(`${V < 1 ? '액체' : '기체'} · ${stable ? '안정' : '준안정'}`, x, y + 6); });
    const V = Math.exp(S.s), bx = X(Math.max(sa, Math.min(sb, S.s))), by = Y(Gf(V, T, p));
    K.ball(ctx, bx, Math.max(t, by) - 8, 8, css('--s4'));
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`G(Ṽ), p̃ = ${p.toFixed(3)}, T̃ = ${T.toFixed(3)} · 가로축 부피 Ṽ(로그) · 공 = 계의 상태`, 8, 4);
    const m = T < 1 ? mw('vdw', Math.round(T * 1000) / 1000) : null;
    const curMin = mins.length ? mins.reduce((q, v) => Math.abs(Math.log(v) - S.s) < Math.abs(Math.log(q) - S.s) ? v : q, mins[0]) : V;
    const stable = mins.length < 2 || Math.abs(Gf(curMin, T, p) - Math.min(...mins.map(v => Gf(v, T, p)))) < 1e-9;
    tile('ph', V < 1 ? `액체 쪽 (Ṽ ≈ ${V.toFixed(2)})` : `기체 쪽 (Ṽ ≈ ${V.toFixed(2)})`); tile('st', mins.length < 2 ? '골짜기 하나' : (stable ? '안정' : '준안정'));
    tile('X', m ? fmt(m.pX, 3) : '—'); tile('Bp', m ? fmt(m.Pv, 3) : '임계온도 위'); tile('Y', m ? fmt(m.pY, 3) : '—');
    const Vs = logs(0.42, 6, 400).filter(v => { const q = EOS.vdw.p(v, T); return q > 0.15 && q < 1.25; });
    const refs = m ? [{ x:m.pX, lab:'X' }, { x:m.Pv, lab:'B' }, { x:m.pY, lab:'Y' }] : [];
    pV.set({ xMin:0.2, xMax:1.2, yMin:0, yMax:6, series:[{ xs:Vs.map(v => EOS.vdw.p(v, T)), ys:Vs, color:'--text', width:2 }, { xs:S.trail.map(q => q[0]), ys:S.trail.map(q => q[1]), pts:true, r:1.6, color:'--s4' }],
      refs, markers:[{ x:p, y:V, color:'--s4' }], tip:x => `p̃ = ${x.toFixed(3)}` });
    const Gp = Vs.map(v => Gf(v, T, EOS.vdw.p(v, T))), gmin = Math.min(...Gp), gmax = Math.max(...Gp);
    pG.set({ xMin:0.2, xMax:1.2, yMin:gmin - 0.05 * (gmax - gmin), yMax:gmax + 0.05 * (gmax - gmin), yTicks:[], series:[{ xs:Vs.map(v => EOS.vdw.p(v, T)), ys:Gp, color:'--text', width:2 }],
      refs, markers:[{ x:p, y:Gf(V, T, p), color:'--s4' }], tip:x => `p̃ = ${x.toFixed(3)}` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.gibbs = { fig, play:anim.play, set(p){ if (p.T) ui.set('T', p.T, true); if (p.p) ui.set('p', p.p, true); draw(); },
    read(k){ const T = ui.get('T'); const m = T < 1 ? mw('vdw', Math.round(T * 1000) / 1000) : null; if (k === 'pB') return m ? `${fmt(m.Pv, 4)} (T̃ = ${T.toFixed(3)})` : '임계온도 위'; return null; } };
}

/* =====================================================================
 * dieterici — 26.2: 벽 근처에 인력 띠가 있으면 벽까지 오는 분자의 수가 볼츠만 인자만큼 준다 (디테리치의 착상, 각주 4)
 *   왼쪽 벽: 인력 없음, 오른쪽 벽: 폭 w의 띠에서 안쪽으로 당기는 일정한 힘 (에너지 장벽 ΔE).
 * ===================================================================== */
const ZC = [['반데르발스', 3 / 8, '--s1'], ['디테리치', 2 / Math.E ** 2, '--s4'], ['Ne', 0.287, '--s2'], ['Ar', 0.292, '--s2'], ['Kr', 0.291, '--s2'], ['Xe', 0.290, '--s2']];
function simDieterici(){
  const fig = document.getElementById('sim-dieterici'); if (!fig) return;
  const lay = K.layout(fig, { stageH:260, aria:'오른쪽 벽 근처에서 안쪽으로 당겨지는 분자들', note:'노란 띠: 분자를 안쪽으로 당기는 영역 · 원: 벽에 닿은 자리' });
  const ui = B.controls(lay.side, [
    { key:'dE', label:'인력 띠의 장벽 $\\Delta E/k_BT$', min:0, max:3, step:0.05, value:1, fmt:v => v.toFixed(2) },
    { key:'T', label:'등온선의 온도 $\\tilde T$', min:0.75, max:1.5, step:0.005, value:0.95, fmt:v => v.toFixed(3) } ]);
  const [runB, resetB] = K.buttons(lay.side, [['■ 멈춤', 'primary'], ['횟수 다시 세기']]);
  K.note(lay.side, '분자 200개, 같은 온도 유지. 오른쪽 벽에 닿는 빈도를 왼쪽 벽과 비교한다.');
  const tile = B.tiles(lay.tiles, [ { key:'r', label:'충돌 빈도 비 (오른쪽/왼쪽) 측정' }, { key:'e', label:'볼츠만 인자 $e^{-\\Delta E/k_BT}$' }, { key:'n', label:'센 충돌 수 (왼쪽 / 오른쪽)' } ]);
  const wI = B.plotBox(lay.plots, { title:'두 모형의 등온선 (그림 26.2, 26.7)', aria:'반데르발스와 디테리치 등온선',
    legend:'<span><i style="background:var(--s1)"></i>반데르발스</span><span><i style="background:var(--s4)"></i>디테리치</span>' });
  const pI = new B.Plot(wI, { xLabel:'Ṽ (로그)', yLabel:'p̃' });
  const wZ = B.plotBox(lay.plots, { title:'$p_cV_c/RT_c$: 모형과 측정 (표 26.1)', aria:'임계 압축인자 비교' });
  const pZ = new B.Plot(wZ, { yLabel:'Z_c' });
  const wR = B.plotBox(lay.plots, { title:'벽 충돌 빈도의 비와 장벽 (선: $e^{-\\Delta E/k_BT}$)', aria:'장벽에 따른 충돌 빈도의 비' });
  const pR = new B.Plot(wR, { xLabel:'ΔE / k_BT', onPick:x => ui.set('dE', Math.round(x * 20) / 20), current:() => ui.get('dE') });
  const LX = 1.6, wB = 0.3, N = 200, P = [], hits = [];
  for (let i = 0; i < N; i++) P.push({ x:Math.random() * LX, y:Math.random(), vx:g(), vy:g() });
  let S = { l:0, r:0 };
  const reset = () => { S = { l:0, r:0 }; };
  ui.on(k => { if (k === 'dE') reset(); draw(); }); resetB.addEventListener('click', () => { reset(); draw(); });
  function step(dtR){
    const F = ui.get('dE') / wB, dt = 0.004, n = Math.round(dtR * 2.0 / dt);
    for (let k = 0; k < n; k++) for (const a of P) {
      if (Math.random() < 1.0 * dt) { a.vx = g(); a.vy = g(); }
      const inBand = a.x > LX - wB;
      if (inBand) a.vx -= F * dt;
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.x < 0) { a.x = -a.x; a.vx = Math.abs(a.vx); S.l++; if (hits.length < 40) hits.push({ x:0, y:a.y, t:0.4 }); }
      if (a.x > LX) { a.x = 2 * LX - a.x; a.vx = -Math.abs(a.vx); S.r++; if (hits.length < 40) hits.push({ x:LX, y:a.y, t:0.4 }); }
      if (a.y < 0) { a.y = -a.y; a.vy = Math.abs(a.vy); } if (a.y > 1) { a.y = 2 - a.y; a.vy = -Math.abs(a.vy); }
    }
    for (const h of hits) h.t -= dtR; while (hits.length && hits[0].t <= 0) hits.shift();
  }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const sc = Math.min((W - 20) / LX, H - 30), ox = (W - LX * sc) / 2, oy = 20;
    ctx.fillStyle = css('--s5'); ctx.globalAlpha = .15; ctx.fillRect(ox + (LX - wB) * sc, oy, wB * sc, sc); ctx.globalAlpha = 1;
    ctx.strokeStyle = css('--text-2'); ctx.lineWidth = 1.5; ctx.strokeRect(ox, oy, LX * sc, sc);
    for (const a of P) K.ball(ctx, ox + a.x * sc, oy + a.y * sc, 2.4, css('--s1'));
    for (const h of hits) { ctx.globalAlpha = Math.max(0, h.t / 0.4); ctx.strokeStyle = css('--s2'); ctx.beginPath(); ctx.arc(ox + h.x * sc, oy + h.y * sc, 5, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('왼쪽 벽: 인력 없음', ox, 3); ctx.textAlign = 'right'; ctx.fillText('오른쪽 벽: 인력 띠', ox + LX * sc, 3);
    const ratio = S.l > 20 ? S.r / S.l : NaN, ex = Math.exp(-ui.get('dE'));
    tile('r', fmt(ratio, 3)); tile('e', fmt(ex, 3)); tile('n', `${S.l} / ${S.r}`);
    const T = ui.get('T'), Vs = logs(0.55, 8, 240);
    pI.set({ xMin:0.55, xMax:8, xLog:true, yMin:0, yMax:2, xTicks:[1, 2, 4, 8], series:[{ xs:Vs, ys:Vs.map(V => EOS.vdw.p(V, T)), color:'--s1' }, { xs:Vs, ys:Vs.map(V => EOS.die.p(V, T)), color:'--s4' }],
      markers:[{ x:1, y:1, color:'--text', r:3.5, vline:false }], tip:V => `Ṽ = ${V.toFixed(2)}  반데르발스 ${EOS.vdw.p(V, T).toFixed(3)}  디테리치 ${EOS.die.p(V, T).toFixed(3)}` });
    pZ.set({ xMin:0.4, xMax:ZC.length + 0.6, yMin:0, yMax:0.42, xTicks:ZC.map((z, i) => i + 1), xFmt:x => (ZC[Math.round(x) - 1] || [''])[0], yTicks:[0, 0.1, 0.2, 0.3, 0.4],
      series:[{ xs:ZC.map((z, i) => i + 1), ys:ZC.map(z => z[1]), pts:true, r:5.5, cols:ZC.map(z => z[2]) }], refs:[{ y:0.29, lab:'측정 ≈ 0.29' }],
      tip:x => { const z = ZC[Math.round(x) - 1]; return z ? `${z[0]}: ${z[1].toFixed(3)}` : null; } });
    const xs = lin(0, 3, 60);
    pR.set({ xMin:0, xMax:3, yMin:0, yMax:1.15, series:[{ xs, ys:xs.map(x => Math.exp(-x)), color:'--s1' }], markers: isFinite(ratio) ? [{ x:ui.get('dE'), y:ratio, color:'--s2' }] : [],
      tip:x => `ΔE/k_BT = ${x.toFixed(2)}   e^(−ΔE/k_BT) = ${Math.exp(-x).toFixed(3)}` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.dieterici = { fig, play:anim.play, set(p){ if (p.dE != null) ui.set('dE', p.dE); },
    read(k){ if (k !== 'ratio' || S.l < 50) return null; return `${fmt(S.r / S.l, 3)} (충돌 ${S.l + S.r}회)`; } };
}

/* =====================================================================
 * 레너드-존스 퍼텐셜과 제2 비리알 계수 (단위 σ, ε): V(r) = 4ε[(σ/r)¹² − (σ/r)⁶]
 *   3차원: B* = B / (2πN_Aσ³/3) = −3 ∫ (e^{−V/k_BT} − 1) r² dr   (식 26.56을 1몰에 대해 정리)
 * ===================================================================== */
const VLJ = r => 4 * (Math.pow(r, -12) - Math.pow(r, -6));
function Bstar(T){ const f = r => (Math.exp(-VLJ(r) / T) - 1) * r * r; return -3 * (K.simpson(f, 0.05, 0.9, 400) + K.simpson(f, 0.9, 1.6, 1400) + K.simpson(f, 1.6, 10, 1400)); }
const BT = (() => { const ts = logs(0.3, 100, 140); return { ts, bs:ts.map(Bstar) }; })();
function Bint(T){ const ts = BT.ts, bs = BT.bs; if (T <= ts[0]) return bs[0]; if (T >= ts[ts.length - 1]) return bs[bs.length - 1];
  let i = 0; while (ts[i + 1] < T) i++; const f = Math.log(T / ts[i]) / Math.log(ts[i + 1] / ts[i]); return bs[i] + f * (bs[i + 1] - bs[i]); }
const TBOYLE = K.bisect(Bstar, 2, 5);
const AR = { eps:119.8, sig:0.3405 };   // 아르곤 레너드-존스 매개변수 (흔히 쓰는 값, 확인 필요)
const NA = B.C.NA, bUnit = sig => 2 * Math.PI / 3 * NA * Math.pow(sig * 1e-9, 3) * 1e6;   // cm³/mol

/* =====================================================================
 * mayer — 그림 26.8, 26.9, 26.10: 분자 하나 옆의 이웃이 거리 r에 머무는 상대 빈도 e^{−V(r)/k_BT}
 * ===================================================================== */
function simMayer(){
  const fig = document.getElementById('sim-mayer'); if (!fig) return;
  const lay = K.layout(fig, { stageH:300, aria:'고정된 분자 옆에서 거리 r을 오가는 이웃 분자와 그 기록', note:'위: V(r)와 이웃 분자 · 아래: 머문 비율(막대)과 e^(−V/k_BT)(선)' });
  const ui = B.controls(lay.side, [
    { key:'T', label:'$k_BT/\\varepsilon$', min:0.5, max:30, value:1.5, log:true, fmt:v => fmtP(v, 3) },
    { key:'ar', label:'아르곤 눈금으로도 보기', type:'check', value:true } ]);
  const [runB, resetB] = K.buttons(lay.side, [['■ 멈춤', 'primary'], ['기록 지우기']]);
  K.note(lay.side, '아르곤 눈금: $\\varepsilon/k_B=119.8$ K, $\\sigma=0.3405$ nm (흔히 쓰는 레너드-존스 값, 확인 필요).');
  const tile = B.tiles(lay.tiles, [ { key:'b', label:'$B^*=B/(2\\pi N_A\\sigma^3/3)$' }, { key:'s', label:'부호의 뜻' },
    { key:'tb', label:'보일 온도 $k_BT_B/\\varepsilon$' }, { key:'ar', label:'아르곤: $T$, $B$' } ]);
  const wF = B.plotBox(lay.plots, { title:'적분할 함수 $3r^2(1-e^{-V/k_BT})$ — 넓이가 $B^*$ (그림 26.10(b))', aria:'메이어 함수에 r²을 곱한 적분 함수',
    legend:'<span><i style="background:var(--s3);opacity:.5"></i>양의 넓이 (반발)</span><span><i style="background:var(--s2);opacity:.5"></i>음의 넓이 (인력)</span>' });
  const pF = new B.Plot(wF, { xLabel:'r / σ' });
  const wB2 = B.plotBox(lay.plots, { title:'비리알 계수 $B^*(T)$ (그림 26.8, 26.9)', aria:'온도에 따른 비리알 계수',
    legend:'<span><i style="background:var(--s1)"></i>레너드-존스</span><span><i class="dash"></i>T_B, 아르곤 T_b·T_c</span>' });
  const pB = new B.Plot(wB2, { xLabel:'k_BT / ε (로그)', yLabel:'B*', onPick:x => ui.set('T', x), current:() => ui.get('T') });
  const R0 = 0.75, R1 = 3, NB = 45, S = { r:1.5, cnt:new Array(NB).fill(0), n:0 };
  const reset = () => { S.cnt.fill(0); S.n = 0; };
  ui.on(k => { if (k === 'T') reset(); draw(); }); resetB.addEventListener('click', () => { reset(); draw(); });
  function step(dt){ const T = ui.get('T');
    for (let i = 0; i < 400; i++) { let r2 = S.r + (Math.random() - .5) * 0.3; if (r2 < R0) r2 = 2 * R0 - r2; if (r2 > R1) r2 = 2 * R1 - r2;
      const acc = (r2 * r2) / (S.r * S.r) * Math.exp(-(VLJ(r2) - VLJ(S.r)) / T); if (Math.random() < acc) S.r = r2;
      const b = Math.floor((S.r - R0) / (R1 - R0) * NB); if (b >= 0 && b < NB) S.cnt[b]++; S.n++; } }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const T = ui.get('T'), l = 36, r = W - 12, X = x => l + (x - R0) / (R1 - R0) * (r - l);
    const h1 = H * 0.48, Y1 = v => 14 + (1 - (v + 1.2) / 2.4) * (h1 - 20);
    ctx.strokeStyle = css('--line'); ctx.beginPath(); ctx.moveTo(l, Y1(0)); ctx.lineTo(r, Y1(0)); ctx.stroke();
    ctx.strokeStyle = css('--text'); ctx.lineWidth = 2; ctx.beginPath(); let st = false;
    for (let i = 0; i <= 200; i++) { const x = R0 + (R1 - R0) * i / 200, v = VLJ(x); if (v > 1.2) { st = false; continue; } st ? ctx.lineTo(X(x), Y1(v)) : ctx.moveTo(X(x), Y1(v)); st = true; } ctx.stroke();
    ctx.setLineDash([3, 3]); ctx.strokeStyle = css('--s2'); ctx.beginPath(); ctx.moveTo(l, Y1(-1 + Math.min(T, 2.2))); ctx.lineTo(r, Y1(-1 + Math.min(T, 2.2))); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css('--s2'); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('우물 바닥 + k_BT', r, Y1(-1 + Math.min(T, 2.2)) - 2);
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.fillText('V(r)/ε', l + 2, 14); ctx.textBaseline = 'top'; ctx.fillText('r_min', X(Math.pow(2, 1 / 6)) - 10, Y1(0) + 2);
    K.ball(ctx, l - 14, Y1(0), 9, css('--text-2'));
    K.ball(ctx, X(S.r), Y1(Math.min(1.2, VLJ(S.r))) - 7, 7, css('--s4'));
    const top2 = h1 + 10, b2 = H - 24, gmax = Math.max(2, Math.exp(1 / T) * 1.1), Y2 = v => b2 - v / gmax * (b2 - top2);
    const norm = (() => { let s = 0, c = 0; for (let i = 0; i < NB; i++) { const rc = R0 + (i + .5) * (R1 - R0) / NB; if (rc > 2.4) { s += S.cnt[i] / (rc * rc); c++; } } return c && s ? s / c : 1; })();
    for (let i = 0; i < NB; i++) { const rc = R0 + (i + .5) * (R1 - R0) / NB, gv = S.n ? S.cnt[i] / (rc * rc) / norm : 0;
      ctx.fillStyle = css('--s4'); ctx.globalAlpha = .4; const x0 = X(R0 + i * (R1 - R0) / NB), x1 = X(R0 + (i + 1) * (R1 - R0) / NB); ctx.fillRect(x0 + 1, Y2(Math.min(gmax, gv)), x1 - x0 - 2, b2 - Y2(Math.min(gmax, gv))); }
    ctx.globalAlpha = 1; ctx.strokeStyle = css('--text'); ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const x = R0 + (R1 - R0) * i / 200, v = Math.exp(-VLJ(x) / T); i ? ctx.lineTo(X(x), Y2(Math.min(gmax, v))) : ctx.moveTo(X(x), Y2(Math.min(gmax, v))); } ctx.stroke();
    ctx.setLineDash([3, 3]); ctx.strokeStyle = css('--muted'); ctx.beginPath(); ctx.moveTo(l, Y2(1)); ctx.lineTo(r, Y2(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('상대 빈도 (1 = 이웃이 없는 듯)', l + 2, top2 + 12);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (const v of [1, 1.5, 2, 2.5, 3]) ctx.fillText(String(v), X(v), b2 + 4);
    const bs = Bint(T), arOn = ui.get('ar');
    tile('b', fmt(bs, 3)); tile('s', bs < 0 ? '음수: 인력이 우세 (압력이 이상기체보다 작다)' : '양수: 반발(분자 크기)이 우세');
    tile('tb', fmt(TBOYLE, 4)); tile('ar', `${fmt(T * AR.eps, 3)} K, ${fmt(bs * bUnit(AR.sig), 3)} cm³/mol`, '같은 B*를 아르곤 값으로 환산');
    const rs = lin(0.8, 3, 240), fn = rs.map(x => 3 * x * x * (1 - Math.exp(-VLJ(x) / T)));
    pF.set({ xMin:0.8, xMax:3, yMin:Math.min(-1, Math.min(...fn) * 1.1), yMax:3.3, series:[{ xs:rs, ys:fn.map(v => Math.max(0, v)), fill:true, color:'--s3', alpha:.35 }, { xs:rs, ys:fn.map(v => Math.min(0, v)), fill:true, color:'--s2', alpha:.35 }, { xs:rs, ys:fn, color:'--text', width:1.6 }],
      refs:[{ y:0 }], tip:x => `r = ${x.toFixed(2)} σ   1 − e^(−V/k_BT) = ${(1 - Math.exp(-VLJ(x) / T)).toFixed(3)}` });
    const refs = [{ x:TBOYLE, lab:'T_B' }]; if (arOn) refs.push({ x:87 / AR.eps, lab:'T_b(Ar)' }, { x:151 / AR.eps, lab:'T_c(Ar)' });
    pB.set({ xMin:0.5, xMax:30, xLog:true, yMin:-8, yMax:1.5, yTicks:[-8, -6, -4, -2, 0, 1], series:[{ xs:BT.ts, ys:BT.bs, color:'--s1' }], refs:refs.concat([{ y:0 }]),
      markers:[{ x:T, y:bs, color:'--s2' }], tip:x => `k_BT/ε = ${fmtP(x, 3)}   B* = ${Bint(x).toFixed(3)}` + (arOn ? `   (아르곤 ${(x * AR.eps).toFixed(0)} K, ${(Bint(x) * bUnit(AR.sig)).toFixed(1)} cm³/mol)` : '') });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.mayer = { fig, play:anim.play, set(p){ if (p.T) ui.set('T', p.T); },
    read(k){ if (k === 'Bar') return `${fmt(Bint(ui.get('T')) * bUnit(AR.sig), 3)} cm³/mol (아르곤 ${fmtP(ui.get('T') * AR.eps, 3)} K)`; return null; } };
}

/* =====================================================================
 * ljgas — 26.3: 2차원 레너드-존스 기체 (주기 경계, 랑주뱅 열원). 비리알 정리로 압력을 잰다:
 *   pA = N k_BT + ½⟨Σ_{i<j} r_ij·F_ij⟩  (2차원)  →  Z = pA/Nk_BT
 *   이론 비교: 2차원 제2 비리알 계수 B₂ = −π ∫ (e^{−V/k_BT} − 1) r dr,  Z ≈ 1 + B₂ n
 * ===================================================================== */
function B2d(T){ const f = r => (Math.exp(-VLJ(r) / T) - 1) * r; return -Math.PI * (K.simpson(f, 0.05, 1, 400) + K.simpson(f, 1, 8, 1400)); }
function simLjgas(){
  const fig = document.getElementById('sim-ljgas'); if (!fig) return;
  const lay = K.layout(fig, { stageH:320, aria:'서로 끌고 미는 분자들이 움직이는 2차원 기체', note:'분자 지름 ≈ σ · 가장자리는 반대편과 이어져 있다' });
  const ui = B.controls(lay.side, [ { key:'T', label:'온도 $k_BT/\\varepsilon$', min:0.6, max:5, value:1, log:true, fmt:v => fmtP(v, 3) } ]);
  const [runB, resetB] = K.buttons(lay.side, [['■ 멈춤', 'primary'], ['평균 다시 모으기']]);
  K.note(lay.side, '분자 64개, 수밀도 $n=0.1/\\sigma^2$. 저온에서는 분자들이 잠깐씩 뭉친다. 온도를 바꾸면 잠깐 평형을 기다린 뒤 평균을 모은다. 분자가 적어 $Z$는 크게 출렁이므로 1분쯤 기다려야 몇 % 안으로 모인다.');
  const tile = B.tiles(lay.tiles, [ { key:'z', label:'압축인자 $Z=pA/Nk_BT$ 측정' }, { key:'zt', label:'제2 비리알 근사 $1+B_2n$' },
    { key:'b2', label:'$B_2/\\sigma^2$ (2차원)' }, { key:'t', label:'모은 시간' } ]);
  const wZ = B.plotBox(lay.plots, { title:'압축인자와 온도 (선: $1+B_2n$, 2차원 보일 온도에서 1)', aria:'온도에 따른 압축인자',
    legend:'<span><i style="background:var(--s1)"></i>1 + B₂n</span><span><i class="dot" style="background:var(--s4)"></i>앞서 잰 값</span><span><i class="dot" style="background:var(--s2)"></i>지금</span>' });
  const pZ = new B.Plot(wZ, { xLabel:'k_BT / ε (로그)', yLabel:'Z', onPick:x => ui.set('T', x), current:() => ui.get('T') });
  const N = 64, n0 = 0.1, L = Math.sqrt(N / n0), RC = 3, dt = 0.005, gam = 1;
  const x = new Float64Array(N), y = new Float64Array(N), vx = new Float64Array(N), vy = new Float64Array(N), fx = new Float64Array(N), fy = new Float64Array(N);
  for (let i = 0; i < N; i++) { x[i] = (i % 8 + 0.5) * L / 8; y[i] = (Math.floor(i / 8) + 0.5) * L / 8; vx[i] = g(); vy[i] = g(); }
  let W = 0; const S = { sum:0, n:0, t:0, wait:2, past:{} };
  function forces(){ fx.fill(0); fy.fill(0); W = 0;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      let dx = x[i] - x[j], dy = y[i] - y[j]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L);
      const r2 = dx * dx + dy * dy; if (r2 > RC * RC) continue;
      const ir2 = 1 / r2, ir6 = ir2 * ir2 * ir2, ff = 24 * ir2 * ir6 * (2 * ir6 - 1);
      fx[i] += ff * dx; fy[i] += ff * dy; fx[j] -= ff * dx; fy[j] -= ff * dy; W += ff * r2; } }
  forces();
  const reset = () => { S.sum = 0; S.n = 0; S.t = 0; S.wait = 2; };
  ui.on(() => { reset(); draw(); }); resetB.addEventListener('click', () => { reset(); draw(); });
  function step(dtR){ const T = ui.get('T'), c1 = Math.exp(-gam * dt), c2 = Math.sqrt((1 - c1 * c1) * T), n = 30;
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; x[i] += 0.5 * dt * vx[i]; y[i] += 0.5 * dt * vy[i];
        vx[i] = c1 * vx[i] + c2 * g(); vy[i] = c1 * vy[i] + c2 * g(); x[i] += 0.5 * dt * vx[i]; y[i] += 0.5 * dt * vy[i];
        x[i] = (x[i] % L + L) % L; y[i] = (y[i] % L + L) % L; }
      forces(); let ke = 0;
      for (let i = 0; i < N; i++) { vx[i] += 0.5 * dt * fx[i]; vy[i] += 0.5 * dt * fy[i]; ke += 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]); }
      if (S.wait > 0) { S.wait -= dt; continue; }
      S.sum += (ke + 0.5 * W) / (N * T); S.n++; S.t += dt;   // 2차원: N k_B T_kin = ke
    }
    if (S.n) S.past[ui.get('T').toFixed(3)] = [ui.get('T'), S.sum / S.n];
  }
  function draw(){
    const { ctx, W:Wc, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, Wc, H);
    const sc = Math.min(Wc - 10, H - 10) / L, ox = (Wc - L * sc) / 2, oy = (H - L * sc) / 2;
    ctx.strokeStyle = css('--line'); ctx.strokeRect(ox, oy, L * sc, L * sc);
    for (let i = 0; i < N; i++) K.ball(ctx, ox + x[i] * sc, oy + y[i] * sc, 0.5 * sc, css('--s1'));
    const T = ui.get('T'), b2 = B2d(T), z = S.n ? S.sum / S.n : NaN;
    tile('z', fmt(z, 3), S.wait > 0 ? '평형을 기다리는 중' : ''); tile('zt', fmt(1 + b2 * n0, 3)); tile('b2', fmt(b2, 3)); tile('t', `${fmt(S.t, 3)} ε^(−½)σm^½`.replace(' ε^(−½)σm^½', ' (σ√(m/ε) 단위)'));
    const ts = logs(0.6, 5, 60), pk = Object.values(S.past);
    pZ.set({ xMin:0.6, xMax:5, xLog:true, yMin:0.4, yMax:1.3, xTicks:[0.6, 1, 2, 3, 5], series:[{ xs:ts, ys:ts.map(t => 1 + B2d(t) * n0), color:'--s1' }, { xs:pk.map(p => p[0]), ys:pk.map(p => p[1]), pts:true, r:3.5, color:'--s4' }],
      refs:[{ y:1, lab:'이상기체' }], markers: S.n ? [{ x:T, y:z, color:'--s2' }] : [], tip:t => `k_BT/ε = ${fmtP(t, 3)}   1 + B₂n = ${(1 + B2d(t) * n0).toFixed(3)}` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.ljgas = { fig, play:anim.play, set(p){ if (p.T) ui.set('T', p.T); },
    read(k){ if (k !== 'z' || !S.n) return null; return `${fmt(S.sum / S.n, 3)} (k_BT/ε = ${fmtP(ui.get('T'), 3)})`; } };
}

/* =====================================================================
 * coexist — 그림 26.11: 공존 곡선 T/T_c 대 ρ/ρ_c
 *   경험식(Guggenheim): ρ/ρ_c = 1 + ¾(1−T̃) ± (7/4)(1−T̃)^{1/3}
 * ===================================================================== */
const GG = t => { const u = 1 - t; return [1 + 0.75 * u + 1.75 * Math.cbrt(u), 1 + 0.75 * u - 1.75 * Math.cbrt(u)]; };
function simCoexist(){
  const fig = document.getElementById('sim-coexist'); if (!fig) return;
  const lay = K.layout(fig, { stageH:280, aria:'액체와 기체가 공존하는 용기, 온도가 오르면 두 밀도가 가까워진다', note:'전체 밀도는 임계 밀도 · 아래: 액체, 위: 기체' });
  const ui = B.controls(lay.side, [
    { key:'T', label:'온도 $T/T_c$', min:0.55, max:0.999, step:0.001, value:0.8, fmt:v => v.toFixed(3) },
    { key:'m', label:'용기에 그릴 밀도', type:'seg', options:[['gg', '경험식'], ['vdw', '반데르발스'], ['die', '디테리치']], value:'gg' } ]);
  const [runB] = K.buttons(lay.side, [['■ 멈춤', 'primary']]);
  K.note(lay.side, '경험식은 그림 26.11의 실험 점들을 잘 따르는 것으로 알려진 식이다(출처: Guggenheim 1945, 식의 형태는 확인 필요).');
  const tile = B.tiles(lay.tiles, [ { key:'gg', label:'경험식 $\\rho_l/\\rho_c$, $\\rho_g/\\rho_c$' }, { key:'vdw', label:'반데르발스' }, { key:'die', label:'디테리치' }, { key:'d', label:'$(\\rho_l-\\rho_g)/\\rho_c$: 경험식 / 반데르발스' } ]);
  const wC = B.plotBox(lay.plots, { title:'공존 곡선 (그림 26.11) — 세로축을 누르면 그 온도로', aria:'환산 밀도와 환산 온도의 공존 곡선',
    legend:'<span><i style="background:var(--s3)"></i>경험식</span><span><i style="background:var(--s1)"></i>반데르발스</span><span><i style="background:var(--s4)"></i>디테리치</span>', height:240 });
  const pC = new B.Plot(wC, { xLabel:'ρ / ρ_c', yLabel:'T/T_c', pickAxis:'y', onPick:y => ui.set('T', Math.min(0.999, y)), current:() => ui.get('T') });
  const wD = B.plotBox(lay.plots, { title:'임계점 근처: $(\\rho_l-\\rho_g)/\\rho_c$와 $1-T/T_c$ (로그-로그)', aria:'임계점 근처의 밀도 차', height:240,
    legend:'<span><i class="dash"></i>기울기 1/2, 1/3</span>' });
  const pD = new B.Plot(wD, { xLabel:'1 − T/T_c (로그)', xLog:true, yLog:true, onPick:u => ui.set('T', Math.min(0.999, 1 - u)), current:() => 1 - ui.get('T') });
  const CV = coex('vdw').filter(c => c.T >= 0.5), CD = coex('die').filter(c => c.T >= 0.5);
  const dens = (key, T) => { if (key === 'gg') return GG(T); const m = mw(key, Math.round(T * 1000) / 1000); return m ? [1 / m.Vl, 1 / m.Vg] : [1, 1]; };
  const D = []; for (let i = 0; i < 140; i++) D.push({ x:Math.random(), y:Math.random(), vx:g() * .25, vy:g() * .25 });
  function step(dt){ for (const d of D) { d.x += d.vx * dt; d.y += d.vy * dt; bounce(d, 0, 0, 1, 1); } }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const T = ui.get('T'), [rl, rg] = dens(ui.get('m'), T), phi = (1 - rg) / (rl - rg);
    const cw = Math.min(W * 0.6, 280), cx = (W - cw) / 2, top = 12, bot = H - 30, h = bot - top, hl = phi * h;
    ctx.fillStyle = css('--s1'); ctx.globalAlpha = 0.1 + 0.25 * (1 - (T - 0.55) / 0.45); ctx.fillRect(cx, bot - hl, cw, hl); ctx.globalAlpha = 1;
    ctx.strokeStyle = css('--text-2'); ctx.lineWidth = 2; ctx.strokeRect(cx, top, cw, h);
    const nTot = D.length, nl = Math.round(nTot * phi * rl);
    D.forEach((d, i) => { const liq = i < nl, y = liq ? bot - d.y * hl : top + d.y * (h - hl); K.ball(ctx, cx + 3 + d.x * (cw - 6), y, 2.6, liq ? css('--s1') : css('--s2')); });
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; const pad = s => { const w = ctx.measureText(s).width + 8; return w; };
    const lab = (s, y) => { ctx.fillStyle = css('--bg'); ctx.globalAlpha = .85; ctx.fillRect(cx + 4, y, pad(s), 16); ctx.globalAlpha = 1; ctx.fillStyle = css('--text'); ctx.fillText(s, cx + 8, y + 2); };
    lab(`기체 ρ_g/ρ_c = ${rg.toFixed(3)}`, top + 4); if (hl > 20) lab(`액체 ρ_l/ρ_c = ${rl.toFixed(2)}`, bot - hl + 4);
    const tv = k => { const [a, b] = dens(k, T); return `${fmtP(a, 3)}, ${fmtP(b, 3)}`; };
    tile('gg', tv('gg')); tile('vdw', tv('vdw')); tile('die', tv('die'));
    const dg = GG(T), dv = dens('vdw', T); tile('d', `${fmtP(dg[0] - dg[1], 3)} / ${fmtP(dv[0] - dv[1], 3)}`);
    const tg = lin(0.55, 1, 120);
    const dome = (arr, key) => key === 'gg' ? { xs:tg.map(t => GG(t)[1]).concat(tg.slice().reverse().map(t => GG(t)[0])), ys:tg.concat(tg.slice().reverse()) }
      : { xs:arr.map(c => 1 / c.Vg).concat(arr.slice().reverse().map(c => 1 / c.Vl)), ys:arr.map(c => c.T).concat(arr.slice().reverse().map(c => c.T)) };
    const sg = dome(null, 'gg'), sv = dome(CV, 'vdw'), sd = dome(CD, 'die');
    const mk = ['gg', 'vdw', 'die'].flatMap((k, i) => { const [a, b] = dens(k, T), c = ['--s3', '--s1', '--s4'][i]; return [{ x:a, y:T, color:c, vline:false, r:4.5 }, { x:b, y:T, color:c, vline:false, r:4.5 }]; });
    pC.set({ xMin:0, xMax:3, yMin:0.55, yMax:1.02, yTicks:[0.6, 0.7, 0.8, 0.9, 1], series:[{ ...sg, color:'--s3', width:2.2 }, { ...sv, color:'--s1', width:1.8 }, { ...sd, color:'--s4', width:1.8 }],
      refs:[{ y:T }], markers:mk, tip:x => `ρ/ρ_c = ${x.toFixed(2)}` });
    const us = logs(0.002, 0.45, 60);
    pD.set({ xMin:0.002, xMax:0.45, xLog:true, yLog:true, yMin:0.05, yMax:4,
      series:[{ xs:us, ys:us.map(u => { const d = GG(1 - u); return d[0] - d[1]; }), color:'--s3', width:2.2 },
        { xs:CV.map(c => 1 - c.T).filter(u => u > 0.0015), ys:CV.filter(c => 1 - c.T > 0.0015).map(c => 1 / c.Vl - 1 / c.Vg), color:'--s1' },
        { xs:CD.map(c => 1 - c.T).filter(u => u > 0.0015), ys:CD.filter(c => 1 - c.T > 0.0015).map(c => 1 / c.Vl - 1 / c.Vg), color:'--s4' }],
      refs:[{ fn:u => 4 * Math.sqrt(u), lab:'∝ (1−T̃)^½' }, { fn:u => 3.5 * Math.cbrt(u), lab:'∝ (1−T̃)^⅓', labX:0.01 }],
      markers:[{ x:1 - T, y:dg[0] - dg[1], color:'--s3' }], tip:u => `1 − T/T_c = ${fmtP(u, 3)}` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); ui.on(() => draw()); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.coexist = { fig, play:anim.play, set(p){ if (p.T) ui.set('T', p.T); },
    read(k){ if (k === 'vdwratio') { const d = dens('vdw', ui.get('T')); return `${fmt(d[0] / d[1], 3)} (T/T_c = ${ui.get('T').toFixed(3)})`; } return null; } };
}

/* =====================================================================
 * collapse — 26.4: 레너드-존스 매개변수가 다른 세 가상 기체의 B(T). 환산하면 한 곡선.
 * ===================================================================== */
const GASES = [['기체 A', 40, 0.28, '--s3'], ['기체 B', 120, 0.34, '--s1'], ['기체 C', 230, 0.41, '--s4']];
function simCollapse(){
  const fig = document.getElementById('sim-collapse'); if (!fig) return;
  const lay = K.layout(fig, { stageH:250, aria:'세 기체의 분자 사이 퍼텐셜 우물과 그 안에서 흔들리는 분자', note:'우물 깊이 ε, 폭 σ가 기체마다 다르다' });
  const ui = B.controls(lay.side, [
    { key:'T', label:'온도 $T$', min:20, max:2000, value:300, log:true, fmt:v => v.toFixed(0) + ' K' },
    { key:'red', label:'환산 단위 ($r/\\sigma$, $V/\\varepsilon$)로 보기', type:'check', value:false } ]);
  const [runB] = K.buttons(lay.side, [['■ 멈춤', 'primary']]);
  K.note(lay.side, '세 기체는 설명을 위해 만든 가상의 기체다. 기체 A: ε/k_B = 40 K, σ = 0.28 nm · B: 120 K, 0.34 nm · C: 230 K, 0.41 nm.');
  const tile = B.tiles(lay.tiles, GASES.map(G => ({ key:G[0], label:`${G[0]}: $k_BT/\\varepsilon$, $B$` })));
  const wU = B.plotBox(lay.plots, { title:'날것의 단위: $B$ (cm³/mol)와 $T$ (K)', aria:'세 기체의 비리알 계수, 날것의 단위',
    legend:GASES.map(G => `<span><i style="background:var(${G[3]})"></i>${G[0]}</span>`).join('') });
  const pU = new B.Plot(wU, { xLabel:'T (K, 로그)', yLabel:'B', onPick:x => ui.set('T', x), current:() => ui.get('T') });
  const wR = B.plotBox(lay.plots, { title:'환산 단위: $B^*$와 $k_BT/\\varepsilon$ — 세 곡선이 겹친다', aria:'세 기체의 비리알 계수, 환산 단위' });
  const pR = new B.Plot(wR, { xLabel:'k_BT/ε (로그)', yLabel:'B*', onPick:x => ui.set('T', x * GASES[1][1]), current:() => ui.get('T') / GASES[1][1] });
  let mix = 0; const ph = GASES.map(() => Math.random() * 6);
  ui.on(() => draw());
  function step(dt){ mix += ((ui.get('red') ? 1 : 0) - mix) * Math.min(1, dt * 3); ph.forEach((_, i) => ph[i] += dt * (2 + i)); }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const l = 30, r = W - 10, t = 16, b = H - 24, T = ui.get('T');
    const rMax = 1.0, Vmin = -260;
    GASES.forEach((G, i) => { const [nm, eps, sig, col] = G;
      const xr = rr => { const raw = rr * sig, red = rr * 0.34; return l + ((1 - mix) * raw + mix * red) / rMax * (r - l); };
      const yv = v => { const raw = v * eps, red = v * 120; const vv = (1 - mix) * raw + mix * red; return t + (1 - (vv - Vmin) / (120 - Vmin)) * (b - t); };
      ctx.strokeStyle = css(col); ctx.lineWidth = 2; ctx.beginPath(); let st = false;
      for (let k = 0; k <= 200; k++) { const rr = 0.85 + 2.0 * k / 200, v = VLJ(rr); if (v * eps > 140 && mix < 0.5 || v > 1.1) { st = false; continue; } const X = xr(rr), Y = yv(v); st ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); st = true; }
      ctx.stroke();
      const amp = Math.min(0.25, 0.12 * Math.sqrt(T / eps)), rr = Math.pow(2, 1 / 6) + amp * Math.sin(ph[i]);
      K.ball(ctx, xr(rr), yv(VLJ(rr)) - 6, 5.5, css(col));
    });
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(mix > 0.5 ? '가로 r/σ, 세로 V/ε (기체 B의 눈금으로 그림)' : '가로 r (nm), 세로 V/k_B (K)', l, 2);
    GASES.forEach(G => tile(G[0], `${fmtP(T / G[1], 3)}, ${fmtP(Bint(T / G[1]) * bUnit(G[2]), 3)} cm³/mol`));
    const Ts = logs(20, 2000, 120);
    pU.set({ xMin:20, xMax:2000, xLog:true, yMin:-400, yMax:120, yTicks:[-400, -200, 0, 100],
      series:GASES.map(G => ({ xs:Ts, ys:Ts.map(x => Bint(x / G[1]) * bUnit(G[2])), color:G[3] })), refs:[{ y:0 }],
      markers:GASES.map(G => ({ x:T, y:Math.max(-400, Bint(T / G[1]) * bUnit(G[2])), color:G[3], vline:false })), tip:x => `T = ${x.toFixed(0)} K` });
    const tr = logs(0.3, 30, 120);
    pR.set({ xMin:0.3, xMax:30, xLog:true, yMin:-8, yMax:1.5, yTicks:[-8, -4, 0, 1], refs:[{ y:0 }],
      series:GASES.map((G, i) => ({ xs:tr, ys:tr.map(Bint), color:G[3], width:i === 1 ? 2.4 : 1.6, dash:i === 0 ? [6, 4] : i === 2 ? [2, 3] : null })),
      markers:GASES.map(G => ({ x:Math.min(30, Math.max(0.3, T / G[1])), y:Bint(T / G[1]), color:G[3], vline:false })), tip:x => `k_BT/ε = ${fmtP(x, 3)}   B* = ${Bint(x).toFixed(3)}` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.collapse = { fig, play:anim.play, set(p){ if (p.T) ui.set('T', p.T); }, read(){ return null; } };
}

B.ready(() => { simVdw(); simGibbs(); simDieterici(); simMayer(); simLjgas(); simCoexist(); simCollapse(); });
})();
