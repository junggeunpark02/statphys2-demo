# 열및통계물리2 · 통계역학 인터랙티브 시뮬레이션

Thermal and Statistical Physics 2 (2026-2학기) 강의보조 사이트.
교재: S. J. Blundell & K. M. Blundell, *Concepts in Thermal Physics*, 2nd ed. (OUP) 19–24장.

## 구조

```
index.html                    허브 (데모 카드, Colab 노트북 배지, 참고문헌)
site-config.js                사이트 전체 설정 — 언어, GitHub 계정/저장소, 과목 정보
demos/<주제>/index.html       데모 (HTML 파일 하나로 완결, 설치 불필요)
notebooks/*.ipynb             Colab 예제 풀이 노트북
```

## 설정 (site-config.js 한 곳)

| 항목 | 설명 |
|---|---|
| `DEFAULT_LANG` | `'both'`(한·영 병기) / `'ko'` / `'en'` |
| `SHOW_LANG_TOGGLE` | `false`로 두면 언어 버튼을 숨기고 `DEFAULT_LANG`으로 고정 |
| `GITHUB_USER`, `REPO_NAME` | 바꾸면 허브의 모든 "Open in Colab" 링크가 바뀜 |
| `BRANCH`, `NOTEBOOK_DIR` | 기본값 `main`, `notebooks` |

문구는 각 HTML 파일의 `I18N = { ko: {...}, en: {...} }` 블록에 언어별로 분리되어 있습니다.
데모 파일을 단독으로 열어도(설정 파일 없이) 기본값으로 동작합니다.

## GitHub Pages 배포

1. 이 폴더 내용을 저장소 루트에 올립니다.
2. Settings → Pages → Source: `Deploy from a branch`, Branch: `main` / `(root)`.
3. `site-config.js`의 `GITHUB_USER`, `REPO_NAME`을 실제 값으로 바꿉니다.
4. 노트북이 준비되면 `index.html`의 `NOTEBOOKS` 목록에서 해당 항목을 `ready:true`로, 데모가 추가되면 `DEMOS` 목록에서 `ready:true`로 바꿉니다.

외부 의존성: KaTeX 0.16.11 (jsDelivr CDN), Colab 배지 이미지.
