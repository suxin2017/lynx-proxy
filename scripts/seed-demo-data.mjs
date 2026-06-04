#!/usr/bin/env node
/**
 * Seed Lynx proxy with demo rules and send a compose request (for README screenshots).
 *
 * Env: LYNX_WS_URL (default ws://127.0.0.1:7788/api/net_request/ws/message-events)
 */
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'ui/package.json'))
const WebSocket = require('ws')

const WS_URL = process.env.LYNX_WS_URL ?? 'ws://127.0.0.1:7788/api/net_request/ws/message-events'
const RULES_FIXTURE = join(ROOT, 'scripts/fixtures/demo-rules.json')

const WS_VERSION = 'v1'
const OPS = {
  rulesListGet: 'rules.list.get',
  rulesSaveSet: 'rules.save.set',
  rulesDelete: 'rules.delete',
  captureControlSet: 'capture.control.set',
  composeRequestSend: 'compose.request.send',
}

function nextId() {
  return randomUUID()
}

function wsCall(ws, op, payload, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const id = nextId()
    const timer = setTimeout(() => reject(new Error(`timeout: ${op}`)), timeoutMs)

    const onMessage = (raw) => {
      let frame
      try {
        frame = JSON.parse(String(raw))
      } catch {
        return
      }
      if (frame.kind === 'event') return
      if (frame.id !== id) return
      ws.off('message', onMessage)
      clearTimeout(timer)
      if (frame.kind === 'error') {
        reject(new Error(frame.error?.message ?? `WS error: ${op}`))
        return
      }
      resolve(frame.payload)
    }

    ws.on('message', onMessage)
    ws.send(JSON.stringify({
      version: WS_VERSION,
      kind: 'request',
      id,
      op,
      timestamp: Date.now(),
      payload,
    }))
  })
}

async function connectWs() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL)
    const timer = setTimeout(() => reject(new Error('WS connect timeout')), 10_000)
    ws.on('open', () => {
      clearTimeout(timer)
      resolve(ws)
    })
    ws.on('error', () => {
      clearTimeout(timer)
      reject(new Error(`WebSocket failed: ${WS_URL}`))
    })
  })
}

async function clearDemoRules(ws) {
  const list = await wsCall(ws, OPS.rulesListGet)
  const rules = list?.rules ?? []
  for (const rule of rules) {
    if (!rule?.id) continue
    const name = rule.name ?? ''
    if (
      name.includes('注入调试')
      || name.includes('拦截 404')
      || name.includes('延迟 800ms')
      || name.includes('代理转发')
      || name.includes('README demo')
    ) {
      await wsCall(ws, OPS.rulesDelete, { ruleId: rule.id })
      console.log(`deleted rule #${rule.id} (${name})`)
    }
  }
}

async function seedRules(ws) {
  const raw = await readFile(RULES_FIXTURE, 'utf8')
  const { rules } = JSON.parse(raw)
  for (const rule of rules) {
    const saved = await wsCall(ws, OPS.rulesSaveSet, rule)
    console.log(`saved rule #${saved?.id ?? '?'} (${rule.name})`)
  }
}

async function seedCompose(ws) {
  const mockHost = process.env.MOCK_HOST ?? '127.0.0.1:3001'
  const payload = {
    name: 'GET /json',
    method: 'GET',
    url: `http://${mockHost}/json`,
    queryParams: [{ key: 'demo', value: 'readme', enabled: true }],
    headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
    body: '',
    timeout: 30,
  }
  const res = await wsCall(ws, OPS.composeRequestSend, payload)
  console.log(`compose: ${res?.status ?? '?'} ${res?.statusText ?? ''}`)
}

async function main() {
  const ws = await connectWs()
  try {
    await wsCall(ws, OPS.captureControlSet, { recording: true })
    console.log('recording enabled')
    await clearDemoRules(ws)
    await seedRules(ws)
    await seedCompose(ws)
  } finally {
    ws.close()
  }
  console.log('seed done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
