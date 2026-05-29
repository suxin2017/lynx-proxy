import { HighlightStyle, LRLanguage, syntaxHighlighting } from '@codemirror/language'
import { styleTags, Tag, tags as t } from '@lezer/highlight'

import { parser } from './dslParser'

const urlScheme = Tag.define()
const urlHost = Tag.define()
const urlPort = Tag.define()
const urlPath = Tag.define()
const cliFlag = Tag.define()
const cliValue = Tag.define()
/** Highlight colors for DSL tokens (each URL part uses a distinct chart/destructive token). */
export const dslHighlightColors = {
  keyword: 'var(--color-chart-2)',
  scheme: 'var(--color-chart-4)',
  host: 'var(--color-chart-1)',
  port: 'var(--color-chart-5)',
  path: 'var(--color-chart-3)',
  paren: 'var(--color-muted-foreground)',
  comment: 'var(--color-accent-foreground)',
  cliFlag: 'var(--color-primary)',
  cliValue: 'var(--color-destructive)',
} as const

const dslHighlighting = styleTags({
  AndOp: t.keyword,
  OrOp: t.keyword,
  NotOp: t.keyword,
  Scheme: urlScheme,
  Host: urlHost,
  Port: urlPort,
  Path: urlPath,
  LineComment: t.comment,
  ShortFlag: cliFlag,
  LongFlag: cliFlag,
  CliValue: cliValue,
  CliValueToken: cliValue,
  '( )': t.paren,
})

const dslParser = parser.configure({
  props: [dslHighlighting],
})

export const dslLanguage = LRLanguage.define({
  parser: dslParser,
})

const dslHighlight = HighlightStyle.define([
  { tag: t.keyword, color: dslHighlightColors.keyword, fontWeight: '700' },
  { tag: urlScheme, color: dslHighlightColors.scheme, fontWeight: '700' },
  { tag: urlHost, color: dslHighlightColors.host, fontWeight: '650' },
  { tag: urlPort, color: dslHighlightColors.port, fontWeight: '600' },
  { tag: urlPath, color: dslHighlightColors.path },
  { tag: t.comment, color: dslHighlightColors.comment, fontStyle: 'italic' },
  { tag: cliFlag, color: dslHighlightColors.cliFlag, fontWeight: '600' },
  { tag: cliValue, color: dslHighlightColors.cliValue },
  { tag: t.paren, color: dslHighlightColors.paren },
])

export const dslLanguageExtension = [
  dslLanguage,
  syntaxHighlighting(dslHighlight),
]
