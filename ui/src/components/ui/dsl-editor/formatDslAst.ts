import type {
  DslAndExpr,
  DslCliArg,
  DslCliArgValue,
  DslCliArgs,
  DslExpr,
  DslNotExpr,
  DslOrExpr,
  DslPrimary,
  DslProgram,
  DslSpan,
  DslSpanned,
  DslUrl,
} from './dslAstTypes'
import { isDslWasmLoaded, parseDslProgram } from './dslWasm'

function indent(depth: number) {
  return '  '.repeat(depth)
}

function formatSnippet(source: string, span: DslSpan) {
  const text = source.slice(span.start, span.end).replace(/\n/g, '\\n')
  if (!text) {
    return ''
  }
  if (text.length > 48) {
    return `${text.slice(0, 48)}…`
  }
  return text
}

function spanSuffix(source: string, span: DslSpan) {
  const snippet = formatSnippet(source, span)
  return `${snippet ? ` "${snippet}"` : ''} @${span.start}-${span.end}`
}

function pushSpanned(
  lines: string[],
  depth: number,
  label: string,
  source: string,
  spanned: DslSpanned<string>,
) {
  lines.push(`${indent(depth)}${label}${spanSuffix(source, spanned.span)}`)
}

function formatCliArgValue(
  lines: string[],
  depth: number,
  source: string,
  value: DslCliArgValue,
) {
  if ('Eq' in value) {
    pushSpanned(lines, depth, 'CliValue', source, value.Eq)
    return
  }
  pushSpanned(lines, depth, 'CliValue', source, value.Bare)
}

function formatCliArg(lines: string[], depth: number, source: string, arg: DslCliArg) {
  const flagKind = arg.flag.value.startsWith('--') ? 'LongFlag' : 'ShortFlag'
  pushSpanned(lines, depth, flagKind, source, arg.flag)
  if (arg.value) {
    formatCliArgValue(lines, depth + 1, source, arg.value)
  }
}

function formatCliArgs(lines: string[], depth: number, source: string, cli: DslCliArgs) {
  lines.push(`${indent(depth)}CliArgs${spanSuffix(source, cli.span)}`)
  for (const arg of cli.args) {
    formatCliArg(lines, depth + 1, source, arg)
  }
}

function formatUrl(lines: string[], depth: number, source: string, url: DslUrl) {
  lines.push(`${indent(depth)}Url${spanSuffix(source, url.span)}`)
  if (url.scheme) {
    pushSpanned(lines, depth + 1, 'Scheme', source, url.scheme)
  }
  if (url.host) {
    pushSpanned(lines, depth + 1, 'Host', source, url.host)
  }
  if (url.port) {
    pushSpanned(lines, depth + 1, 'Port', source, url.port)
  }
  if (url.path) {
    pushSpanned(lines, depth + 1, 'Path', source, url.path)
  }
}

function formatPrimary(lines: string[], depth: number, source: string, primary: DslPrimary) {
  if ('CliOnly' in primary) {
    formatCliArgs(lines, depth, source, primary.CliOnly)
    return
  }
  if ('Url' in primary) {
    formatUrl(lines, depth, source, primary.Url.url)
    if (primary.Url.cli) {
      formatCliArgs(lines, depth + 1, source, primary.Url.cli)
    }
    return
  }
  lines.push(`${indent(depth)}Grouped${spanSuffix(source, primary.Grouped.span)}`)
  formatExpr(lines, depth + 1, source, primary.Grouped)
}

function formatNotExpr(lines: string[], depth: number, source: string, notExpr: DslNotExpr) {
  if ('Not' in notExpr) {
    lines.push(`${indent(depth)}Not${spanSuffix(source, notExpr.Not.span)}`)
    formatNotExpr(lines, depth + 1, source, notExpr.Not.inner)
    return
  }
  formatPrimary(lines, depth, source, notExpr.Primary)
}

function formatAndExpr(lines: string[], depth: number, source: string, andExpr: DslAndExpr) {
  lines.push(`${indent(depth)}AndExpr${spanSuffix(source, andExpr.span)}`)
  for (const term of andExpr.terms) {
    formatNotExpr(lines, depth + 1, source, term)
  }
}

function formatOrExpr(lines: string[], depth: number, source: string, orExpr: DslOrExpr) {
  lines.push(`${indent(depth)}OrExpr${spanSuffix(source, orExpr.span)}`)
  for (const branch of orExpr.branches) {
    formatAndExpr(lines, depth + 1, source, branch)
  }
}

function formatExpr(lines: string[], depth: number, source: string, expr: DslExpr) {
  lines.push(`${indent(depth)}Expr${spanSuffix(source, expr.span)}`)
  formatOrExpr(lines, depth + 1, source, expr.or)
}

export function formatDslAst(source: string) {
  if (!source.trim()) {
    return '(empty)'
  }

  if (!isDslWasmLoaded()) {
    return '(WASM not loaded — run npm run dsl:build)'
  }

  const program = parseDslProgram(source) as DslProgram | null
  if (!program) {
    return '(parse error)'
  }

  const lines = ['Program']
  if (!program.expr) {
    lines.push('  (no expression)')
    return lines.join('\n')
  }

  formatExpr(lines, 1, source, program.expr)
  return lines.join('\n')
}
