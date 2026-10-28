/* =====================================================================
 * book.js — 통계역학 학습서 공통 코드 (모든 장·절 페이지가 공유)
 *   1. 목차 데이터와 경로          5. 위치 링크·확인 필요 표시
 *   2. 테마·언어                   6. 예상하기(시뮬레이션 세 줄 안내)
 *   3. 사이드바·서랍·이전/다음     7. 손으로 풀기 채점
 *   4. 진술 배지                   8. 기존 데모 끼워 넣기
 *   9. 그래프(Plot): 누르면 그 x값으로 매개변수가 이동 — 모든 그래프 공통
 *  10. 시뮬레이션 도구(조작부, 애니메이션, 난수, 숫자 형식)
 * 페이지는 <body data-root="../" data-page="19.1"> 처럼 위치를 알려 준다.
 * ===================================================================== */
(function(){
'use strict';
const Book = window.Book = window.Book || {};

/* ---------------------------------------------------------------------
 * 1. 목차 데이터 (교재 한국어판 장 첫 쪽 여백 목차와 같은 표기)
 * ------------------------------------------------------------------- */
const TOC = [
  { ch:19, t:'에너지 등분배', p:'271–282', ready:true, secs:[
      ['19.1','등분배 정리','271–275'], ['19.2','응용','275–278'], ['19.3','사용된 가정','278–280'], ['19.4','브라운 운동','280–281'] ] },
  { ch:20, t:'분배 함수', p:'283–300', secs:[
      ['20.1','분배 함수 쓰기'], ['20.2','상태 함수 구하기'], ['20.3','빅 아이디어'], ['20.4','분배 함수 통합'] ] },
  { ch:21, t:'이상기체의 통계역학', p:'301–314', secs:[
      ['21.1','상태 밀도'], ['21.2','양자 농도'], ['21.3','구별가능'], ['21.4','이상기체의 상태 함수'], ['21.5','깁스 패러독스'], ['21.6','이원자 기체의 열용량'] ] },
  { ch:22, t:'화학 퍼텐셜', p:'315–339', secs:[
      ['22.1','화학 퍼텐셜의 정의'], ['22.2','화학 퍼텐셜의 의미'], ['22.3','큰분배함수'], ['22.4','큰퍼텐셜'], ['22.5','입자당 깁스 함수로서의 화학 퍼텐셜'],
      ['22.6','다양한 종류의 입자들'], ['22.7','입자 개수 보존 법칙'], ['22.8','화학 퍼텐셜과 화학 반응'], ['22.9','삼투현상'] ] },
  { ch:23, t:'광자', p:'340–361', secs:[
      ['23.1','전자기 복사의 고전 열역학'], ['23.2','스펙트럼 에너지 밀도'], ['23.3','키르히호프 법칙'], ['23.4','복사 압력'],
      ['23.5','광자 기체의 통계역학'], ['23.6','흑체 분포'], ['23.7','우주 배경복사'], ['23.8','아인슈타인 A와 B 계수'] ] },
  { ch:24, t:'포논', p:'362–372', secs:[
      ['24.1','아인슈타인 모델'], ['24.2','데바이 모델'], ['24.3','포논 분산'] ] }
];
Book.TOC = TOC;
const body = document.body || document.documentElement;
const ROOT = () => (document.body && document.body.dataset.root) || '';
const PAGE = () => (document.body && document.body.dataset.page) || '';
/* 페이지 id → 상대 경로.  'ch19' → ch19/index.html,  '19.2' → ch19/19-2.html */
function pathOf(id){
  if (id === 'toc') return 'toc.html';
  const m = /^ch(\d+)$/.exec(id); if (m) return `ch${m[1]}/index.html`;
  const ch = id.split('.')[0]; return `ch${ch}/${id.replace('.', '-')}.html`;
}
Book.href = (id, hash) => ROOT() + pathOf(id) + (hash ? '#' + hash : '');
const SEQ = []; const INFO = {};
for (const c of TOC) {
  SEQ.push('ch' + c.ch); INFO['ch' + c.ch] = { no: c.ch + '장', t: c.t, ready: !!c.ready, ch: c.ch };
  for (const s of c.secs) { SEQ.push(s[0]); INFO[s[0]] = { no: s[0], t: s[1], ready: !!c.ready, ch: c.ch, p: s[2] }; }
}
Book.SEQ = SEQ; Book.INFO = INFO;

/* ---------------------------------------------------------------------
 * 2. 테마 · 언어 (기존 데모와 같은 localStorage 키를 써서 사이트 전체가 따라간다)
 * ------------------------------------------------------------------- */
const LS_THEME = 'statphys2-theme', LS_LANG = 'statphys2-lang';
const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
                set(k, v){ try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch(e){} } };
function applyTheme(t){
  const el = document.documentElement;
  if (t === 'light' || t === 'dark') el.dataset.theme = t; else delete el.dataset.theme;
}
applyTheme(store.get(LS_THEME));            // 첫 그림 전에 적용 (head에서 바로 실행)
Book.theme = () => { const t = document.documentElement.dataset.theme;
  if (t) return t; return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; };
Book.lang = () => { const l = store.get(LS_LANG); return (l === 'en' || l === 'both' || l === 'ko') ? l : 'ko'; };
const themeListeners = [];
Book.onTheme = fn => themeListeners.push(fn);
function fireTheme(){ themeListeners.forEach(f => { try { f(); } catch(e){ console.error(e); } }); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fireTheme);

/* ---------------------------------------------------------------------
 * 3. 사이드바 · 서랍 · 이전/다음
 * ------------------------------------------------------------------- */
const ICON_CHEV = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_MENU = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function buildShell(){
  const page = PAGE(); if (!page) return;
  document.body.classList.add('bk-shell');
  const curCh = INFO[page] ? INFO[page].ch : null;
  let openSet; try { openSet = new Set(JSON.parse(sessionStorage.getItem('bk-open') || '[]')); } catch(e){ openSet = new Set(); }
  if (curCh) openSet.add(curCh);
  const tree = TOC.map(c => {
    const cid = 'ch' + c.ch, open = openSet.has(c.ch);
    const cur = page === cid ? ' aria-current="page"' : '';
    const soon = c.ready ? '' : '<span class="soon">작성 예정</span>';
    const kids = c.secs.map(s => `<li><div class="bk-row"><a href="${esc(Book.href(s[0]))}"${page === s[0] ? ' aria-current="page"' : ''} data-id="${s[0]}"><span class="no">${s[0]}</span><span class="tt">${esc(s[1])}</span></a></div></li>`).join('');
    return `<li><div class="bk-row ch"><button class="bk-tog" type="button" aria-expanded="${open}" aria-controls="bk-sub-${c.ch}" aria-label="${c.ch}장 절 목록 ${open ? '접기' : '펼치기'}" data-ch="${c.ch}">${ICON_CHEV}</button>`
      + `<a href="${esc(Book.href(cid))}"${cur} data-id="${cid}"><span class="no">${c.ch}</span><span class="tt">${esc(c.t)}</span>${soon}</a></div>`
      + `<ul id="bk-sub-${c.ch}"${open ? '' : ' hidden'}>${kids}</ul></li>`;
  }).join('');
  const side = document.createElement('nav');
  side.className = 'bk-side'; side.id = 'bk-side'; side.setAttribute('aria-label', '장·절 목차');
  side.innerHTML = `<div class="bk-side-head"><a class="bk-brand" href="${esc(Book.href('ch19'))}">통계역학 학습서<small>Blundell &amp; Blundell 19–24장 · 열및통계물리2</small></a></div>
    <div class="bk-side-scroll"><ul class="bk-tree" role="list">${tree}</ul></div>
    <div class="bk-side-foot">
      <a class="toc" href="${esc(Book.href('toc'))}"${page === 'toc' ? ' aria-current="page"' : ''}>전체 목차 · 데모 · 노트북</a>
      <p class="bk-seg-label" id="bk-theme-l">화면</p>
      <div class="bk-seg" role="group" aria-labelledby="bk-theme-l" id="bk-theme">
        <button type="button" data-v="">시스템</button><button type="button" data-v="light">밝게</button><button type="button" data-v="dark">어둡게</button></div>
      <p class="bk-seg-label" id="bk-lang-l">언어 (데모에도 적용)</p>
      <div class="bk-seg" role="group" aria-labelledby="bk-lang-l" id="bk-lang">
        <button type="button" data-v="ko">한국어</button><button type="button" data-v="en">English</button><button type="button" data-v="both">한·EN</button></div>
    </div>`;
  const top = document.createElement('div');
  top.className = 'bk-topbar';
  const curInfo = INFO[page];
  top.innerHTML = `<button type="button" id="bk-open" aria-controls="bk-side" aria-expanded="false">${ICON_MENU}<span>목차</span></button>`
    + `<span class="cur">${curInfo ? esc(curInfo.no + ' ' + curInfo.t) : (page === 'toc' ? '전체 목차' : '')}</span>`;
  const scrim = document.createElement('div'); scrim.className = 'bk-scrim';
  const skip = document.createElement('a'); skip.className = 'bk-skip'; skip.href = '#main'; skip.textContent = '본문으로 건너뛰기';
  document.body.prepend(skip, top, side, scrim);

  /* 펼치기·접기 */
  side.addEventListener('click', e => {
    const b = e.target.closest('.bk-tog'); if (!b) return;
    const ul = document.getElementById(b.getAttribute('aria-controls'));
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open)); ul.hidden = !open;
    b.setAttribute('aria-label', `${b.dataset.ch}장 절 목록 ${open ? '접기' : '펼치기'}`);
    const ch = +b.dataset.ch; open ? openSet.add(ch) : openSet.delete(ch);
    try { sessionStorage.setItem('bk-open', JSON.stringify([...openSet])); } catch(e){}
  });
  /* 트리 키보드: ↑↓ 이동, → 펼치기, ← 접기/부모로 */
  side.querySelector('.bk-tree').addEventListener('keydown', e => {
    const items = [...side.querySelectorAll('.bk-tree a')].filter(a => a.offsetParent !== null);
    const i = items.indexOf(document.activeElement); if (i < 0) return;
    const row = items[i].closest('.bk-row'), tog = row.querySelector('.bk-tog');
    if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[i]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[i]).focus(); }
    else if (e.key === 'ArrowRight' && tog && tog.getAttribute('aria-expanded') === 'false') { e.preventDefault(); tog.click(); }
    else if (e.key === 'ArrowLeft') {
      if (tog && tog.getAttribute('aria-expanded') === 'true') { e.preventDefault(); tog.click(); }
      else if (!tog) { const p = row.closest('ul').closest('li'); if (p) { e.preventDefault(); p.querySelector('a').focus(); } }
    }
  });
  /* 서랍 (휴대폰) */
  const openBtn = top.querySelector('#bk-open');
  const setDrawer = open => {
    document.body.classList.toggle('bk-drawer-open', open);
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) { const a = side.querySelector('[aria-current="page"]') || side.querySelector('a'); a && a.focus(); }
    else openBtn.focus({ preventScroll: true });
  };
  openBtn.addEventListener('click', () => setDrawer(true));
  scrim.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('bk-drawer-open')) setDrawer(false); });
  side.addEventListener('click', e => { if (e.target.closest('a') && document.body.classList.contains('bk-drawer-open')) document.body.classList.remove('bk-drawer-open'); });
  /* 현재 항목이 보이도록 */
  const cur = side.querySelector('[aria-current="page"]');
  if (cur) { const sc = side.querySelector('.bk-side-scroll'); const r = cur.getBoundingClientRect(); if (r.bottom > innerHeight - 160) sc.scrollTop = r.top - 160; }
  /* 테마 · 언어 */
  const themeSeg = side.querySelector('#bk-theme'), langSeg = side.querySelector('#bk-lang');
  const markSeg = (seg, v) => seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  markSeg(themeSeg, store.get(LS_THEME) || '');
  themeSeg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    store.set(LS_THEME, b.dataset.v || null); applyTheme(b.dataset.v); markSeg(themeSeg, b.dataset.v); fireTheme(); syncEmbeds(); });
  markSeg(langSeg, Book.lang());
  langSeg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    store.set(LS_LANG, b.dataset.v); markSeg(langSeg, b.dataset.v); showLangNote(); syncEmbeds(true); });
}
function showLangNote(){
  const n = document.querySelector('.bk-lang-note'); if (!n) return;
  n.hidden = Book.lang() === 'ko';
}
function buildPager(){
  const page = PAGE(), main = document.getElementById('main');
  const i = SEQ.indexOf(page); if (i < 0 || !main) return;
  const lab = id => { const f = INFO[id]; return f ? (id.startsWith('ch') ? `${f.no} 머릿글 · ${f.t}` : `${f.no} ${f.t}`) : id; };
  const prev = SEQ[i - 1], next = SEQ[i + 1];
  const nav = document.createElement('nav'); nav.className = 'bk-pager'; nav.setAttribute('aria-label', '이전·다음');
  nav.innerHTML = (prev ? `<a class="prev" href="${esc(Book.href(prev))}" rel="prev"><small>← 이전 ([)</small><span>${esc(lab(prev))}</span></a>` : '<span></span>')
    + (next ? `<a class="next" href="${esc(Book.href(next))}" rel="next"><small>다음 (]) →</small><span>${esc(lab(next))}</span></a>` : '');
  main.appendChild(nav);
  const foot = document.createElement('footer'); foot.className = 'bk-foot';
  foot.innerHTML = '교재: S. J. Blundell &amp; K. M. Blundell, <i>Concepts in Thermal Physics</i> 2판, 한국어 번역판. 쪽수는 한국어판 기준. 설명 문장은 모두 이 학습서에서 새로 썼다. '
    + '키보드: <kbd>[</kbd> 이전 · <kbd>]</kbd> 다음 · 목차에서 <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>. 수식: KaTeX.';
  main.appendChild(foot);
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target; if (t && (t.closest('input, textarea, select, [contenteditable="true"]'))) return;
    if (e.key === '[' && prev) location.href = Book.href(prev);
    if (e.key === ']' && next) location.href = Book.href(next);
  });
}

