/* =====================================================================
 * demo-embed.js — 기존 데모 12개가 함께 읽는 작은 도우미
 *  - 사이트 전체 화면 설정(밝게/어둡게)을 따른다 (localStorage 'statphys2-theme').
 *  - ?embed=1 로 열리면(학습서 절 본문 안 iframe) 상단 막대·꼬리말을 숨기고,
 *    문서 높이와 사용자 조작을 부모 페이지에 알린다.
 * 데모 파일 <head>에서 site-config.js 바로 뒤에 불러온다.
 * ===================================================================== */
(function(){
  var q = new URLSearchParams(location.search);
  var root = document.documentElement;
  var theme = q.get('theme');
  if (!theme) { try { theme = localStorage.getItem('statphys2-theme'); } catch(e){} }
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  if (q.get('embed') !== '1') return;
  root.classList.add('is-embed');
  var st = document.createElement('style');
  st.textContent = 'html.is-embed .topbar, html.is-embed footer{display:none !important}'
    + 'html.is-embed body{background:transparent}'
    + 'html.is-embed .wrap{padding-top:10px; padding-bottom:12px}'
    + 'html.is-embed .title{padding-top:0}'
    + 'html.is-embed .text-sec{display:none}';
  document.head.appendChild(st);
  var uid = (/uid=([\w-]+)/.exec(location.hash) || [])[1] || '';
  function post(msg){ try { msg.uid = uid; parent.postMessage(msg, '*'); } catch(e){} }
  function height(){ post({ type: 'demo-height', h: document.documentElement.scrollHeight }); }
  window.addEventListener('message', function(ev){
    var d = ev.data; if (!d || d.type !== 'demo-theme') return;
    if (d.theme === 'light' || d.theme === 'dark') root.dataset.theme = d.theme;
    if (window.onRedraw) window.onRedraw();
  });
  document.addEventListener('DOMContentLoaded', function(){
    height();
    if (window.ResizeObserver) new ResizeObserver(height).observe(document.body);
    window.addEventListener('load', height);
    var sent = false;
    var mark = function(){ if (!sent) { sent = true; post({ type: 'demo-interact' }); setTimeout(function(){ sent = false; }, 1500); } };
    document.addEventListener('input', mark, true);
    document.addEventListener('pointerdown', mark, true);
  });
})();
