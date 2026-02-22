import { expect, test } from 'bun:test'

async function readIndexCss() {
  return Bun.file(new URL('./index.css', import.meta.url)).text()
}

test('index.css defines top safe-area tokens for notch spacing', async () => {
  const css = await readIndexCss()

  expect(css).toContain('--safe-top: env(safe-area-inset-top, 0px);')
  expect(css).toContain('--header-top-pad: max(0.9rem, calc(var(--safe-top) + 0.35rem));')
})

test('app-header applies top safe-area padding while keeping horizontal insets', async () => {
  const css = await readIndexCss()
  const appHeaderBlock = css.match(/\.app-header\s*\{([\s\S]*?)\}/)?.[1] ?? ''

  expect(appHeaderBlock).toContain('padding: var(--header-top-pad) 1rem 0.5rem 1rem;')
  expect(appHeaderBlock).toContain('padding-left: max(1rem, env(safe-area-inset-left));')
  expect(appHeaderBlock).toContain('padding-right: max(1rem, env(safe-area-inset-right));')
})

test('safe-area header region inherits shell background with root fallback color', async () => {
  const css = await readIndexCss()
  const appShellBlock = css.match(/\.app-shell\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  const appHeaderBlock = css.match(/\.app-header\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  const htmlBodyBlock = css.match(/html,\s*body\s*\{([\s\S]*?)\}/)?.[1] ?? ''

  expect(appShellBlock).toContain('background: var(--app-shell-background);')
  expect(appHeaderBlock).not.toContain('background: var(--app-shell-background);')
  expect(htmlBodyBlock).toContain('background-color: var(--app-chrome-color);')
})

test('index.css separates content and tabbar visual tokens', async () => {
  const css = await readIndexCss()

  expect(css).toContain('--content-surface:')
  expect(css).toContain('--tabbar-surface:')
  expect(css).toContain('--tabbar-border:')
})

test('bottom tabbar uses 6 equal columns for one-row navigation', async () => {
  const css = await readIndexCss()
  const tabbarBlock = css.match(/\.nav\.app-tabbar\s*\{([\s\S]*?)\}/)?.[1] ?? ''

  expect(tabbarBlock).toMatch(/grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\);/)
})

test('bottom tabbar applies compact spacing rules on narrow screens', async () => {
  const css = await readIndexCss()

  expect(css).toMatch(/@media\s*\(max-width:\s*360px\)/)
  expect(css).toMatch(/@media\s*\(max-width:\s*360px\)\s*\{[\s\S]*?\.nav\.app-tabbar\s*\{[\s\S]*?gap:\s*0\.2rem;/)
  expect(css).toMatch(/@media\s*\(max-width:\s*360px\)\s*\{[\s\S]*?\.nav\.app-tabbar\s*\{[\s\S]*?padding-left:\s*max\(0\.5rem,\s*env\(safe-area-inset-left\)\);/)
  expect(css).toMatch(/@media\s*\(max-width:\s*360px\)\s*\{[\s\S]*?\.nav\.app-tabbar\s*\{[\s\S]*?padding-right:\s*max\(0\.5rem,\s*env\(safe-area-inset-right\)\);/)
  expect(css).toMatch(/@media\s*\(max-width:\s*360px\)\s*\{[\s\S]*?\.nav-btn\.app-tabbar__button\s*\{[\s\S]*?min-width:\s*40px;/)
})

test('main scroll policy disables page vertical scroll and enables horizontal swipe priority', async () => {
  const css = await readIndexCss()
  const mainContentBlock = css.match(/\.main-content\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  const swipeBlock = css.match(/\.main-content--swipe\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  const scrollableStageBlock = css.match(/\.view-stage--scrollable\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  const htmlBodyBlock = css.match(/html,\s*body\s*\{([\s\S]*?)\}/)?.[1] ?? ''

  expect(mainContentBlock).toContain('overflow: hidden;')
  expect(swipeBlock).toContain('touch-action: pan-x;')
  expect(scrollableStageBlock).toContain('overflow-y: auto;')
  expect(htmlBodyBlock).toContain('overscroll-behavior-y: none;')
})