/* ---------------------------------------------------------------------
 * 4. 진술 배지
 *    <div class="claim" data-k="approx" data-cond="$k_BT\gg\hbar\omega$">…</div>
 *    data-k: def | axiom | model | approx | ansatz | cite | derived | exp
 *    approx → data-cond 필수,  cite → data-ref(+data-ref-label) 또는 data-ext 필수,
 *    exp → data-src 필수
 * ------------------------------------------------------------------- */
const KINDS = {
  def:    { l:'정의',            g:'≡', d:'이름을 붙이는 약속이다. 증명할 대상이 아니다.' },
  axiom:  { l:'기본 가정(공리)', g:'◆', d:'이 이론의 논리가 여기서 시작한다. 증명하지 않고 받아들인다.' },
  model:  { l:'모형 가정',       g:'□', d:'이 계를 단순하게 만들려고 고른 설정이다. 실제 계와 다를 수 있다.' },
  approx: { l:'근사',            g:'≈', d:'적힌 조건에서만 맞는다. 조건이 깨지면 결과도 믿을 수 없다.' },
  ansatz: { l:'시도해',          g:'?', d:'해의 꼴을 먼저 가정하고, 대입해서 맞는지 확인한다.' },
  cite:   { l:'앞 결과 인용',    g:'↩', d:'이미 증명된 결과를 가져온다. 옆의 위치 표시를 눌러 원래 자리로 갈 수 있다.' },
  derived:{ l:'유도 결과',       g:'∴', d:'위의 정의·가정·인용으로부터 이 절에서 증명한 것이다.' },
  exp:    { l:'실험 사실',       g:'◉', d:'측정으로 아는 것이다. 출처를 함께 적는다.' }
};
Book.KINDS = KINDS;
let pop;
function popEl(){ if (!pop) { pop = document.createElement('div'); pop.className = 'bk-pop'; pop.id = 'bk-pop'; pop.setAttribute('role', 'tooltip'); pop.hidden = true; document.body.appendChild(pop); } return pop; }
let popOwner = null, popPinned = false;
function showPop(owner, html){
  const p = popEl(); p.innerHTML = html; renderMath(p); p.hidden = false; popOwner = owner;
  owner.setAttribute('aria-describedby', 'bk-pop');
  const r = owner.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight;
  let x = r.left + scrollX, y = r.bottom + scrollY + 6;
  x = Math.max(scrollX + 8, Math.min(x, scrollX + document.documentElement.clientWidth - pw - 8));
  if (r.bottom + ph + 12 > innerHeight && r.top > ph + 12) y = r.top + scrollY - ph - 6;
  p.style.left = x + 'px'; p.style.top = y + 'px';
}
function hidePop(force){ if (popPinned && !force) return; if (pop) pop.hidden = true; if (popOwner) popOwner.removeAttribute('aria-describedby'); popOwner = null; popPinned = false; }
function popTarget(el){
  el.addEventListener('mouseenter', () => { if (!popPinned) showPop(el, el._pop()); });
  el.addEventListener('mouseleave', () => hidePop());
  el.addEventListener('focus', () => { if (!popPinned) showPop(el, el._pop()); });
  el.addEventListener('blur', () => hidePop(true));
  el.addEventListener('click', e => { if (el.tagName !== 'A') e.preventDefault();
    if (popPinned && popOwner === el) { hidePop(true); return; } popPinned = false; showPop(el, el._pop()); popPinned = true; });
  el.addEventListener('keydown', e => { if (e.key === 'Escape') hidePop(true);
    if ((e.key === 'Enter' || e.key === ' ') && el.tagName !== 'BUTTON' && el.tagName !== 'A') { e.preventDefault(); el.click(); } });
}
document.addEventListener('click', e => { if (popPinned && popOwner && !popOwner.contains(e.target) && !(pop && pop.contains(e.target))) hidePop(true); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') hidePop(true); });

function locHTML(el){
  if (el.dataset.ref) return `<a class="loc" href="${esc(el.dataset.ref)}">[${esc(el.dataset.refLabel || el.dataset.ref)}]</a>`;
  if (el.dataset.ext) return `<span class="loc ext" tabindex="0" role="button" data-note="${esc(el.dataset.note || '')}">[${esc(el.dataset.ext)}]</span>`;
  return '';
}
function decorateClaims(root){
  root.querySelectorAll('[data-k]:not(.bk-badge)').forEach(el => {
    if (el.dataset.kDone) return; el.dataset.kDone = '1';
    const k = KINDS[el.dataset.k]; if (!k) { console.warn('알 수 없는 배지', el.dataset.k, el); return; }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'bk-badge'; b.dataset.k = el.dataset.k;
    b.innerHTML = `<span class="g" aria-hidden="true">${k.g}</span>${k.l}`;
    b.setAttribute('aria-label', `진술 성격: ${k.l}. 눌러서 뜻 보기`);
    let extra = '';
    if (el.dataset.k === 'approx' && el.dataset.cond) extra += `<span class="bk-cond">${el.dataset.cond}</span>`;
    if (el.dataset.k === 'cite') extra += locHTML(el);
    if (el.dataset.k === 'exp' && el.dataset.src) extra += `<span class="bk-src">${el.dataset.src}</span>`;
    b._pop = () => `<b>${k.g} ${k.l}</b>${k.d}` + (el.dataset.k === 'approx' && el.dataset.cond ? `<br>성립 조건: ${el.dataset.cond}` : '')
      + (el.dataset.k === 'cite' ? `<br>위치: ${esc(el.dataset.refLabel || el.dataset.ext || '')}` : '')
      + (el.dataset.k === 'exp' && el.dataset.src ? `<br>출처: ${el.dataset.src}` : '');
    popTarget(b);
    const inline = /^(P|SPAN|LI|TD|DD)$/.test(el.tagName);
    if (inline) { el.insertAdjacentHTML('afterbegin', extra ? extra + ' ' : ''); el.prepend(b, ' '); }
    else { const line = document.createElement('div'); line.className = 'bk-badge-line'; line.append(b); line.insertAdjacentHTML('beforeend', extra); el.prepend(line); }
  });
  root.querySelectorAll('.loc.ext').forEach(el => {
    if (el._pop) return;
    el._pop = () => `<b>${esc(el.textContent)}</b>${el.dataset.note ? esc(el.dataset.note) + '<br>' : ''}이 위치는 이 학습서(19–24장) 밖에 있다. 교재에서 직접 펼쳐 확인하라.`;
    popTarget(el);
  });
}
/* 점검용: ?audit=1 로 열면 배지 규칙 위반을 콘솔과 페이지 맨 위에 보여 준다 */
Book.audit = function(){
  const out = [];
  document.querySelectorAll('[data-k]:not(.bk-badge)').forEach(el => {
    const k = el.dataset.k, where = (el.closest('[id]') || {}).id || el.tagName;
    if (!KINDS[k]) out.push(`알 수 없는 배지 ${k} @${where}`);
    if (k === 'approx' && !el.dataset.cond) out.push(`근사에 조건 없음 @${where}`);
    if (k === 'cite' && !el.dataset.ref && !el.dataset.ext) out.push(`인용에 위치 없음 @${where}`);
    if (k === 'exp' && !el.dataset.src) out.push(`실험 사실에 출처 없음 @${where}`);
  });
  document.querySelectorAll('.sim-fig').forEach(f => {
    const g = f.querySelector('.guide');
    if (!g || g.querySelectorAll('p').length < 3) out.push(`시뮬레이션 안내 세 줄 없음 @${f.id}`);
  });
  return out;
};

/* ---------------------------------------------------------------------
 * 5. 위치 링크 도착 강조 · 수식 렌더
 * ------------------------------------------------------------------- */
function renderMath(root){
  if (window.renderMathInElement) renderMathInElement(root, {
    delimiters:[{left:'$$', right:'$$', display:true}, {left:'\\[', right:'\\]', display:true}, {left:'$', right:'$', display:false}],
    throwOnError:false, ignoredTags:['script','noscript','style','textarea','pre','code','option','input'] });
}
Book.renderMath = renderMath;
Book.tex = (s, display) => { if (!window.katex) return esc(s); try { return katex.renderToString(s, { throwOnError:false, displayMode:!!display }); } catch(e){ return esc(s); } };
function flashTarget(){
  if (!location.hash) return;
  let el; try { el = document.querySelector(decodeURIComponent(location.hash)); } catch(e){ return; }
  if (!el) return;
  const d = el.closest('details'); if (d) d.open = true;
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}
window.addEventListener('hashchange', flashTarget);

/* ---------------------------------------------------------------------
 * 6. 예상하기: 세 줄 안내의 셋째 줄에 고를 수 있는 보기
 *    <p data-choices="커진다|그대로다|작아진다" data-answer="그대로다" data-why="…">
 *    고른 뒤 그 시뮬레이션을 실제로 만지면 판정이 나타난다.
 * ------------------------------------------------------------------- */
function buildPredict(root){
  root.querySelectorAll('.guide [data-choices]').forEach(p => {
    if (p.dataset.done) return; p.dataset.done = '1';
    const fig = p.closest('.sim-fig, .bk-embed-wrap') || p.parentElement;
    const box = document.createElement('div'); box.className = 'predict'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', '내 예상 고르기');
    const fb = document.createElement('div'); fb.className = 'predict-fb'; fb.setAttribute('aria-live', 'polite');
    const choices = p.dataset.choices.split('|');
    let chosen = null, touched = false;
    const show = () => {
      if (!chosen) return;
      if (!touched) { fb.className = 'predict-fb'; fb.textContent = `예상 “${chosen}”을 기록했다. 이제 시뮬레이션을 직접 조절해 보라. 조절하면 판정이 나타난다.`; return; }
      const ok = chosen === p.dataset.answer;
      fb.className = 'predict-fb ' + (ok ? 'ok' : 'no');
      fb.innerHTML = (ok ? '예상이 맞았다. ' : `예상과 다르다. 실제로는 “${esc(p.dataset.answer)}”. `) + (p.dataset.why || '');
      renderMath(fb);
    };
    choices.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', ev => { ev.stopPropagation(); chosen = c; box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); show(); });
      box.appendChild(b); });
    const span = p.querySelector('span') || p; span.append(box, fb);
    const mark = ev => { if (box.contains(ev.target)) return; if (!touched) { touched = true; show(); } };
    fig.addEventListener('input', mark); fig.addEventListener('pointerdown', mark);
    window.addEventListener('message', ev => { if (ev.data && ev.data.type === 'demo-interact' && fig.contains(document.querySelector(`iframe[data-uid="${ev.data.uid}"]`))) mark({ target: null }); });
  });
}

