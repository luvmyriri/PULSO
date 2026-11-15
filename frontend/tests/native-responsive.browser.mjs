// Native home/onboarding layout matrix. SAMPLE device insets; no real API writes.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const base = process.env.PULSO_NATIVE_REVIEW_URL || 'http://127.0.0.1:5173';
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('../scratch/native-report-entry/responsive', { recursive: true });
const sizes = [[320, 568], [360, 640], [360, 800], [375, 667], [390, 844], [412, 915], [430, 932], [480, 960], [450, 1000], [568, 320], [844, 390]];
let cases = 0;
try {
  for (const [width, height] of sizes) for (const enlarged of [false, true]) {
    const language = enlarged ? 'tl' : 'en';
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.addInitScript(({ language, enlarged }) => {
      localStorage.setItem('pulso_language', language); localStorage.setItem('i18nextLng', language);
      localStorage.setItem('pulso_theme_mode', enlarged ? 'light' : 'dark');
    }, { language, enlarged });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const guide of [false, true]) {
      await page.goto(`${base}/tests/native-report-entry.html${guide ? '?guide=1' : ''}`);
      await page.locator(guide ? '[data-native-guide]' : '[data-native-resident-landing]').waitFor();
      await page.addStyleTag({ content: `:root { --pulso-safe-top: 24px; --pulso-safe-bottom: 48px; --pulso-safe-left: ${width > height ? 24 : 0}px; --pulso-safe-right: ${width > height ? 24 : 0}px; font-size: ${enlarged ? 200 : 100}%; } html { scroll-behavior: auto !important; }` });
      const checkWidth = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}x${height}, ${guide ? 'guide' : 'home'}, enlarged=${enlarged}: horizontal overflow`);
      await checkWidth();
      if (guide) {
        for (let step = 1; step <= 5; step++) {
          const tips = page.locator('.native-guide__tips li p');
          assert.equal(await tips.count(), 3);
          for (const tip of await tips.all()) {
            await tip.evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
            const visible = await tip.evaluate(node => {
              const rect = node.getBoundingClientRect(), footer = document.querySelector('.native-guide__footer');
              return rect.top >= -1 && rect.bottom <= Math.min(innerHeight - 48, footer.getBoundingClientRect().top) + 1;
            });
            assert.ok(visible, `${width}x${height}, step ${step}, enlarged=${enlarged}: tip covered by footer`);
          }
          await checkWidth();
          const next = page.locator('.native-guide__next');
          await next.scrollIntoViewIfNeeded();
          assert.ok(await next.isEnabled());
          if (step === 1 && width === 360 && height === 800 && !enlarged) {
            await page.evaluate(() => scrollTo(0, 0));
            await page.screenshot({ path: '../scratch/native-report-entry/responsive/guide-360-dark.png', fullPage: true });
          }
          if (step < 5) await next.click();
        }
      } else {
        if (height > 700) assert.ok(await page.locator('.native-home__community').isVisible());
        assert.equal(await page.locator('.native-home__steps p:visible').count(), 3);
        const footer = page.locator('.native-home__footer');
        if (!enlarged && height > width) assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), `${width}x${height}: landing should fit without scrolling`);
        await footer.scrollIntoViewIfNeeded();
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        assert.ok((await footer.boundingBox()).y + (await footer.boundingBox()).height <= height - 48 + 1, 'Footer must clear the Android navigation bar');
        const bottomGap = await page.evaluate(() => document.querySelector('[data-native-resident-landing]').getBoundingClientRect().bottom - document.querySelector('.native-home__footer').getBoundingClientRect().bottom);
        assert.ok(bottomGap <= 48 + (enlarged ? 64 : 32), `${width}x${height}, enlarged=${enlarged}: unused space below footer (${bottomGap}px)`);
        const groups = await page.locator('.native-home__main > section, .native-home__main > aside, .native-home__main > footer').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => ({ top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom })));
        for (let index = 1; index < groups.length; index++) assert.ok(groups[index].top >= groups[index - 1].bottom - 1, 'Home sections must not overlap');
        if ([360, 412, 450].includes(width) && height >= 800 && !enlarged) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: `../scratch/native-report-entry/responsive/home-${width}-dark.png`, fullPage: true });
        }
      }
      assert.deepEqual(errors, []);
      cases++;
    }
    await context.close();
  }
  console.log(`PASS: ${cases} home/guide layouts, all five guide steps, 320–480 px phone widths, landscape, Android insets and 200% Filipino text; no overflow, hidden tips or covered footer controls.`);
} finally { await browser.close(); }
