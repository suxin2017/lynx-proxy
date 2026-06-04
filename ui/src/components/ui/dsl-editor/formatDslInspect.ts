import { formatDslAst } from './formatDslAst'

/** Storybook / debug panel: pretty-printed AST tree from the Rust parser. */
export function formatDslInspect(source: string) {
  return formatDslAst(source)
}