/* ---------------------------------------------------------------------
 * 7. 손으로 풀기 채점
 *    <div class="hand" data-answer="45.5" data-tol="0.02" data-unit="pm"> …
 *      <div class="hand-sim" data-sim="spring" data-set='{"T":300,"k":2}' data-read="xrms"></div>
 * ------------------------------------------------------------------- */
const SUPMAP = {'⁻':'-','⁺':'+','⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'};
function parseNum(raw){
  if (raw == null) return NaN;
  let s = String(raw).trim().replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/,/g, '').replace(/·/g, '*');
  s = s.replace(/[⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, m => '^' + m.split('').map(c => SUPMAP[c]).join(''));
  s = s.replace(/\*\*/g, '^').replace(/[×xX]/g, '*');
  let m = /^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\*10\^\(?([+-]?\d+)\)?$/i.exec(s);
  if (m) return parseFloat(m[1]) * Math.pow(10, +m[2]);
  m = /^10\^\(?([+-]?\d+)\)?$/.exec(s); if (m) return Math.pow(10, +m[1]);
  m = /^([+-]?\d*\.?\d+)\/([+-]?\d*\.?\d+)$/.exec(s); if (m) return parseFloat(m[1]) / parseFloat(m[2]);
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return parseFloat(s);
  return NaN;
}
Book.parseNum = parseNum;
const sims = Book.sims = {};
const handGroups = {};
function buildHands(root){
  root.querySelectorAll('.hand[data-answer]').forEach((h, idx) => {
    if (h.dataset.done) return; h.dataset.done = '1';
    const ans = parseNum(h.dataset.answer), tol = parseFloat(h.dataset.tol || '0.02'), unit = h.dataset.unit || '';
    const id = (h.id || 'hand' + idx) + '-in';
    const row = document.createElement('div'); row.className = 'hand-row';
    row.innerHTML = `<label for="${id}">내 답</label><input id="${id}" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="예: 4.5e-11 또는 4.5×10^-11">`
      + (unit ? `<span class="unit">${unit}</span>` : '') + `<button type="button" class="sim-btn primary">확인</button><button type="button" class="sim-btn reveal">답 보기</button>`;
    const fb = document.createElement('p'); fb.className = 'hand-fb'; fb.setAttribute('aria-live', 'polite');
    const hint = document.createElement('div'); hint.className = 'fmt-hint'; hint.textContent = '소수, 1.2e-3, 1.2×10^-3, 7/5 꼴로 쓸 수 있다.';
    const anchor = h.querySelector('.hand-sim, details'); h.insertBefore(row, anchor); h.insertBefore(fb, anchor); h.insertBefore(hint, anchor);
    renderMath(row);
    const inp = row.querySelector('input'); let tries = 0;
    const check = () => {
      const v = parseNum(inp.value);
      if (!isFinite(v)) { fb.className = 'hand-fb no'; fb.textContent = '숫자로 읽을 수 없다. 예: 0.0259, 2.6e-2, 2.6×10^-2'; return; }
      tries++;
      const rel = Math.abs(v - ans) / Math.max(Math.abs(ans), 1e-300);
      if (rel <= tol) { fb.className = 'hand-fb ok'; fb.innerHTML = `맞다. 정답 ${Book.fmt(ans, 4)}${unit ? ' ' + unit : ''} (허용 오차 ${Math.round(tol * 100)}%). 아래 시뮬레이션 값과도 비교해 보라.`; }
      else {
        fb.className = 'hand-fb no';
        const ratio = v / ans, lg = Math.log10(Math.abs(ratio));
        let msg = '다시 계산해 보라.';
        if (ratio < 0) msg = '부호가 반대다.';
        else if (Math.abs(lg - Math.round(lg)) < 0.02 && Math.round(lg) !== 0) msg = `자릿수가 10^${Math.round(lg)}배 틀렸다. 단위 환산이나 지수를 확인하라.`;
        else if (Math.abs(ratio - 2) < 0.05 || Math.abs(ratio - 0.5) < 0.03) msg = '정확히 2배(또는 절반) 차이 난다. 1/2 인자나 자유도 수를 확인하라.';
        else if (Math.abs(ratio * ratio - 1) > 0 && Math.abs(Math.sqrt(Math.abs(ratio)) - 1) < 0.02) msg = '거의 맞지만 오차 범위를 넘는다. 상수의 유효숫자를 확인하라.';
        fb.textContent = msg + (tries >= 2 ? ' (막히면 ‘풀이’를 열어 보라.)' : '');
      }
    };
    row.querySelector('.primary').addEventListener('click', check);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    row.querySelector('.reveal').addEventListener('click', () => { fb.className = 'hand-fb'; fb.innerHTML = `정답: ${Book.fmt(ans, 4)}${unit ? ' ' + unit : ''}`; const d = h.querySelector('details'); if (d) d.open = true; });
    /* 시뮬레이션 대조 */
    h.querySelectorAll('.hand-sim').forEach(hs => {
      const name = hs.dataset.sim, key = hs.dataset.read, set = hs.dataset.set ? JSON.parse(hs.dataset.set) : null;
      hs.innerHTML = `<button type="button" class="sim-btn">시뮬레이션을 이 조건으로 맞추기</button><span>${hs.dataset.label || '시뮬레이션 값'}: <output>—</output></span>`;
      renderMath(hs);
      const out = hs.querySelector('output');
      /* 문제 조건으로 맞춘 뒤에만 값을 보인다. 사용자가 그 시뮬레이션의 조절기나 그래프를 직접 건드리면
         조건이 달라졌을 수 있으므로 다시 숨긴다(프로그램이 바꾼 값은 isTrusted가 false라 무시). */
      const IDLE = '— (‘이 조건으로 맞추기’를 누르면 표시)';
      let armed = !set, watched = false;
      const me = { disarm: () => { armed = false; } };
      (handGroups[name] = handGroups[name] || []).push(me);
      const disarm = ev => {
        if (!ev.isTrusted || !set) return;
        const t = ev.target;
        if (ev.type === 'pointerdown' || ev.type === 'keydown') { if (!t.closest || !t.closest('svg, canvas, input, select')) return; }
        armed = false;
      };
      const watch = s => { if (watched || !s.fig) return; watched = true; ['input', 'change', 'pointerdown', 'keydown'].forEach(tp => s.fig.addEventListener(tp, disarm, true)); };
      hs.querySelector('button').addEventListener('click', () => {
        const s = sims[name]; if (!s) return;
        watch(s);
        handGroups[name].forEach(g => { if (g !== me) g.disarm(); });   /* 같은 시뮬레이션을 쓰는 다른 문항은 조건이 바뀌었으므로 숨김 */
        if (set) s.set(set);
        armed = true;
        if (s.fig) { s.fig.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); if (s.play) s.play(); }
      });
      setInterval(() => {
        const s = sims[name]; if (!s || !s.read) return;
        watch(s);
        if (!armed) { if (out.textContent !== IDLE) out.textContent = IDLE; return; }
        const r = s.read(key); out.innerHTML = r == null ? '—' : (typeof r === 'string' ? r : Book.fmt(r, 4));
      }, 400);
    });
  });
}

