# 열및통계물리2 · 통계역학 인터랙티브 시뮬레이션

Thermal and Statistical Physics 2 (2026-2학기) 학습 보조 사이트.
교재: S. J. Blundell & K. M. Blundell, *Concepts in Thermal Physics*, 2nd ed. (OUP) 19–24장.

사이트 주소: https://junggeunpark02.github.io/statphys2-demo/

## 구조

```
index.html                    허브 (데모 카드, Colab 노트북 배지, 참고문헌)
site-config.js                사이트 전체 설정 — 언어, GitHub 계정/저장소, 과목 정보
demos/<주제>/index.html       데모 (HTML 파일 하나로 완결, 설치 불필요)
notebooks/*.ipynb             Colab 예제 풀이 노트북 (추가 예정)
```

## 설정 (site-config.js 한 곳)

| 항목 | 설명 |
|---|---|
| `DEFAULT_LANG` | `'both'`(한·영 병기) / `'ko'` / `'en'` |
| `SHOW_LANG_TOGGLE` | `false`로 두면 언어 버튼을 숨기고 `DEFAULT_LANG`으로 고정 |
| `GITHUB_USER`, `REPO_NAME` | Colab 배지 링크에 쓰임 (현재 `junggeunpark02` / `statphys2-demo`) |
| `BRANCH`, `NOTEBOOK_DIR` | 기본값 `main`, `notebooks` |

문구는 각 HTML 파일의 `I18N = { ko: {...}, en: {...} }` 블록에 언어별로 분리되어 있습니다.

## 데모·노트북 추가

- 데모를 추가하면 `index.html`의 `DEMOS` 목록에서 해당 항목을 `ready:true`로 바꿉니다.
- 노트북을 `notebooks/`에 올리면 `NOTEBOOKS` 목록에서 해당 항목을 `ready:true`로 바꿉니다.

외부 의존성: KaTeX 0.16.11 (jsDelivr CDN), Colab 배지 이미지.
