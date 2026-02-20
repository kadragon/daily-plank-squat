import { expect, test } from 'bun:test'

const APP_CHROME_COLOR = '#0f172a'

async function readRootFile(path: string) {
  return Bun.file(new URL(path, import.meta.url)).text()
}

test('PWA and document theme colors match app chrome tone', async () => {
  const indexHtml = await readRootFile('../index.html')
  const viteConfig = await readRootFile('../vite.config.ts')
  const usesThemeColorConstant = viteConfig.includes('theme_color: APP_CHROME_COLOR')
  const usesBackgroundColorConstant = viteConfig.includes('background_color: APP_CHROME_COLOR')

  expect(indexHtml).toContain(`<meta name="theme-color" content="${APP_CHROME_COLOR}" />`)
  if (usesThemeColorConstant || usesBackgroundColorConstant) {
    expect(viteConfig).toContain(`const APP_CHROME_COLOR = '${APP_CHROME_COLOR}'`)
  }
  expect(viteConfig).toMatch(new RegExp(`theme_color:\\s*(?:'${APP_CHROME_COLOR}'|APP_CHROME_COLOR)`))
  expect(viteConfig).toMatch(new RegExp(`background_color:\\s*(?:'${APP_CHROME_COLOR}'|APP_CHROME_COLOR)`))
})
