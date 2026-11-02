/* =====================================================================
 * sim25.js — 25장 상대론적 기체
 *   relgas  그림 25.1  분산관계 E² = p²c² + m²c⁴ 와 움직이는 상대론적 기체   25.1
 *   ultra   25.2       분산관계 E ∝ p^s 인 기체의 압력을 벽 충돌로 재기        25.2
 *   expand  25.3       천천히 물러나는 벽: 초상대론·비상대론 기체의 단열 냉각  25.3
 *   cosmos  예제 25.2  우주 팽창: 적색이동과 밀도 (시나리오)                    25.3
 * 모든 그래프는 Book.Plot. 가로축이 매개변수이면 누르면 그 값으로 이동한다.
 * ===================================================================== */
(function(){
'use strict';
const B = window.Book, K = B.kit, C = B.C, g = B.gauss, fmt = B.fmt, fmtP = B.fmtPlain, css = B.cssv;
const lin = K.linspace, logs = K.logspace;
function randGamma(k){                       // Marsaglia–Tsang
  if (k < 1) return randGamma(k + 1) * Math.pow(Math.random(), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) { let x, v; do { x = g(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = Math.random();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; }
}
function randDir(){ const z = 2 * Math.random() - 1, ph = 2 * Math.PI * Math.random(), s = Math.sqrt(1 - z * z); return [s * Math.cos(ph), s * Math.sin(ph), z]; }
function mixCol(a, b, t){ const pa = /^#?(..)(..)(..)$/.exec(a.trim()), pb = /^#?(..)(..)(..)$/.exec(b.trim()); if (!pa || !pb) return a;
  const m = i => Math.round(parseInt(pa[i], 16) * (1 - t) + parseInt(pb[i], 16) * t); return `rgb(${m(1)},${m(2)},${m(3)})`; }
const KEL = { e: 0.51099895e6 * C.e / C.kB, p: 938.27208816e6 * C.e / C.kB };   // mc²/k_B (K): 전자, 양성자

/* =====================================================================
 * relgas — 그림 25.1. 단위 m = c = 1: 운동량은 mc, 에너지는 mc² 단위.
 *   열평형에서 운동량 크기의 분포 P(p) ∝ p² exp[−(E(p)−mc²)/k_BT] (볼츠만 인자 × 상태 밀도)
 * ===================================================================== */
const Efun = p => Math.sqrt(1 + p * p);
function jTable(th){
  const pmax = Math.sqrt((1 + 40 * th) ** 2 - 1), n = 1200, ps = [], cdf = []; let s = 0;
  for (let i = 0; i <= n; i++) { const p = pmax * i / n; s += p * p * Math.exp(-(Efun(p) - 1) / th); ps.push(p); cdf.push(s); }
  for (let i = 0; i <= n; i++) cdf[i] /= s;
  return { ps, cdf, pmax };
}
function jSample(T){ const u = Math.random(); let lo = 0, hi = T.cdf.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.cdf[m] < u) lo = m; else hi = m; }
  const f = (u - T.cdf[lo]) / ((T.cdf[hi] - T.cdf[lo]) || 1); return T.ps[lo] + f * (T.ps[hi] - T.ps[lo]); }
function eKin(th){   // ⟨E − mc²⟩ (단위 mc²), 수치 적분
  const pmax = Math.sqrt((1 + 40 * th) ** 2 - 1);
  const w = p => p * p * Math.exp(-(Efun(p) - 1) / th);
  const num = K.simpson(p => (Efun(p) - 1) * w(p), 0, pmax, 2000), den = K.simpson(w, 0, pmax, 2000);
  return num / den;
}
function simRelgas(){
  const fig = document.getElementById('sim-relgas'); if (!fig) return;
  const lay = K.layout(fig, { stageH:300, aria:'상자 속에서 움직이는 상대론적 기체 입자들', note:'색: 주황일수록 E/mc²가 크다 · 화면 속도 c는 고정' });
  const ui = B.controls(lay.side, [ { key:'th', label:'$k_BT/mc^2$', min:0.02, max:50, value:0.3, log:true, fmt:v => fmtP(v, 3) } ]);
  const [runB] = K.buttons(lay.side, [['■ 멈춤', 'primary']]);
  K.note(lay.side, '전자라면 $k_BT=mc^2$은 약 $5.9\\times10^9$ K, 양성자라면 약 $1.1\\times10^{13}$ K이다.');
  const tile = B.tiles(lay.tiles, [ { key:'ek', label:'$\\langle E-mc^2\\rangle/k_BT$ (정확 / 입자 평균)' }, { key:'c', label:'입자당 열용량 $c/k_B$' },
    { key:'v', label:'평균 속력 $\\langle v\\rangle/c$' }, { key:'T', label:'같은 비율의 온도: 전자 / 양성자' } ]);
  const wD = B.plotBox(lay.plots, { title:'분산관계 $E(p)$와 지금 온도의 운동량 분포 (그림 25.1)', aria:'에너지와 운동량의 관계',
    legend:'<span><i style="background:var(--text)"></i>$E=\\sqrt{p^2c^2+m^2c^4}$</span><span><i class="dash"></i>$p^2/2m+mc^2$</span><span><i style="background:var(--s3)"></i>$E=pc$</span><span><i style="background:var(--s1);opacity:.4"></i>운동량 분포</span>' });
  const pD = new B.Plot(wD, { xLabel:'p / mc', yLabel:'E / mc²' });
  const wE = B.plotBox(lay.plots, { title:'평균 운동 에너지와 열용량: $\\tfrac32$에서 $3$으로', aria:'온도에 따른 평균 운동 에너지',
    legend:'<span><i style="background:var(--s1)"></i>⟨E−mc²⟩/k_BT</span><span><i style="background:var(--s3)"></i>c/k_B</span><span><i class="dash"></i>3/2, 3</span>' });
  const pE = new B.Plot(wE, { xLabel:'k_BT / mc²', onPick:x => ui.set('th', x), current:() => ui.get('th') });
  const ths = logs(0.01, 100, 70), ek = ths.map(eKin), cv = ths.map((t, i) => { const h = t * 0.02; return (eKin(t + h) - eKin(t - h)) / (2 * h); });
  let tab = jTable(ui.get('th'));
  const N = 70, P = [];
  const give = a => { const p = jSample(tab), d = randDir(), E = Efun(p); a.p = p; a.E = E; a.vx = p / E * d[0]; a.vy = p / E * d[1]; };
  for (let i = 0; i < N; i++) { const a = { x:Math.random(), y:Math.random() }; give(a); P.push(a); }
  ui.on(() => { tab = jTable(ui.get('th')); P.forEach(give); draw(); });
  function step(dt){ const sp = 0.35;
    for (const a of P) { if (Math.random() < 0.8 * dt) give(a);
      a.x += a.vx * sp * dt; a.y += a.vy * sp * dt;
      if (a.x < 0) { a.x = -a.x; a.vx = Math.abs(a.vx); } if (a.x > 1) { a.x = 2 - a.x; a.vx = -Math.abs(a.vx); }
      if (a.y < 0) { a.y = -a.y; a.vy = Math.abs(a.vy); } if (a.y > 1) { a.y = 2 - a.y; a.vy = -Math.abs(a.vy); } } }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const s = Math.min(W - 20, H - 30), ox = (W - s) / 2, oy = 8;
    ctx.strokeStyle = css('--line'); ctx.strokeRect(ox, oy, s, s);
    const c1 = css('--s1'), c2 = css('--s2'), th = ui.get('th');
    for (const a of P) { const t = Math.min(1, Math.log(a.E) / Math.log(1 + 6 * Math.max(th, 0.05)));
      K.ball(ctx, ox + a.x * s, oy + a.y * s, 4, mixCol(c1, c2, t)); }
    const ex = eKin(th), mean = P.reduce((q, a) => q + a.E - 1, 0) / N, vbar = P.reduce((q, a) => q + a.p / a.E, 0) / N;
    tile('ek', `${fmt(ex / th, 4)} / ${fmtP(mean / th, 3)}`); const h = th * 0.02;
    tile('c', fmt((eKin(th + h) - eKin(th - h)) / (2 * h), 4)); tile('v', fmt(vbar, 3), '광속을 넘지 않는다');
    tile('T', `${fmt(th * KEL.e, 3)} K / ${fmt(th * KEL.p, 3)} K`);
    const pm = Math.max(2.2, Math.sqrt((1 + 7 * th) ** 2 - 1)), xs = lin(0, pm, 160);
    const dens = xs.map(p => p * p * Math.exp(-(Efun(p) - 1) / th)), dm = Math.max(...dens) || 1;
    const ymax = Efun(pm) * 1.05, pTyp = Math.sqrt((1 + ex) ** 2 - 1);
    pD.set({ xMin:0, xMax:pm, yMin:0, yMax:ymax,
      series:[{ xs, ys:dens.map(d => d / dm * ymax * 0.35), fill:true, color:'--s1', alpha:.18 },
        { xs, ys:xs.map(p => 1 + p * p / 2), color:'--muted', dash:[6, 4], width:1.5 }, { xs, ys:xs, color:'--s3', width:1.5 }, { xs, ys:xs.map(Efun), color:'--text', width:2.4 }],
      markers:[{ x:pTyp, y:1 + ex, color:'--s2', label:'⟨E⟩' }],
      tip:p => `p = ${p.toFixed(2)} mc   E = ${Efun(p).toFixed(3)} mc²   v = ${(p / Efun(p)).toFixed(3)} c` });
    pE.set({ xMin:0.01, xMax:100, xLog:true, yMin:1, yMax:3.3, yTicks:[1.5, 2, 2.5, 3], refs:[{ y:1.5, lab:'3/2 (등분배)' }, { y:3, lab:'3' }],
      series:[{ xs:ths, ys:ek.map((v, i) => v / ths[i]), color:'--s1' }, { xs:ths, ys:cv, color:'--s3', width:1.6 }],
      markers:[{ x:th, y:ex / th, color:'--s2' }], tip:x => `k_BT/mc² = ${fmtP(x, 3)}   ⟨E−mc²⟩/k_BT = ${(eKin(x) / x).toFixed(3)}` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.relgas = { fig, play:anim.play, set(p){ if (p.th) ui.set('th', p.th); },
    read(k){ if (k === 'Te') return `${fmt(ui.get('th') * KEL.e, 4)} K (k_BT/mc² = ${fmtP(ui.get('th'), 3)})`; return null; } };
}

/* =====================================================================
 * ultra — 25.2: 분산관계 E = p^s (s=2 비상대론, s=1 초상대론). k_BT = 1, V = 1.
 *   한 입자의 에너지는 감마분포 Γ(3/s)를 따른다 (상태 밀도 p² × 볼츠만 인자).
 *   속도 v = dE/dp = s p^{s−1}. 벽에 부딪힐 때 넘겨준 운동량 2|p_x|를 모아 압력을 잰다.
 * ===================================================================== */
function simUltra(){
  const fig = document.getElementById('sim-ultra'); if (!fig) return;
  const lay = K.layout(fig, { stageH:300, aria:'상자 속 입자들이 벽에 부딪히며 압력을 만드는 모습', note:'벽에 부딪힌 자리를 잠깐 표시한다' });
  const ui = B.controls(lay.side, [
    { key:'s', label:'분산관계 $E\\propto p^s$의 지수 $s$', min:0.75, max:3, step:0.05, value:1, fmt:v => v.toFixed(2) + (Math.abs(v - 1) < 0.01 ? ' (초상대론)' : Math.abs(v - 2) < 0.01 ? ' (비상대론)' : '') },
    { key:'preset', label:'바로 고르기', type:'seg', options:[[2, '비상대론 s=2'], [1, '초상대론 s=1']], value:1 } ]);
  const [runB, resetB] = K.buttons(lay.side, [['■ 멈춤', 'primary'], ['측정 다시 시작']]);
  K.note(lay.side, '입자 200개, 부피 $V=1$, $k_BT=1$ 단위. 압력 평균이 몇 % 안으로 모이려면 20초쯤 걸린다. 입자끼리의 충돌은 무작위로 고른 입자를 같은 온도의 분포에서 다시 뽑는 것으로 흉내 냈다.');
  const tile = B.tiles(lay.tiles, [ { key:'pv', label:'$pV/Nk_BT$ 측정' }, { key:'pu', label:'$p/u$ 측정 / 예측 $s/3$' },
    { key:'E', label:'$\\langle E\\rangle/k_BT$ 측정 / 예측 $3/s$' }, { key:'g', label:'$\\gamma=1+s/3$' } ]);
  const wR = B.plotBox(lay.plots, { title:'압력과 에너지 밀도의 비 $p/u$ (선: $s/3$)', aria:'분산 지수에 따른 p/u',
    legend:'<span><i style="background:var(--s1)"></i>s/3</span><span><i class="dot" style="background:var(--s2)"></i>측정</span>' });
  const pR = new B.Plot(wR, { xLabel:'s', onPick:x => ui.set('s', Math.round(x * 20) / 20), current:() => ui.get('s') });
  const wH = B.plotBox(lay.plots, { title:'입자 에너지 분포 (막대: 측정, 선: 감마분포 $\\Gamma(3/s)$)', aria:'입자 에너지 히스토그램' });
  const pH = new B.Plot(wH, { xLabel:'E / k_BT' });
  const N = 200, P = []; let S;
  const give = a => { const s = ui.get('s'), E = randGamma(3 / s), p = Math.pow(E, 1 / s), d = randDir(), v = s * Math.pow(p, s - 1);
    a.E = E; a.p = p; a.d = d; a.v = v; };
  for (let i = 0; i < N; i++) { const a = { x:Math.random(), y:Math.random(), z:Math.random() }; give(a); P.push(a); }
  const hits = [];
  function reset(){ S = { imp:0, t:0, sE:0, nE:0, hist:new Array(40).fill(0), hn:0 }; }
  reset();
  ui.on(k => { if (k === 'preset') ui.set('s', ui.get('preset'), true); if (k === 's') ui.set('preset', Math.abs(ui.get('s') - 2) < 0.01 ? 2 : Math.abs(ui.get('s') - 1) < 0.01 ? 1 : -1, true);
    P.forEach(give); reset(); draw(); });
  resetB.addEventListener('click', () => { reset(); draw(); });
  function step(dtR){
    const dt = dtR * 0.6;
    for (const a of P) {
      if (Math.random() < 1.0 * dt) give(a);
      for (const [k, i] of [['x', 0], ['y', 1], ['z', 2]]) {
        a[k] += a.v * a.d[i] * dt;
        let guard = 0;
        while ((a[k] < 0 || a[k] > 1) && guard++ < 20) {
          if (a[k] < 0) a[k] = -a[k]; else a[k] = 2 - a[k];
          a.d[i] = -a.d[i];
          if (k === 'x') { S.imp += 2 * a.p * Math.abs(a.d[0]); if (hits.length < 60) hits.push({ y:a.y, z:a.z, side:a[k] < 0.5 ? 0 : 1, t:0.35 }); }
        }
      }
    }
    S.t += dt; S.sE += P.reduce((q, a) => q + a.E, 0); S.nE++;
    for (const a of P) { const b = Math.floor(a.E / 10 * 40); if (b >= 0 && b < 40) S.hist[b]++; S.hn++; }
    for (const h of hits) h.t -= dtR; while (hits.length && hits[0].t <= 0) hits.shift();
  }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const s = Math.min(W * 0.6, H * 0.7), ox = W / 2 - s * 0.45, oy = H * 0.86;
    const Pj = (x, y, z) => [ox + s * (x + 0.35 * z), oy - s * (y + 0.25 * z)];
    ctx.strokeStyle = css('--line'); ctx.lineWidth = 1; ctx.beginPath();
    for (const [a, b] of [[[0,0,0],[1,0,0]],[[0,1,0],[1,1,0]],[[0,0,1],[1,0,1]],[[0,1,1],[1,1,1]],[[0,0,0],[0,1,0]],[[1,0,0],[1,1,0]],[[0,0,1],[0,1,1]],[[1,0,1],[1,1,1]],[[0,0,0],[0,0,1]],[[1,0,0],[1,0,1]],[[0,1,0],[0,1,1]],[[1,1,0],[1,1,1]]]) { const p = Pj(...a), q = Pj(...b); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
    ctx.stroke();
    for (const side of [0, 1]) { const c = [Pj(side, 0, 0), Pj(side, 1, 0), Pj(side, 1, 1), Pj(side, 0, 1)];
      ctx.fillStyle = css('--s2'); ctx.globalAlpha = .06; ctx.beginPath(); c.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill(); ctx.globalAlpha = 1; }
    for (const h of hits) { const [x, y] = Pj(h.side, h.y, h.z); ctx.globalAlpha = Math.max(0, h.t / 0.35); ctx.strokeStyle = css('--s2'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const order = P.slice().sort((a, b) => b.z - a.z);
    for (const a of order) { const [x, y] = Pj(a.x, a.y, a.z); ctx.globalAlpha = 0.45 + 0.5 * (1 - a.z); K.ball(ctx, x, y, 2.5 + 2 * (1 - a.z), css('--s1')); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('주황 면: 압력을 재는 두 벽 (x = 0, 1)', 8, 6);
    const s3 = ui.get('s'), p = S.t ? S.imp / (2 * S.t) : NaN, Em = S.nE ? S.sE / S.nE / N : NaN, u = Em * N;
    tile('pv', fmt(p / N, 3), S.t ? `모은 시간 ${fmtP(S.t, 3)}` : ''); tile('pu', `${fmt(p / u, 3)} / ${fmtP(s3 / 3, 3)}`); tile('E', `${fmt(Em, 3)} / ${fmtP(3 / s3, 3)}`); tile('g', fmt(1 + s3 / 3, 4), Math.abs(s3 - 1) < .01 ? '= 4/3' : Math.abs(s3 - 2) < .01 ? '= 5/3' : '');
    const ss = lin(0.5, 3.2, 60);
    pR.set({ xMin:0.5, xMax:3.2, yMin:0, yMax:1.15, xTicks:[1, 2, 3], yTicks:[0, 1/3, 2/3, 1], yFmt:y => Math.abs(y - 1/3) < 1e-6 ? '1/3' : Math.abs(y - 2/3) < 1e-6 ? '2/3' : String(y),
      series:[{ xs:ss, ys:ss.map(x => x / 3), color:'--s1' }], refs:[{ x:1, lab:'초상대론' }, { x:2, lab:'비상대론' }],
      markers: S.t ? [{ x:s3, y:p / u, color:'--s2' }] : [], tip:x => `s = ${x.toFixed(2)}   p/u = ${(x / 3).toFixed(3)}   ⟨E⟩/k_BT = ${(3 / x).toFixed(2)}` });
    const k = 3 / s3, lg = B.kit && Math.exp(lnG(k)), xs = lin(0.125, 9.875, 40), w = 10 / 40;
    const ex = lin(0.01, 10, 150);
    pH.set({ xMin:0, xMax:10, yMin:0, yMax:Math.max(...ex.map(E => Math.pow(E, k - 1) * Math.exp(-E) / lg)) * 1.25, yTicks:[0],
      series:[{ xs, ys:S.hist.map(c => S.hn ? c / (S.hn * w) : 0), bars:true, w, color:'--s1', alpha:.35 }, { xs:ex, ys:ex.map(E => Math.pow(E, k - 1) * Math.exp(-E) / lg), color:'--s1' }],
      tip:E => `E = ${E.toFixed(2)} k_BT` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.ultra = { fig, play:anim.play, set(p){ if (p.s) ui.set('s', p.s); },
    read(k){ if (k !== 'pu' || !S.t) return null; const p = S.imp / (2 * S.t), u = S.sE / S.nE; return `${fmt(p / u, 3)} (s = ${ui.get('s').toFixed(2)}, 모은 시간 ${fmtP(S.t, 3)})`; } };
}
function lnG(x){ const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lnG(1 - x);
  x -= 1; let a = c[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += c[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a); }

/* =====================================================================
 * expand — 25.3: 상자의 벽이 천천히 물러난다. 왼쪽은 초상대론(E = pc, c = 1), 오른쪽은 비상대론(E = p²/2m, m = 1).
 *   반사는 움직이는 벽에 대한 정확한 규칙: 비상대론 v' = 2u − v, 초상대론은 로런츠 변환으로 반사.
 *   입자끼리의 충돌은 에너지를 바꾸지 않고 방향만 섞는 것으로 흉내 냈다(열원 없음 → 단열).
 * ===================================================================== */
function simExpand(){
  const fig = document.getElementById('sim-expand'); if (!fig) return;
  const lay = K.layout(fig, { stageH:300, aria:'벽이 물러나며 커지는 두 상자 속 기체', note:'왼쪽: 초상대론 · 오른쪽: 비상대론 (같은 팽창)' });
  const ui = B.controls(lay.side, [
    { key:'amax', label:'최종 축척인자 $a_{\\max}=L/L_0$', min:1.1, max:4, value:3, fmt:v => v.toFixed(2) + ` (부피 ${(v ** 3).toFixed(1)}배)` },
    { key:'w', label:'벽 속도 (광속 단위)', type:'seg', options:[[0.005, '느리게'], [0.015, '보통'], [0.05, '빠르게']], value:0.015 } ]);
  const [runB, resetB] = K.buttons(lay.side, [['■ 멈춤', 'primary'], ['처음부터']]);
  K.note(lay.side, '열원이 없으므로 단열 팽창이다. 벽이 입자보다 훨씬 느릴수록(‘느리게’) 교재의 준정적 결과에 가깝다.');
  const tile = B.tiles(lay.tiles, [ { key:'a', label:'축척인자 $a=L/L_0$' }, { key:'tu', label:'초상대론 $T/T_0$ 측정 / $a^{-1}$' },
    { key:'tn', label:'비상대론 $T/T_0$ 측정 / $a^{-2}$' }, { key:'vt', label:'$VT^3$ (초상대론) / $VT^{3/2}$ (비상대론), 처음 값 기준' } ]);
  const wT = B.plotBox(lay.plots, { title:'온도와 축척인자 (로그-로그, 점선 기울기 −1, −2)', aria:'축척인자에 따른 온도',
    legend:'<span><i class="dot" style="background:var(--s2)"></i>초상대론</span><span><i class="dot" style="background:var(--s1)"></i>비상대론</span><span><i class="dash"></i>a⁻¹, a⁻²</span>' });
  const pT = new B.Plot(wT, { xLabel:'a', yLabel:'T/T₀' });
  const wS = B.plotBox(lay.plots, { title:'단열 불변량: $VT^3$, $VT^{3/2}$ (식 25.22, 25.26)', aria:'단열 불변량' });
  const pS = new B.Plot(wS, { xLabel:'a' });
  const N = 150; let A, S;
  function init(){
    A = { u:[], n:[] }; S = { L:1, hist:[] };
    for (let i = 0; i < N; i++) {
      const d = randDir(), E = randGamma(3);          // 초상대론: E ~ Γ(3), k_BT0 = 1
      A.u.push({ x:Math.random() - .5, y:Math.random() - .5, z:Math.random() - .5, p:[E * d[0], E * d[1], E * d[2]] });
      A.n.push({ x:Math.random() - .5, y:Math.random() - .5, z:Math.random() - .5, p:[g(), g(), g()] });   // 비상대론: m = 1, k_BT0 = 1
    }
  }
  init();
  ui.on(k => { if (k === 'amax') { if (S.L > ui.get('amax')) init(); } draw(); });
  resetB.addEventListener('click', () => { init(); draw(); });
  const temp = (arr, rel) => rel ? arr.reduce((q, a) => q + Math.hypot(...a.p), 0) / arr.length / 3 : arr.reduce((q, a) => q + (a.p[0] ** 2 + a.p[1] ** 2 + a.p[2] ** 2) / 2, 0) / arr.length * 2 / 3;
  function reflect(a, i, sign, w, rel){   // 벽 법선 방향 sign(±1), 벽은 바깥쪽으로 속도 w
    if (rel) { const E = Math.hypot(...a.p), pn = sign * a.p[i], gm = 1 / Math.sqrt(1 - w * w);
      const Es = gm * (E - w * pn), pns = gm * (pn - w * E);       // 벽과 함께 움직이는 틀
      const pn2 = gm * (-pns + w * Es);                            // 반사 후 되돌림
      a.p[i] = sign * pn2;
    } else { const vn = sign * a.p[i]; a.p[i] = sign * (2 * w - vn); }
  }
  function step(dtR){
    const w = ui.get('w'), amax = ui.get('amax'), dt = 0.02, n = Math.round(dtR / 0.016 * 6);
    for (let k = 0; k < n; k++) {
      const growing = S.L < amax, wv = growing ? w : 0;
      if (growing) S.L = Math.min(amax, S.L + 2 * w * dt);
      const h = S.L / 2;
      for (const [arr, rel] of [[A.u, true], [A.n, false]]) for (const a of arr) {
        const E = rel ? Math.hypot(...a.p) : 0;
        const vel = rel ? a.p.map(q => q / E) : a.p;
        a.x += vel[0] * dt; a.y += vel[1] * dt; a.z += vel[2] * dt;
        for (const [key, i] of [['x', 0], ['y', 1], ['z', 2]]) {
          if (a[key] > h && vel[i] > wv) { reflect(a, i, 1, wv, rel); a[key] = 2 * h - a[key]; }
          else if (a[key] < -h && vel[i] < -wv) { reflect(a, i, -1, wv, rel); a[key] = -2 * h - a[key]; }
          a[key] = Math.max(-h, Math.min(h, a[key]));
        }
        if (Math.random() < 0.3 * dt) { const m = Math.hypot(...a.p), d = randDir(); a.p = d.map(q => q * m); }   // 방향만 섞기
      }
      if (!S.hist.length || S.L - S.hist[S.hist.length - 1][0] > 0.01 || (!growing && S.hist.length && S.hist[S.hist.length - 1][0] !== S.L))
        S.hist.push([S.L, temp(A.u, true), temp(A.n, false)]);
    }
  }
  function drawBox(ctx, arr, cx, cy, size, col){
    const h = S.L / 2, sc = size / (2 * 4 / 2) ;
    const P = (x, y, z) => [cx + sc * (x + 0.3 * z), cy - sc * (y + 0.22 * z)];
    ctx.strokeStyle = css('--line'); ctx.lineWidth = 1; ctx.beginPath();
    const c = [-h, h];
    const corner = []; for (const x of c) for (const y of c) for (const z of c) corner.push([x, y, z]);
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const d = corner[i].reduce((s, v, k) => s + (v !== corner[j][k] ? 1 : 0), 0); if (d === 1) { const p = P(...corner[i]), q = P(...corner[j]); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); } }
    ctx.stroke();
    for (const a of arr) { const [x, y] = P(a.x, a.y, a.z); K.ball(ctx, x, y, 2.6, col); }
  }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const size = Math.min(W / 2, H) * 0.95;
    drawBox(ctx, A.u, W * 0.25, H * 0.55, size, css('--s2')); drawBox(ctx, A.n, W * 0.75, H * 0.55, size, css('--s1'));
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('초상대론 E = pc', W * 0.25, 6); ctx.fillText('비상대론 E = p²/2m', W * 0.75, 6);
    const tu = temp(A.u, true), tn = temp(A.n, false), a = S.L, t0 = S.hist.length ? S.hist[0] : [1, tu, tn];
    tile('a', fmt(a, 3), S.L < ui.get('amax') ? '팽창 중' : '멈춤');
    tile('tu', `${fmt(tu / t0[1], 3)} / ${fmtP(1 / a, 3)}`); tile('tn', `${fmt(tn / t0[2], 3)} / ${fmtP(1 / a ** 2, 3)}`);
    tile('vt', `${fmt(a ** 3 * (tu / t0[1]) ** 3, 3)} / ${fmt(a ** 3 * (tn / t0[2]) ** 1.5, 3)}`);
    const hs = S.hist, am = Math.max(1.5, ui.get('amax') * 1.05);
    pT.set({ xMin:1, xMax:am, xLog:true, yMin:Math.min(0.05, 1 / am ** 2 * 0.8), yMax:1.3, yLog:true, xTicks:[1, 1.5, 2, 3, 4].filter(v => v <= am),
      refs:[{ fn:x => 1 / x, lab:'a⁻¹' }, { fn:x => 1 / (x * x), lab:'a⁻²' }],
      series:[{ xs:hs.map(h => h[0]), ys:hs.map(h => h[1] / t0[1]), pts:true, r:2.2, color:'--s2' }, { xs:hs.map(h => h[0]), ys:hs.map(h => h[2] / t0[2]), pts:true, r:2.2, color:'--s1' }] });
    pS.set({ xMin:1, xMax:am, yMin:0, yMax:2, yTicks:[0, 0.5, 1, 1.5, 2], refs:[{ y:1, lab:'처음 값' }],
      series:[{ xs:hs.map(h => h[0]), ys:hs.map(h => h[0] ** 3 * (h[1] / t0[1]) ** 3), color:'--s2' }, { xs:hs.map(h => h[0]), ys:hs.map(h => h[0] ** 3 * (h[2] / t0[2]) ** 1.5), color:'--s1' }] });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.expand = { fig, play:anim.play, set(p){ init(); if (p.amax) ui.set('amax', p.amax); if (p.w) ui.set('w', p.w); draw(); },
    read(k){ const t0 = S.hist.length ? S.hist[0] : null; if (!t0 || k !== 'tu') return null;
      return `${fmt(temp(A.u, true) / t0[1], 3)} (a = ${fmtP(S.L, 3)}${S.L < ui.get('amax') ? ', 아직 팽창 중' : ''})`; } };
}

/* =====================================================================
 * cosmos — 예제 25.2: 우주 팽창 시나리오. 오늘 a = 1, 우주 배경 복사 온도 2.7 K(교재 23.7절).
 *   복사 에너지 밀도 ∝ a⁻⁴, 물질(비상대론) 밀도 ∝ a⁻³.  오늘의 비 ρ_rad/ρ_mat = r0 는 조절 가능.
 * ===================================================================== */
function simCosmos(){
  const fig = document.getElementById('sim-cosmos'); if (!fig) return;
  const lay = K.layout(fig, { stageH:260, aria:'팽창하는 우주에서 늘어나는 빛의 파장과 물질 입자', note:'같은 공동 부피를 그렸다 · 빛의 파장은 a에 비례' });
  const ui = B.controls(lay.side, [
    { key:'a', label:'축척인자 $a$ (오늘 = 1)', min:1e-5, max:1, value:1e-3, log:true, fmt:v => fmtP(v, 2) },
    { key:'r0', label:'오늘의 밀도 비 $\\rho_{\\rm rad}/\\rho_{\\rm mat}$', min:1e-5, max:1e-2, value:1 / 3400, log:true, fmt:v => fmtP(v, 2) } ]);
  const [runB, playB] = K.buttons(lay.side, [['■ 멈춤', 'primary'], ['▶ 팽창 자동 재생']]);
  K.note(lay.side, '기본값 1/3400은 관측으로 알려진 크기 정도로 넣은 예시다(값 확인 필요). 이 값을 바꿔도 기울기 −3, −4는 바뀌지 않는다.');
  const tile = B.tiles(lay.tiles, [ { key:'T', label:'복사 온도 $T=2.7\\,\\mathrm K/a$' }, { key:'r', label:'$\\rho_{\\rm rad}/\\rho_{\\rm mat}=r_0/a$' },
    { key:'dom', label:'우세한 성분' }, { key:'eq', label:'두 밀도가 같아지는 $a_{\\rm eq}=r_0$' } ]);
  const wR = B.plotBox(lay.plots, { title:'에너지 밀도와 축척인자 (오늘 물질 밀도 = 1)', aria:'축척인자에 따른 복사와 물질의 밀도',
    legend:'<span><i style="background:var(--s2)"></i>복사 ∝ a⁻⁴</span><span><i style="background:var(--s1)"></i>물질 ∝ a⁻³</span>' });
  const pR = new B.Plot(wR, { xLabel:'a', xLog:true, yLog:true, onPick:x => ui.set('a', x), current:() => ui.get('a') });
  const wT = B.plotBox(lay.plots, { title:'복사 온도 $T\\propto a^{-1}$ (식 25.25)와 따로 식는 비상대론 기체 $\\propto a^{-2}$ (식 25.27)', aria:'축척인자에 따른 온도',
    legend:'<span><i style="background:var(--s2)"></i>복사</span><span><i style="background:var(--s1)"></i>비상대론 기체 (a = 10⁻³에서 같은 온도로 출발)</span>' });
  const pT = new B.Plot(wT, { xLabel:'a', xLog:true, yLog:true, onPick:x => ui.set('a', x), current:() => ui.get('a') });
  const PH = [], MA = [];
  for (let i = 0; i < 26; i++) PH.push({ x:Math.random(), y:Math.random(), d:Math.random() * 2 * Math.PI });
  for (let i = 0; i < 26; i++) MA.push({ x:Math.random(), y:Math.random(), vx:(Math.random() - .5) * .04, vy:(Math.random() - .5) * .04 });
  let auto = false;
  playB.addEventListener('click', () => { auto = !auto; playB.textContent = auto ? '■ 자동 재생 멈춤' : '▶ 팽창 자동 재생'; if (auto && ui.get('a') > 0.5) ui.set('a', 1e-5); });
  function step(dt){
    if (auto) { const la = Math.log10(ui.get('a')) + dt * 0.5; if (la >= 0) { auto = false; playB.textContent = '▶ 팽창 자동 재생'; } ui.set('a', Math.pow(10, Math.min(0, la))); }
    for (const p of PH) { p.x = (p.x + 0.08 * Math.cos(p.d) * dt + 1) % 1; p.y = (p.y + 0.08 * Math.sin(p.d) * dt + 1) % 1; }
    for (const m of MA) { m.x = (m.x + m.vx * dt + 1) % 1; m.y = (m.y + m.vy * dt + 1) % 1; }
  }
  function wl2col(t){ const c1 = css('--s1'), c2 = css('--bad'); return mixCol(c1, c2, Math.max(0, Math.min(1, t))); }
  function draw(){
    const { ctx, W, H } = B.setupCanvas(lay.cv); ctx.clearRect(0, 0, W, H);
    const a = ui.get('a'), r0 = ui.get('r0'), la = Math.log10(a);
    const lam = 4 + 26 * (la + 5) / 5, t = (la + 5) / 5;
    for (const m of MA) K.ball(ctx, m.x * W, 20 + m.y * (H - 40), 4, css('--text-2'));
    ctx.lineWidth = 1.6;
    for (const p of PH) { const x0 = p.x * W, y0 = 20 + p.y * (H - 40), L = 34, ux = Math.cos(p.d), uy = Math.sin(p.d);
      ctx.strokeStyle = wl2col(t); ctx.beginPath();
      for (let s = 0; s <= L; s += 1) { const off = 4 * Math.sin(2 * Math.PI * s / lam); const x = x0 + ux * s - uy * off, y = y0 + uy * s + ux * off; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); }
    ctx.fillStyle = css('--text-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`a = ${fmtP(a, 2)}  ·  파동: 빛(파장 ∝ a)  ·  회색 점: 물질 입자`, 8, 4);
    const T = 2.7 / a, ratio = r0 / a;
    tile('T', `${fmt(T, 3)} K`); tile('r', fmt(ratio, 3)); tile('dom', ratio > 1 ? '복사 우세' : '물질 우세'); tile('eq', fmt(r0, 3), `그때 T = ${fmtP(2.7 / r0, 3)} K`);
    const xs = logs(1e-5, 1, 80);
    pR.set({ xMin:1e-5, xMax:1, xLog:true, yLog:true, yMin:0.5, yMax:Math.max(1e16, r0 * 1e20),
      series:[{ xs, ys:xs.map(x => r0 / x ** 4), color:'--s2' }, { xs, ys:xs.map(x => 1 / x ** 3), color:'--s1' }],
      refs:[{ x:r0, lab:'a_eq' }], markers:[{ x:a, y:Math.max(r0 / a ** 4, 1 / a ** 3), color:'--s2' }],
      tip:x => `a = ${fmtP(x, 2)}   복사/물질 = ${fmtP(r0 / x, 3)}` });
    pT.set({ xMin:1e-5, xMax:1, xLog:true, yLog:true, yMin:1e-3, yMax:1e6,
      series:[{ xs, ys:xs.map(x => 2.7 / x), color:'--s2' }, { xs:xs.filter(x => x >= 1e-3), ys:xs.filter(x => x >= 1e-3).map(x => 2.7e3 * (1e-3 / x) ** 2), color:'--s1' }],
      markers:[{ x:a, y:2.7 / a, color:'--s2' }], tip:x => `a = ${fmtP(x, 2)}   T_복사 = ${fmtP(2.7 / x, 3)} K` });
  }
  const anim = B.animate(fig, dt => { step(dt); draw(); }); anim.bindButton(runB); ui.on(() => draw()); B.onTheme(draw); B.onResize(draw); draw();
  B.sims.cosmos = { fig, play:anim.play, set(p){ if (p.r0) ui.set('r0', p.r0); if (p.a) ui.set('a', p.a); draw(); },
    read(k){ if (k === 'T') return `${fmt(2.7 / ui.get('a'), 4)} K (a = ${fmtP(ui.get('a'), 3)})`; if (k === 'aeq') return `${fmt(ui.get('r0'), 4)}`; return null; } };
}

B.ready(() => { simRelgas(); simUltra(); simExpand(); simCosmos(); });
})();
