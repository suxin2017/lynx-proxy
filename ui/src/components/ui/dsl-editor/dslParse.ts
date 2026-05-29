import type { Tree } from '@lezer/common'
import type { LRParser } from '@lezer/lr'

import { parser as generatedParser } from './dslParser'

export function parseDsl(source: string, baseParser: LRParser = generatedParser): Tree {
  return baseParser.parse(source)
}
