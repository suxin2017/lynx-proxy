#!/usr/bin/env node
/**
 * Capture README UI screenshots with Playwright (uses system Chrome by default).
 *
 * Prereqs: proxy on :7788, Vite on :5173 (or set LYNX_UI_URL).
 */
import { execSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'ui/package.json'))
const { chromium } = require('playwright')
const OUT_DIR = join(ROOT, 'images')
const BASE_URL = process.env.LYNX_UI_URL ?? 'http://localhost:5173'
const VIEWPORT = { width: 1440, height: 900 }
const BROWSER_LAUNCH_OPTS = {
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : { channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome' }),
}

let trafficReady = false

async function ensureRecording(page) {
  const startBtn = page.getByRole('button', { name: 'Start Capture' })
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click()
    await page.waitForTimeout(500)
  }
}

function spawnDemoTraffic() {
  console.log('generating live traffic through proxy...')
  execSync('node scripts/seed-demo-data.mjs', { cwd: ROOT, stdio: 'inherit' })
  execSync('bash scripts/traffic-sample.sh --count 12 --delay 0.08', { cwd: ROOT, stdio: 'inherit' })
  try {
    execSync('bash scripts/traffic-mock.sh', { cwd: ROOT, stdio: 'inherit' })
  } catch {
    console.warn('traffic-mock skipped (mock server may be down)')
  }
  try {
    execSync(
      'cargo run -q -p lynx-mock --example ws_via_proxy',
      { cwd: ROOT, stdio: 'inherit', env: { ...process.env, LYNX_PROXY: 'http://127.0.0.1:7788' } },
    )
  } catch {
    console.warn('ws_via_proxy skipped')
  }
}

async function waitForTraffic(page, { refresh = false } = {}) {
  page.setDefaultTimeout(15_000)
  if (!trafficReady || refresh) {
    await page.goto(`${BASE_URL}/network`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForTimeout(1500)
    await ensureRecording(page)
    if (!trafficReady) {
      spawnDemoTraffic()
    }
    const row = page.locator('[data-slot="virtual-table-row"]').first()
    await row.waitFor({ state: 'visible', timeout: 60_000 })
    trafficReady = true
    await page.waitForTimeout(600)
  }
}

async function clickByTitle(page, title) {
  await page.locator(`button[title="${title}"]`).first().click({ timeout: 8_000 })
  await page.waitForTimeout(400)
}

async function closeDrawer(page) {
  const closeBtn = page.getByRole('button', { name: '关闭抽屉' })
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click()
    await page.waitForTimeout(400)
    return
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}

async function openRulesDrawer(page) {
  const drawerOpen = await page.getByRole('button', { name: '关闭抽屉' }).isVisible().catch(() => false)
  if (!drawerOpen) {
    await clickByTitle(page, 'Rules')
  }
}

async function captureNewHttp(page) {
  await waitForTraffic(page)
  await clickByTitle(page, 'Table View')
  const postRow = page.locator('[data-slot="virtual-table-row"]').filter({ hasText: /POST/i }).first()
  if (await postRow.isVisible().catch(() => false)) {
    await postRow.click()
  }
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(OUT_DIR, 'newhttp.png') })
  console.log('  newhttp.png')
}

async function captureNewTree(page) {
  await waitForTraffic(page)
  await clickByTitle(page, 'Tree View')
  await page.waitForTimeout(600)
  const treeNode = page.getByText(/httpbin/i).first()
  if (await treeNode.isVisible().catch(() => false)) {
    await treeNode.click()
  }
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(OUT_DIR, 'newtree.png') })
  console.log('  newtree.png')
}

async function captureNewWs(page) {
  await waitForTraffic(page)
  const wsRow = page.locator('[data-slot="virtual-table-row"], [data-slot="virtual-table-cell"]')
    .filter({ hasText: /\/ws|websocket/i })
    .first()
  if (await wsRow.isVisible().catch(() => false)) {
    await wsRow.click()
    await page.waitForTimeout(800)
  }
  await page.screenshot({ path: join(OUT_DIR, 'newws.png') })
  console.log('  newws.png')
}

async function captureRule(page) {
  await waitForTraffic(page)
  await openRulesDrawer(page)
  await page.getByRole('tab', { name: 'Rules' }).click().catch(() => {})
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(OUT_DIR, 'rule.png') })
  console.log('  rule.png')
  await closeDrawer(page)
}

async function captureApiDebug(page) {
  await waitForTraffic(page)
  await openRulesDrawer(page)
  await page.getByRole('tab', { name: 'Compose' }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(OUT_DIR, 'api_debug.png') })
  console.log('  api_debug.png')
  await closeDrawer(page)
}

async function captureContextMenu(page) {
  await waitForTraffic(page)
  await clickByTitle(page, 'Table View')
  const target = page.locator('[data-slot="virtual-table-row"]').first()
  const box = await target.boundingBox()
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' })
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(OUT_DIR, 'contextmenu.png') })
    console.log('  contextmenu.png')
    const copySub = page.getByText('复制…').first()
    if (await copySub.isVisible().catch(() => false)) {
      await copySub.hover()
      await page.waitForTimeout(400)
      await page.screenshot({ path: join(OUT_DIR, 'contextmenu2.png') })
      console.log('  contextmenu2.png')
    }
  }
  await page.keyboard.press('Escape')
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch(BROWSER_LAUNCH_OPTS)
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()

  try {
    console.log(`capturing screenshots → ${OUT_DIR} (${BASE_URL}, ${BROWSER_LAUNCH_OPTS.channel ?? 'custom'})`)
    await captureNewHttp(page)
    await captureNewTree(page)
    await captureNewWs(page)
    await captureRule(page)
    await captureApiDebug(page)
    await captureContextMenu(page)
    console.log('done')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
