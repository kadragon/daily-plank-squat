## Settings 페이지 UI/UX 디자인 개선

> Settings 페이지에 glassmorphism 카드, 커스텀 토글, 스타일된 입력 필드를 적용하여 앱 전체 디자인 언어와 통일

- [x] `<input type="checkbox" ... />` 바로 뒤에 `<span className="settings__toggle-track" />` 추가
- [x] `.settings` — 카드 표면 (gradient bg, border, shadow, backdrop-filter, padding 1.1rem, gap 1rem)
- [x] `.settings h2` — 1.2rem, 600 weight, uppercase, muted color
- [x] `.settings__exercises h3` — 0.94rem, 동일 패턴
- [x] `.settings__exercises` — flex column, gap 0.6rem
- [x] `.settings__exercise-row` — border, border-radius 12px, bg rgba(2,6,23,0.28), padding 0.75rem
- [x] `.settings__exercise-row:hover` — border-color 밝아지는 효과
- [x] checkbox sr-only 숨김 (clip rect 기법)
- [x] `.settings__toggle-label` — flex, align-items center, gap, cursor pointer, font-weight 600
- [x] `.settings__toggle-track` — 44x26px pill, muted bg, position relative
- [x] `.settings__toggle-track::after` — 20x20px 원형 노브, 3px inset
- [x] `input:checked + .settings__toggle-track` — 오렌지 배경 + 노브 translateX(18px)
- [x] `input:focus-visible + .settings__toggle-track` — 초록 outline
- [x] `.settings__target-row` — flex, align-items center, gap 0.5rem
- [x] `.settings__target-label` — muted color, 0.9rem
- [x] `.settings__target-input` — 80px width, 44px height, reps-input과 동일 bg/border/radius
- [x] `.settings__target-input:focus-visible` — 초록 outline
- [x] `.settings__target-unit` — muted color, 0.88rem
- [x] `.settings__target-input:disabled` — opacity 0.35, cursor not-allowed
- [x] `.settings__target-row:has(input:disabled)` — opacity 0.4, pointer-events none
