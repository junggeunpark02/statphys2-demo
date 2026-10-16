/* =====================================================================
 * site-config.js — 사이트 전체 설정 (이 파일 한 곳만 고치면 됩니다)
 * Site-wide settings (edit only this file)
 * ---------------------------------------------------------------------
 *  - 허브(index.html)와 모든 데모(demos/<주제>/index.html)가 이 파일을 읽습니다.
 *  - 데모 파일을 단독으로 열어 이 파일을 찾지 못해도, 각 데모는 자체 기본값으로 동작합니다.
 * ===================================================================== */
window.SITE_CONFIG = {
  /* --- 언어 / Language -------------------------------------------------
   * 'both' : 한·영 병기 (기본)   'ko' : 한국어만   'en' : 영어만
   * SHOW_LANG_TOGGLE 를 false 로 두면 상단 언어 버튼이 사라지고
   * 모든 페이지가 DEFAULT_LANG 으로 고정됩니다 (영어 전용 사이트 등). */
  DEFAULT_LANG: 'both',
  SHOW_LANG_TOGGLE: true,

  /* --- GitHub 저장소 / Repository -------------------------------------
   * 아래 두 값만 바꾸면 허브의 모든 "Open in Colab" 배지 링크가 바뀝니다.
   * Colab 링크 형식:
   *   https://colab.research.google.com/github/<GITHUB_USER>/<REPO_NAME>/blob/<BRANCH>/notebooks/<파일>.ipynb */
  GITHUB_USER: 'junggeunpark02',
  REPO_NAME: 'statphys2-demo',
  BRANCH: 'main',
  NOTEBOOK_DIR: 'notebooks',

  /* --- 과목 정보 / Course info ----------------------------------------- */
  COURSE: { ko: '열및통계물리2', en: 'Thermal and Statistical Physics 2' },
  TERM:   { ko: '2026-2학기',     en: 'Fall Semester 2026' },
  /* 소속 표기가 필요하면 입력 (비워 두면 표시하지 않음) */
  ORG:    { ko: '', en: '' }
};
