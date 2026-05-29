import type { SyntaxNode } from '@lezer/common'

import { parseDsl } from './dslParse'

function formatNodeText(source: string, from: number, to: number) {
  const text = source.slice(from, to).replace(/\n/g, '\\n')
  if (!text) {
    return ''
  }
  if (text.length > 48) {
    return `${text.slice(0, 48)}…`
  }
  return text
}

function appendNode(lines: string[], source: string, node: SyntaxNode, depth: number) {
  const name = node.type.name
  if (name === '⚠') {
    const text = formatNodeText(source, node.from, node.to)
    lines.push(`${'  '.repeat(depth)}⚠ error${text ? ` "${text}"` : ''} @${node.from}-${node.to}`)
    return
  }

  const text = formatNodeText(source, node.from, node.to)
  const range = `@${node.from}-${node.to}`
  lines.push(`${'  '.repeat(depth)}${name}${text ? ` "${text}"` : ''} ${range}`)

  for (let child = node.firstChild; child; child = child.nextSibling) {
    appendNode(lines, source, child, depth + 1)
  }
}

export function formatDslAst(source: string) {
  if (!source.trim()) {
    return '(empty)'
  }

  const tree = parseDsl(source)
  const lines: string[] = ['Program']
  const root = tree.topNode

  for (let child = root.firstChild; child; child = child.nextSibling) {
    appendNode(lines, source, child, 1)
  }

  const hasError = lines.some(line => line.includes('⚠ error'))
  if (hasError) {
    lines.push('', '(parse contains error nodes)')
  }

  return lines.join('\n')
}
