import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const protocolPath = path.resolve(repoRoot, 'crates/lynx-core/protocol/ws.v1.asyncapi.yaml')
const outputPath = path.resolve(
  repoRoot,
  'crates/lynx-core/src/self_service/api/generated/ws_v1.rs',
)

const protocolText = fs.readFileSync(protocolPath, 'utf8')

const readEnum = (schemaName) => {
  const schemaBlock = new RegExp(`${schemaName}:[\\s\\S]*?enum:\\s*\\[([^\\]]+)\\]`, 'm')
  const match = protocolText.match(schemaBlock)
  if (!match) {
    throw new Error(`Failed to resolve enum for schema: ${schemaName}`)
  }

  return match[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

const readChannelAddress = () => {
  const addressPattern = /channels:[\s\S]*?address:\s*([^\n]+)/m
  const match = protocolText.match(addressPattern)
  if (!match) {
    throw new Error('Failed to resolve channel address')
  }

  return match[1].trim()
}

const readOps = (kind) => {
  const lines = protocolText.split('\n')
  const startIndex = lines.findIndex((line) => line.trim() === 'x-lynx-ops:')
  if (startIndex < 0) {
    return []
  }

  let inRequestedKind = false
  const ops = []

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]

    if (line.trim().length === 0) {
      continue
    }

    if (!line.startsWith(' ')) {
      break
    }

    if (line.startsWith(`  ${kind}:`)) {
      inRequestedKind = true
      continue
    }

    if (line.startsWith('  ') && !line.startsWith('    ')) {
      inRequestedKind = false
      continue
    }

    if (inRequestedKind && line.startsWith('    - ')) {
      ops.push(line.replace('    - ', '').trim())
    }
  }

  return ops
}

const toRustConstName = (value) => {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase()
}

const [protocolVersion] = readEnum('Version')
if (!protocolVersion) {
  throw new Error('Protocol version is empty')
}

const frameKinds = readEnum('FrameKind')
const requestOps = readOps('request')
const eventOps = readOps('event')
const channelAddress = readChannelAddress()

const frameKindConsts = frameKinds
  .map((kind) => `pub const ${toRustConstName(kind)}: &str = "${kind}";`)
  .join('\n')

const requestOpConsts = requestOps
  .map((op) => `    pub const ${toRustConstName(op)}: &str = "${op}";`)
  .join('\n')

const eventOpConsts = eventOps
  .map((op) => `    pub const ${toRustConstName(op)}: &str = "${op}";`)
  .join('\n')

const requestOpList = requestOps.map((op) => `            "${op}"`).join(' |\n')
const eventOpList = eventOps.map((op) => `            "${op}"`).join(' |\n')

const generated = `// Generated from crates/lynx-core/protocol/ws.v1.asyncapi.yaml. Do not edit manually.

pub const WS_VERSION: &str = "${protocolVersion}";
pub const WS_CHANNEL_ADDRESS: &str = "${channelAddress}";

pub mod frame_kind {
${frameKindConsts}
}

pub mod op {
${requestOpConsts}
${eventOpConsts}

    pub fn is_request_op(op: &str) -> bool {
      matches!(
        op,
${requestOpList}
        )
    }

    pub fn is_event_op(op: &str) -> bool {
      matches!(
        op,
${eventOpList}
        )
    }
}
`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, generated, 'utf8')

process.stdout.write(
  `Generated ${path.relative(repoRoot, outputPath)} from ${path.relative(repoRoot, protocolPath)}\\n`,
)
