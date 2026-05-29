import type { SyntaxNode } from '@lezer/common'

import { parseDsl } from './dslParse'

function sliceNode(source: string, node: SyntaxNode) {
  return source.slice(node.from, node.to)
}

function childByName(node: SyntaxNode, name: string): SyntaxNode | null {
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.type.name === name) {
      return child
    }
  }
  return null
}

function childrenByName(node: SyntaxNode, name: string): SyntaxNode[] {
  const result: SyntaxNode[] = []
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.type.name === name) {
      result.push(child)
    }
  }
  return result
}

function hasParseErrors(source: string) {
  const tree = parseDsl(source)
  let hasError = false
  tree.iterate({
    enter(node) {
      if (node.type.isError) {
        hasError = true
      }
    },
  })
  return hasError
}

function formatAndExpr(node: SyntaxNode, source: string, baseIndent: string): string {
  const parts = childrenByName(node, 'NotExpr').map(part => formatNotExpr(part, source, baseIndent))
  const separator = parts.some(part => part.includes('\n')) ? '\nAND ' : ' AND '
  return parts.join(separator)
}

function formatNotExpr(node: SyntaxNode, source: string, baseIndent: string): string {
  if (childByName(node, 'NotOp')) {
    const inner = node.firstChild?.nextSibling
    if (!inner) {
      return sliceNode(source, node)
    }
    if (inner.type.name === 'NotExpr') {
      return `NOT ${formatNotExpr(inner, source, baseIndent)}`
    }
    if (inner.type.name === 'Primary') {
      return `NOT ${formatPrimary(inner, source, baseIndent)}`
    }
    return `NOT ${sliceNode(source, inner)}`
  }

  const primary = childByName(node, 'Primary')
  if (primary) {
    return formatPrimary(primary, source, baseIndent)
  }
  return sliceNode(source, node)
}

function formatPrimary(node: SyntaxNode, source: string, baseIndent: string): string {
  const expr = childByName(node, 'Expr')
  if (expr) {
    const orNode = childByName(expr, 'OrExpr')
    if (!orNode) {
      return sliceNode(source, node)
    }
    const branches = childrenByName(orNode, 'AndExpr')
    if (branches.length > 1) {
      const innerIndent = `${baseIndent}  `
      const inner = formatOrExpr(orNode, source, innerIndent)
      return `(\n${inner}\n${baseIndent})`
    }
    const inner = formatOrExpr(orNode, source, '')
    return `(${inner})`
  }
  return sliceNode(source, node)
}

function formatOrExpr(node: SyntaxNode, source: string, baseIndent: string): string {
  const branches = childrenByName(node, 'AndExpr')
  if (branches.length === 0) {
    return ''
  }
  if (branches.length === 1) {
    const content = formatAndExpr(branches[0]!, source, baseIndent)
    return baseIndent ? `${baseIndent}${content}` : content
  }

  const formatted = branches.map(branch => formatAndExpr(branch, source, baseIndent))
  let result = baseIndent ? `${baseIndent}${formatted[0]!}` : formatted[0]!
  for (let index = 1; index < formatted.length; index++) {
    const orPrefix = baseIndent ? `\n${baseIndent}OR ` : '\nOR '
    result += `${orPrefix}${formatted[index]!}`
  }
  return result
}

export function formatDsl(source: string): string | null {
  if (!source.trim()) {
    return null
  }

  if (hasParseErrors(source)) {
    return null
  }

  const tree = parseDsl(source)
  const program = tree.topNode
  const expr = childByName(program, 'Expr')
  if (!expr) {
    return source
  }

  const orNode = childByName(expr, 'OrExpr')
  if (!orNode) {
    return null
  }

  const formattedExpr = formatOrExpr(orNode, source, '')
  const before = source.slice(0, expr.from)
  const after = source.slice(expr.to)
  return before + formattedExpr + after
}

export function canFormatDsl(content: string) {
  return formatDsl(content) !== null
}

export function isDslFormatted(content: string) {
  const formatted = formatDsl(content)
  if (formatted === null) {
    return false
  }
  return content === formatted
}

export interface DslFormatValidationResult {
  isValid: boolean
  formattedValue: string | null
}

export function validateDslDocument(content: string): DslFormatValidationResult {
  if (!content.trim()) {
    return {
      isValid: false,
      formattedValue: null,
    }
  }

  if (hasParseErrors(content)) {
    return {
      isValid: false,
      formattedValue: null,
    }
  }

  const formatted = formatDsl(content)
  return {
    isValid: formatted !== null,
    formattedValue: formatted,
  }
}