/* ---------------------------------------------------------------------
 * 8. 기존 데모 끼워 넣기 (demos/<이름>/index.html?embed=1)
 * ------------------------------------------------------------------- */
let embedUid = 0;
function embedSrc(name){ return `${ROOT()}demos/${name}/index.html?embed=1&lang=${Book.lang()}&theme=${Book.theme()}`; }
function buildEmbeds(root){
  root.querySelectorAll('.bk-embed[data-demo]').forEach(el => {
    if (el.dataset.done) return; el.dataset.done = '1';
    const uid = 'e' + (++embedUid), name = el.dataset.demo;
    el.innerHTML = `<div class="bar"><span>${el.dataset.label || '기존 데모'}</span><a href="${esc(ROOT() + 'demos/' + name + '/index.html')}" target="_blank" rel="noopener">새 창에서 열기</a></div>`
      + `<iframe title="${esc(el.dataset.label || name)}" loading="lazy" data-uid="${uid}" data-demo="${esc(name)}" src="${esc(embedSrc(name))}#uid=${uid}"></iframe>`;
    renderMath(el.querySelector('.bar'));
  });
}
function syncEmbeds(reload){
  document.querySelectorAll('.bk-embed iframe').forEach(f => {
    try { f.contentWindow.postMessage({ type:'demo-theme', theme: Book.theme(), lang: Book.lang() }, '*'); } catch(e){}
    if (reload) f.src = embedSrc(f.dataset.demo) + '#uid=' + f.dataset.uid;
  });
}
window.addEventListener('message', ev => {
  const d = ev.data; if (!d || d.type !== 'demo-height') return;
  const f = document.querySelector(`.bk-embed iframe[data-uid="${d.uid}"]`); if (f && d.h > 100) f.style.height = Math.ceil(d.h) + 'px';
});
Book.onTheme(() => syncEmbeds(false));

