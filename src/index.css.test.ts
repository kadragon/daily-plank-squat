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
