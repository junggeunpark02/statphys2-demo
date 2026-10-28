# 열및통계물리2 · 통계역학 인터랙티브 시뮬레이션

Thermal and Statistical Physics 2 (2026-2학기) 학습 보조 사이트.
교재: S. J. Blundell & K. M. Blundell, *Concepts in Thermal Physics*, 2nd ed. (OUP) 19–24장.

사이트 주소: https://junggeunpark02.github.io/statphys2-demo/

## 구조

```
index.html                    첫 화면 → ch19/index.html 로 이동
toc.html                      전체 목차 (옛 허브: 장·절 목록, 데모 카드, Colab 노트북)
ch19/index.html               장 머릿글 (지금까지 무엇이 안 됐나 · 질문 · 장 지도 · 할 수 있는 것 · 남는 문제)
ch19/19-1.html … 19-4.html    절 페이지 (학습 목표 … 손으로 풀기 · 표기 참고)
ch19/sim19.js                 19장 시뮬레이션 (교재 그림 19.1–19.7의 움직이는 버전)
ch20/ … ch24/                 작성 예정 페이지 (주소·목차·이전/다음은 이미 동작)
assets/book.js                공통 코드: 사이드바·서랍, 진술 배지, 위치 링크, 예상하기, 손으로 풀기 채점, 그래프(누르면 이동), 데모 끼워 넣기
assets/book.css               공통 스타일 (밝게/어둡게, 휴대폰)
assets/demo-embed.js          기존 데모가 절 본문 iframe 안에서 쓰는 도우미
assets/vendor/katex/          KaTeX 0.16.11 (저장소 안에 포함, CDN 사용 안 함)
site-config.js                사이트 전체 설정 — 언어, GitHub 계정/저장소, 과목 정보
demos/<주제>/index.html       기존 데모 12개 (단독 실행 + 절 본문에 끼워 넣기)
notebooks/*.ipynb             Colab 예제 풀이 노트북 (19–24장, 장별 1개)
```

새 장·절 페이지를 만들 때는 `ch19/19-1.html`의 틀을 복사하고 `<body data-root="../" data-page="20.1">`만 맞추면 사이드바·이전/다음·배지가 자동으로 붙는다.
진술 배지는 `<div class="claim" data-k="approx" data-cond="조건">` 꼴로 쓴다 (`data-k`: def · axiom · model · approx · ansatz · cite · derived · exp).
페이지 주소 끝에 `?audit=1`을 붙이면 배지 규칙 위반(조건 없는 근사, 위치 없는 인용 등)을 콘솔에 보여 준다.

## 설정 (site-config.js 한 곳)

| 항목 | 설명 |
|---|---|
| `DEFAULT_LANG` | `'both'`(한·영 병기) / `'ko'` / `'en'` |
| `SHOW_LANG_TOGGLE` | `false`로 두면 언어 버튼을 숨기고 `DEFAULT_LANG`으로 고정 |
| `GITHUB_USER`, `REPO_NAME` | Colab 배지 링크에 쓰임 (현재 `junggeunpark02` / `statphys2-demo`) |
| `BRANCH`, `NOTEBOOK_DIR` | 기본값 `main`, `notebooks` |

문구는 각 HTML 파일의 `I18N = { ko: {...}, en: {...} }` 블록에 언어별로 분리되어 있습니다.

## 데모·노트북 목록

- 데모 12개(교재 19–24장)와 노트북 6개가 모두 공개 상태(`ready:true`)입니다.
- 항목을 숨기려면 `index.html`의 `DEMOS` 또는 `NOTEBOOKS` 목록에서 `ready:false`로 바꿉니다.

외부 의존성 없음 (KaTeX는 `assets/vendor/katex/`에 포함). 바깥으로 나가는 링크는 Colab 노트북 열기뿐이다.