/* ---------------------------------------------------------------------
 * 9. 그래프: Plot
 *    new Book.Plot(wrap, { onPick(x), pickSnap, xLabel, yLabel })
 *    plot.set({ xMin,xMax,yMin,yMax,xLog,yLog, series:[…], refs:[…], markers:[…], tip(x) })
 *    onPick 이 있으면 ‘누르면 이동’ 표시가 붙고, 누르기·끌기·←→ 키로 매개변수가 그 x값으로 이동한다.
 * ------------------------------------------------------------------- */
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const colorOf = c => (c && c.startsWith('--')) ? cssv(c) : (c || cssv('--s1'));
const SUP = {'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','.':'·'};
const supNum = n => String(n).split('').map(c => SUP[c] || c).join('');
function fmt(v, d = 3){
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) {
    let e = Math.floor(Math.log10(a)), m = v / Math.pow(10, e);
    if (Math.abs(+m.toFixed(d - 1)) >= 10) { m /= 10; e += 1; }
    return `${m.toFixed(Math.max(0, d - 1))}×10<sup>${e}</sup>`;
  }
  const digits = Math.max(0, d - 1 - Math.floor(Math.log10(a || 1)));
  return v.toFixed(Math.min(6, digits));
}
const fmtPlain = (v, d) => fmt(v, d).replace(/<sup>(.*?)<\/sup>/, (m, e) => supNum(e));
Book.fmt = fmt; Book.fmtPlain = fmtPlain;
function niceTicks(lo, hi, n = 4){
  const span = hi - lo; if (!(span > 0)) return [lo];
  const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n + 0.5);
  const out = []; for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-6 && out.length < 60; k++) out.push(+(k * step).toPrecision(12));
  return out;
}
function logTicks(lo, hi, maxN = 7){
  const a = Math.ceil(Math.log10(lo) - 1e-9), b = Math.floor(Math.log10(hi) + 1e-9);
  const step = Math.max(1, Math.ceil((b - a + 1) / maxN)); const out = [];
  for (let e = a; e <= b; e += step) out.push(Math.pow(10, e));
  if (out.length < 3) { for (const m of [2, 5]) for (let e = a - 1; e <= b; e++) { const v = m * Math.pow(10, e); if (v >= lo && v <= hi) out.push(v); } out.sort((x, y) => x - y); }
  return out;
}
function tickLabel(v, log){
  if (log) { const e = Math.log10(v); if (Math.abs(e - Math.round(e)) < 1e-9) { const k = Math.round(e); return (k >= -2 && k <= 3) ? String(+v.toPrecision(3)) : '10' + supNum(k); } return String(+v.toPrecision(2)); }
  const a = Math.abs(v); if (a !== 0 && (a >= 1e5 || a < 1e-3)) { const e = Math.floor(Math.log10(a)); return (v / Math.pow(10, e)).toFixed(1).replace(/\.0$/, '') + '×10' + supNum(e); }
  return String(+v.toFixed(6));
}
function setupCanvas(cv){
  const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
  if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = '11px ' + cssv('--font'); return { ctx, W, H };
}
Book.setupCanvas = setupCanvas; Book.cssv = cssv; Book.colorOf = colorOf;

