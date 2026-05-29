import { describe, expect, it } from 'vitest'

import { parseDsl } from './dslParse'

type NodeSpan = { name: string, from: number, to: number, text: string }

function parseSpans(input: string): NodeSpan[] {
  const tree = parseDsl(input)
  const spans: NodeSpan[] = []

  tree.iterate({
    enter(node) {
      spans.push({
        name: node.type.name,
        from: node.from,
        to: node.to,
        text: input.slice(node.from, node.to),
      })
    },
  })

  return spans
}

function nodeTexts(spans: NodeSpan[], name: string) {
  return spans.filter(span => span.name === name).map(span => span.text)
}

function hasError(spans: NodeSpan[]) {
  return spans.some(span => span.name === '⚠')
}

describe('dsl parser', () => {
  it('parses host-only URL', () => {
    const spans = parseSpans('example.com')
    expect(hasError(spans)).toBe(false)
    expect(nodeTexts(spans, 'Host')).toEqual(['example.com'])
  })

  it('parses host with port and path', () => {
    const input = 'example.com:5678/a'
    const spans = parseSpans(input)

    expect(hasError(spans)).toBe(false)
    expect(nodeTexts(spans, 'Host')).toEqual(['example.com'])
    expect(nodeTexts(spans, 'Port')).toEqual([':5678'])
    expect(nodeTexts(spans, 'Path')).toEqual(['/a'])
  })

  it('parses scheme URL with host, port, and path', () => {
    const input = 'https://example.com:5678/a'
    const spans = parseSpans(input)

    expect(hasError(spans)).toBe(false)
    expect(nodeTexts(spans, 'Scheme')).toEqual(['https://'])
    expect(nodeTexts(spans, 'Host')).toEqual(['example.com'])
    expect(nodeTexts(spans, 'Port')).toEqual([':5678'])
    expect(nodeTexts(spans, 'Path')).toEqual(['/a'])
  })

  it('parses supported schemes', () => {
    for (const scheme of ['http://', 'https://', 'ws://', 'wss://']) {
      const spans = parseSpans(`${scheme}example.com`)
      expect(hasError(spans)).toBe(false)
      expect(nodeTexts(spans, 'Scheme')).toEqual([scheme])
    }
  })

  it('parses path-only operands', () => {
    expect(nodeTexts(parseSpans('/a'), 'Path')).toEqual(['/a'])
    expect(nodeTexts(parseSpans('/a*'), 'Path')).toEqual(['/a*'])
    expect(nodeTexts(parseSpans('/a/'), 'Path')).toEqual(['/a/'])
    expect(parseSpans('/a/').filter(span => span.name === 'Path')).toEqual([
      { name: 'Path', from: 0, to: 3, text: '/a/' },
    ])
  })

  it('parses multi-segment paths in full URLs', () => {
    const url = 'https://example.com/api/v1/events/track'
    const spans = parseSpans(url)

    expect(hasError(spans)).toBe(false)
    expect(nodeTexts(spans, 'Scheme')).toEqual(['https://'])
    expect(nodeTexts(spans, 'Host')).toEqual(['example.com'])
    expect(nodeTexts(spans, 'Path')).toEqual(['/api/v1/events/track'])
  })

  it('parses AND followed by a full URL without path errors', () => {
    const input = 'example.com AND https://example.com/api/v1/events/track'
    expect(hasError(parseSpans(input))).toBe(false)
  })

  it('parses path with trailing slash after host and in OR expressions', () => {
    expect(nodeTexts(parseSpans('example.com/a/'), 'Path')).toEqual(['/a/'])
    expect(nodeTexts(parseSpans('OR /a/'), 'Path')).toEqual(['/a/'])
    expect(nodeTexts(parseSpans('example.com AND /a/'), 'Path')).toEqual(['/a/'])
  })

  it('parses boolean operators and NOT prefix', () => {
    const spans = parseSpans('example.com AND /a OR NOT https://example.com/')

    expect(hasError(spans)).toBe(false)
    expect(nodeTexts(spans, 'AndOp')).toEqual(['AND'])
    expect(nodeTexts(spans, 'OrOp')).toEqual(['OR'])
    expect(nodeTexts(spans, 'NotOp')).toEqual(['NOT'])
  })

  it('does not treat whitespace as AND between operands', () => {
    const spans = parseSpans('example.com /api')

    expect(hasError(spans)).toBe(false)
    expect(nodeTexts(spans, 'AndOp')).toEqual([])
    expect(nodeTexts(spans, 'Host')).toEqual(['example.com'])
    expect(nodeTexts(spans, 'Path')).toEqual(['/api'])
  })

  it('keeps glued host/path as a single URL', () => {
    const spans = parseSpans('example.com/foo')

    expect(hasError(spans)).toBe(false)
    expect(nodeTexts(spans, 'Host')).toEqual(['example.com'])
    expect(nodeTexts(spans, 'Path')).toEqual(['/foo'])
    expect(nodeTexts(spans, 'AndOp')).toEqual([])
  })

  it('gives OR lower precedence than AND', () => {
    const spans = parseSpans('example.com AND /api OR /health')

    expect(hasError(spans)).toBe(false)
    expect(nodeTexts(spans, 'OrOp')).toEqual(['OR'])
    expect(nodeTexts(spans, 'AndOp')).toEqual(['AND'])
  })

  it('parses trailing slash on scheme URL', () => {
    const spans = parseSpans('ws://example.com/')
    expect(hasError(spans)).toBe(false)
    expect(nodeTexts(spans, 'Scheme')).toEqual(['ws://'])
    expect(nodeTexts(spans, 'Path')).toEqual(['/'])
  })

  it('parses grouped OR expression', () => {
    expect(hasError(parseSpans('(example.com OR /a)'))).toBe(false)
  })

  it('parses parenthesized expressions', () => {
    const input = '(example.com OR /a) AND ws://example.com/'
    const spans = parseSpans(input)

    expect(hasError(spans)).toBe(false)
    expect(nodeTexts(spans, 'Host')).toContain('example.com')
    expect(nodeTexts(spans, 'Scheme')).toContain('ws://')
    expect(nodeTexts(spans, 'Path')).toContain('/a')
    expect(nodeTexts(spans, 'Path')).toContain('/')
  })

})