class Plot {
  constructor(wrap, opt = {}){
    this.wrap = typeof wrap === 'string' ? document.getElementById(wrap) : wrap;
    this.cv = this.wrap.querySelector('canvas'); this.tip = this.wrap.querySelector('.tip');
    this.opt = opt; this.hoverX = null; this.pad = { l:46, r:12, t:10, b:opt.xLabel ? 32 : 20 };
    const pickable = typeof opt.onPick === 'function';
    this.cv.setAttribute('role', 'img');
    if (pickable) {
      this.cv.classList.add('pickable'); this.cv.tabIndex = 0;
      this.cv.setAttribute('aria-label', (this.cv.getAttribute('aria-label') || '그래프') + '. 누르거나 좌우 화살표 키로 매개변수를 옮긴다.');
      const t = this.wrap.querySelector('.plot-title');
      if (t && !t.querySelector('.pick-hint')) t.insertAdjacentHTML('beforeend', '<span class="pick-hint">누르면 이동</span>');
      let dragging = false;
      this.cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') { dragging = true; this.cv.setPointerCapture(e.pointerId); this.pick(e.offsetX); } });
      this.cv.addEventListener('pointerup', e => { dragging = false; });
      this.cv.addEventListener('click', e => { if (e.pointerType !== 'mouse' && e.detail !== 0) this.pick(e.offsetX); });
      this.cv.addEventListener('pointermove', e => { if (dragging) this.pick(e.offsetX); });
      this.cv.addEventListener('keydown', e => {
        if (!this.d || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return; e.preventDefault();
        const cur = this.opt.current ? this.opt.current() : null; if (cur == null) return;
        const d = this.d, dir = e.key === 'ArrowRight' ? 1 : -1, n = e.shiftKey ? 10 : 50;
        const nx = d.xLog ? cur * Math.pow(d.xMax / d.xMin, dir / n) : cur + dir * (d.xMax - d.xMin) / n;
        this.opt.onPick(Math.min(d.xMax, Math.max(d.xMin, nx)));
      });
    }
    this.cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { this.hoverX = this.pxToX(e.offsetX); this.draw(); } });
    this.cv.addEventListener('pointerleave', () => { this.hoverX = null; this.draw(); });
    Plot.all.add(this);
  }
  pick(px){ const x = this.pxToX(px); if (x == null) return; this.opt.onPick(this.opt.pickSnap ? this.opt.pickSnap(x) : x); }
  set(d){ this.d = d; this.draw(); }
  fx(x){ const d = this.d; return d.xLog ? Math.log(x / d.xMin) / Math.log(d.xMax / d.xMin) : (x - d.xMin) / (d.xMax - d.xMin); }
  fy(y){ const d = this.d; return d.yLog ? Math.log(y / d.yMin) / Math.log(d.yMax / d.yMin) : (y - d.yMin) / (d.yMax - d.yMin); }
  X(x){ return this.pad.l + this.fx(x) * (this.W - this.pad.l - this.pad.r); }
  Y(y){ return this.pad.t + (1 - this.fy(y)) * (this.H - this.pad.t - this.pad.b); }
  pxToX(px){ if (!this.d) return null; const d = this.d, f = (px - this.pad.l) / (this.W - this.pad.l - this.pad.r);
    if (f < -0.02 || f > 1.02) return null; const g = Math.min(1, Math.max(0, f));
    return d.xLog ? d.xMin * Math.pow(d.xMax / d.xMin, g) : d.xMin + g * (d.xMax - d.xMin); }
  ok(x, y){ const d = this.d; return isFinite(x) && isFinite(y) && !(d.xLog && x <= 0) && !(d.yLog && y <= 0); }
  draw(){
    if (!this.d || !this.cv.isConnected) return;
    const { ctx, W, H } = setupCanvas(this.cv); this.W = W; this.H = H;
    const d = this.d, p = this.pad;
    const cGrid = cssv('--grid'), cMuted = cssv('--muted'), cText2 = cssv('--text-2'), cSurf = cssv('--surface');
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1; ctx.strokeStyle = cGrid; ctx.fillStyle = cMuted; ctx.textBaseline = 'middle';
    const yt = d.yTicks || (d.yLog ? logTicks(d.yMin, d.yMax, 5) : niceTicks(d.yMin, d.yMax, 3));
    for (const y of yt) { if (y < d.yMin - 1e-12 || y > d.yMax + 1e-12) continue;
      const py = Math.round(this.Y(y)) + .5; ctx.beginPath(); ctx.moveTo(p.l, py); ctx.lineTo(W - p.r, py); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(d.yFmt ? d.yFmt(y) : tickLabel(y, d.yLog), p.l - 6, py); }
    const xt = d.xTicks || (d.xLog ? logTicks(d.xMin, d.xMax, 6) : niceTicks(d.xMin, d.xMax, 5));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const x of xt) { if (x < d.xMin * (d.xLog ? 0.999 : 1) - 1e-12 || x > d.xMax * 1.001 + 1e-12) continue;
      const px = Math.round(this.X(x)) + .5; ctx.beginPath(); ctx.moveTo(px, p.t); ctx.lineTo(px, H - p.b); ctx.stroke();
      ctx.fillText(d.xFmt ? d.xFmt(x) : tickLabel(x, d.xLog), px, H - p.b + 4); }
    if (this.opt.xLabel) { ctx.fillStyle = cText2; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(this.opt.xLabel, W - p.r, H - 1); }
    if (this.opt.yLabel) { ctx.save(); ctx.fillStyle = cText2; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(this.opt.yLabel, p.l + 4, p.t); ctx.restore(); }
    ctx.save(); ctx.beginPath(); ctx.rect(p.l, p.t, W - p.l - p.r, H - p.t - p.b); ctx.clip();
    for (const b of (d.bands || [])) { ctx.fillStyle = colorOf(b.color); ctx.globalAlpha = b.alpha || .1;
      if (b.y0 != null) { const y0 = this.Y(b.y0), y1 = this.Y(b.y1); ctx.fillRect(p.l, Math.min(y0, y1), W - p.l - p.r, Math.abs(y1 - y0)); }
      else { const x0 = this.X(b.x0), x1 = this.X(b.x1); ctx.fillRect(Math.min(x0, x1), p.t, Math.abs(x1 - x0), H - p.t - p.b); }
      ctx.globalAlpha = 1; }
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    for (const r of (d.refs || [])) {
      ctx.strokeStyle = r.color ? colorOf(r.color) : cMuted; ctx.beginPath();
      if (r.fn) { let st = false; for (let i = 0; i <= 200; i++) { const x = d.xLog ? d.xMin * Math.pow(d.xMax / d.xMin, i / 200) : d.xMin + (d.xMax - d.xMin) * i / 200;
          const y = r.fn(x); if (!this.ok(x, y)) { st = false; continue; } const px = this.X(x), py = Math.max(-1e4, Math.min(1e4, this.Y(y))); st ? ctx.lineTo(px, py) : ctx.moveTo(px, py); st = true; } }
      else if (r.x != null) { const px = this.X(r.x); ctx.moveTo(px, p.t); ctx.lineTo(px, H - p.b); }
      else { const py = this.Y(r.y); ctx.moveTo(p.l, py); ctx.lineTo(W - p.r, py); }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const s of (d.series || [])) {
      const col = colorOf(s.color);
      if (s.fill) { ctx.fillStyle = col; ctx.globalAlpha = s.alpha || .18; ctx.beginPath(); let st = false;
        for (let i = 0; i < s.xs.length; i++) { if (!this.ok(s.xs[i], s.ys[i])) continue; const px = this.X(s.xs[i]), py = this.Y(s.ys[i]); if (!st) { ctx.moveTo(px, this.Y(s.base || 0)); st = true; } ctx.lineTo(px, py); }
        if (st) { ctx.lineTo(this.X(s.xs[s.xs.length - 1]), this.Y(s.base || 0)); ctx.closePath(); ctx.fill(); } ctx.globalAlpha = 1; if (!s.stroke) continue; }
      if (s.bars) { ctx.fillStyle = col; ctx.globalAlpha = s.alpha || .4; const y0 = this.Y(Math.max(d.yMin, s.base || 0));
        for (let i = 0; i < s.xs.length; i++) { if (!this.ok(s.xs[i], s.ys[i])) continue;
          const xa = this.X(s.xs[i] - s.w / 2), xb = this.X(s.xs[i] + s.w / 2), py = this.Y(s.ys[i]);
          ctx.fillRect(xa + 1, Math.min(py, y0), Math.max(1, xb - xa - 2), Math.abs(y0 - py)); }
        ctx.globalAlpha = 1; continue; }
      if (s.pts) { for (let i = 0; i < s.xs.length; i++) { if (!this.ok(s.xs[i], s.ys[i])) continue;
          ctx.beginPath(); ctx.arc(this.X(s.xs[i]), this.Y(s.ys[i]), s.r || 4, 0, 2 * Math.PI); ctx.fillStyle = s.cols ? colorOf(s.cols[i]) : col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = cSurf; ctx.stroke(); }
        continue; }
      ctx.strokeStyle = col; ctx.lineWidth = s.width || 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (s.dash) ctx.setLineDash(s.dash); ctx.globalAlpha = s.alpha || 1;
      ctx.beginPath(); let st = false;
      for (let i = 0; i < s.xs.length; i++) { const x = s.xs[i], y = s.ys[i];
        if (!this.ok(x, y)) { st = false; continue; }
        const px = this.X(x), py = Math.max(-1e4, Math.min(1e4, this.Y(y))); st ? ctx.lineTo(px, py) : ctx.moveTo(px, py); st = true; }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.fillStyle = cText2;
    for (const r of (d.refs || [])) { if (!r.lab) continue;
      if (r.x != null) { if (r.x >= d.xMin && r.x <= d.xMax) { ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(r.lab, this.X(r.x) + 3, p.t + 1); } continue; }
      const xr = r.labX != null ? r.labX : d.xMax, yr = r.fn ? r.fn(xr) : r.y;
      if (this.ok(xr, yr) && yr >= d.yMin && yr <= d.yMax) { ctx.textAlign = r.labAlign || 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(r.lab, r.labAlign === 'left' ? this.X(xr) + 3 : Math.min(W - p.r - 2, this.X(xr) - 2), this.Y(yr) - 2); } }
    for (const l of (d.labels || [])) { if (!this.ok(l.x, l.y)) continue; ctx.fillStyle = l.color ? colorOf(l.color) : cText2; ctx.textAlign = l.align || 'left'; ctx.textBaseline = l.base || 'bottom'; ctx.fillText(l.text, this.X(l.x) + (l.dx || 4), this.Y(l.y) + (l.dy || -2)); }
    for (const m of (d.markers || [])) {
      if (!this.ok(m.x, m.y) || m.x < d.xMin || m.x > d.xMax) continue;
      const px = this.X(m.x), py = Math.max(p.t, Math.min(H - p.b, this.Y(m.y))), col = colorOf(m.color || '--s2');
      if (m.vline !== false) { ctx.strokeStyle = col; ctx.globalAlpha = .4; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, p.t); ctx.lineTo(px, H - p.b); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.beginPath(); ctx.arc(px, py, m.r || 5.5, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = cSurf; ctx.stroke();
      if (m.label) { ctx.fillStyle = cText2; ctx.textAlign = px > W * 0.7 ? 'right' : 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(m.label, px + (px > W * 0.7 ? -8 : 8), py - 6); }
    }
    if (this.hoverX != null && d.tip) {
      const px = this.X(this.hoverX);
      ctx.strokeStyle = cMuted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + .5, p.t); ctx.lineTo(px + .5, H - p.b); ctx.stroke();
      const t = d.tip(this.hoverX);
      if (t && this.tip) { this.tip.textContent = t; this.tip.style.left = Math.min(Math.max(px, 90), W - 90) + 'px'; this.tip.style.top = (this.cv.offsetTop + 16) + 'px'; this.tip.style.opacity = 1; }
    } else if (this.tip) this.tip.style.opacity = 0;
  }
}
Plot.all = new Set();
Book.Plot = Plot;
let rzT; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { Plot.all.forEach(p => p.draw()); Book._resize.forEach(f => f()); }, 80); });
Book._resize = [];
Book.onResize = fn => Book._resize.push(fn);
Book.onTheme(() => Plot.all.forEach(p => p.draw()));

/* ---------------------------------------------------------------------
 * 10. 시뮬레이션 도구
 * ------------------------------------------------------------------- */
/* 난수 */
let spare = null;
Book.gauss = () => { if (spare != null) { const s = spare; spare = null; return s; }
  let u = 0; while (u === 0) u = Math.random(); const v = Math.random(), r = Math.sqrt(-2 * Math.log(u));
  spare = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v); };
/* 물리 상수 (CODATA 2018, SI) */
Book.C = { kB:1.380649e-23, h:6.62607015e-34, hbar:1.054571817e-34, c:2.99792458e8, e:1.602176634e-19,
  NA:6.02214076e23, R:8.314462618, u:1.66053906660e-27 };
/* 로그 슬라이더 0–1000 ↔ 값 */
Book.logMap = (lo, hi) => ({ to: s => lo * Math.pow(hi / lo, s / 1000), from: v => Math.round(1000 * Math.log(v / lo) / Math.log(hi / lo)) });

/* 조작부 만들기
 *   spec: [{key,label,type:'range',min,max,step,value,log,fmt},{key,label,type:'seg',options:[[v,label]],value},{key,label,type:'check',value}]
 *   반환: { get(k), set(k,v,silent), on(fn) } — on(fn)은 (key, value) 로 불린다. */
Book.controls = function(mount, spec){
  const st = {}, els = {}, listeners = [];
  const fire = (k) => listeners.forEach(f => f(k, st[k]));
  for (const c of spec) {
    const wrap = document.createElement('div'); wrap.className = 'ctl';
    const id = (mount.closest('[id]') || { id: 'sim' }).id + '-' + c.key;
    st[c.key] = c.value;
    if (c.type === 'seg') {
      wrap.innerHTML = `<div class="ctl-label"><span id="${id}-l">${c.label}</span></div><div class="sim-seg" role="group" aria-labelledby="${id}-l">`
        + c.options.map(o => `<button type="button" data-v="${esc(o[0])}">${o[1]}</button>`).join('') + '</div>';
      const seg = wrap.querySelector('.sim-seg');
      const mark = () => seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(st[c.key]))));
      seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
        const o = c.options.find(o => String(o[0]) === b.dataset.v); st[c.key] = o[0]; mark(); fire(c.key); });
      els[c.key] = { set: v => { st[c.key] = v; mark(); } }; mark();
    } else if (c.type === 'check') {
      wrap.innerHTML = `<label class="sim-chk"><input type="checkbox" id="${id}"${c.value ? ' checked' : ''}><span>${c.label}</span></label>`;
      const inp = wrap.querySelector('input');
      inp.addEventListener('change', () => { st[c.key] = inp.checked; fire(c.key); });
      els[c.key] = { set: v => { st[c.key] = !!v; inp.checked = !!v; } };
    } else {
      const map = c.log ? Book.logMap(c.min, c.max) : null;
      const step = c.log ? 1 : (c.step || (c.max - c.min) / 200);
      wrap.innerHTML = `<label class="ctl-label" for="${id}"><span>${c.label}</span><output for="${id}"></output></label>`
        + `<input type="range" id="${id}" min="${c.log ? 0 : c.min}" max="${c.log ? 1000 : c.max}" step="${step}">`;
      const inp = wrap.querySelector('input'), out = wrap.querySelector('output');
      const show = () => { out.innerHTML = c.fmt ? c.fmt(st[c.key]) : fmt(st[c.key], 3); };
      const toSlider = v => { inp.value = c.log ? map.from(v) : v; };
      inp.addEventListener('input', () => { let v = c.log ? map.to(+inp.value) : +inp.value; if (c.round) v = c.round(v); st[c.key] = v; show(); fire(c.key); });
      els[c.key] = { set: v => { v = Math.min(c.max, Math.max(c.min, v)); if (c.round) v = c.round(v); st[c.key] = v; toSlider(v); show(); } };
      toSlider(c.value); show();
    }
    mount.appendChild(wrap);
  }
  renderMath(mount);
  return { get: k => st[k], set: (k, v, silent) => { els[k].set(v); if (!silent) fire(k); }, on: fn => listeners.push(fn), state: st };
};
/* 결과 타일 */
Book.tiles = function(mount, spec){
  mount.innerHTML = spec.map(s => `<div class="sim-tile"><div class="lab">${s.label}</div><div class="val" data-t="${s.key}">—</div><div class="sub" data-s="${s.key}"></div></div>`).join('');
  renderMath(mount);
  return (k, v, sub) => { const a = mount.querySelector(`[data-t="${k}"]`), b = mount.querySelector(`[data-s="${k}"]`); if (a) a.innerHTML = v; if (b && sub != null) b.innerHTML = sub; };
};
/* 그래프 상자 만들기 */
Book.plotBox = function(mount, { title, aria, legend, cap, height }){
  const w = document.createElement('div'); w.className = 'plot';
  w.innerHTML = `<p class="plot-title"><span>${title}</span></p><canvas aria-label="${esc(aria || '')}"${height ? ` style="height:${height}px"` : ''}></canvas><div class="tip"></div>`
    + (legend ? `<div class="legend">${legend}</div>` : '') + (cap ? `<div class="xcap">${cap}</div>` : '');
  mount.appendChild(w); renderMath(w); return w;
};
/* 애니메이션: 화면에 보일 때만 돌고, ‘동작 줄이기’ 설정이면 처음에 멈춰 있다 */
Book.animate = function(fig, tick, opt = {}){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctl = { running: opt.autoplay !== false && !reduce, visible: false, btn: null };
  let last = 0, raf = 0;
  const loop = t => { raf = 0; const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t;
    if (ctl.running && ctl.visible) { tick(dt); } if (ctl.running && ctl.visible) raf = requestAnimationFrame(loop); else last = 0; };
  const kick = () => { if (!raf && ctl.running && ctl.visible) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(es => { ctl.visible = es[0].isIntersecting; kick(); }, { rootMargin: '80px' }).observe(fig);
  ctl.play = () => { ctl.running = true; label(); kick(); };
  ctl.pause = () => { ctl.running = false; label(); };
  ctl.toggle = () => ctl.running ? ctl.pause() : ctl.play();
  const label = () => { if (ctl.btn) { ctl.btn.textContent = ctl.running ? '■ 멈춤' : '▶ 실행'; ctl.btn.setAttribute('aria-pressed', String(!ctl.running)); } };
  ctl.bindButton = b => { ctl.btn = b; b.addEventListener('click', ctl.toggle); label(); };
  return ctl;
};

/* ---------------------------------------------------------------------
 * 초기화
 * ------------------------------------------------------------------- */
const readyFns = [];
Book.ready = fn => readyFns.push(fn);
function init(){
  buildShell();
  const main = document.getElementById('main') || document.body;
  if (document.querySelector('[data-k]:not(.bk-badge)') && !document.querySelector('.bk-legend') && document.querySelector('.bk-page')) {
    const lg = document.createElement('details'); lg.className = 'bk-legend';
    lg.innerHTML = '<summary>진술 배지 읽는 법 — 각 식과 문장 앞의 표시는 “증명할 대상인지, 받아들이는 출발점인지”를 알려 준다</summary><dl>'
      + Object.entries(KINDS).map(([k, v]) => `<dt><span class="bk-badge" data-k="${k}" style="cursor:default"><span class="g" aria-hidden="true">${v.g}</span>${v.l}</span></dt><dd>${v.d}</dd>`).join('') + '</dl>';
    const anchor = document.querySelector('.bk-page .bk-flow') || document.querySelector('.bk-page .bk-meta');
    if (anchor) anchor.after(lg);
  }
  decorateClaims(main); buildPredict(main); buildHands(main); buildEmbeds(main);
  showLangNote(); buildPager();
  renderMath(main);
  readyFns.forEach(f => { try { f(); } catch(e){ console.error(e); } });
  flashTarget();
  if (new URLSearchParams(location.search).get('audit') === '1') {
    const a = Book.audit(); console.log('[audit]', a.length ? a : '문제 없음');
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
