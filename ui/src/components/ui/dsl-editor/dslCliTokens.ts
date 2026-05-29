import { ExternalTokenizer } from '@lezer/lr'

import {
  CliValueToken,
  EqSign,
  LongFlag,
  ShortFlag,
} from './dslParser.terms'

function isValueChar(ch: number) {
  return (ch >= 48 && ch <= 57)
    || (ch >= 65 && ch <= 90)
    || (ch >= 97 && ch <= 122)
    || ch === 95
    || ch === 46
    || ch === 47
    || ch === 58
    || ch === 61
    || ch === 64
    || ch === 37
    || ch === 45
}

function isFlagNameChar(ch: number) {
  return (ch >= 48 && ch <= 57)
    || (ch >= 65 && ch <= 90)
    || (ch >= 97 && ch <= 122)
    || ch === 45
}

function canShiftCliToken(stack: { canShift: (term: number) => boolean }, ...terms: number[]) {
  return terms.some(term => stack.canShift(term))
}

export const cliTokens = new ExternalTokenizer((input, stack) => {
  if (!canShiftCliToken(stack, ShortFlag, LongFlag, EqSign, CliValueToken)) {
    return
  }

  const next = input.next
  if (next < 0) {
    return
  }

  if (next === 61) {
    if (stack.canShift(EqSign)) {
      input.advance()
      input.acceptToken(EqSign)
    }
    return
  }

  if (next === 45) {
    if (input.peek(1) === 45) {
      if (!stack.canShift(LongFlag)) {
        return
      }
      input.advance()
      input.advance()
      if (!isFlagNameChar(input.next)) {
        return
      }
      while (isFlagNameChar(input.next)) {
        input.advance()
      }
      input.acceptToken(LongFlag)
      return
    }

    if (!stack.canShift(ShortFlag)) {
      return
    }
    input.advance()
    if (!((input.next >= 65 && input.next <= 90) || (input.next >= 97 && input.next <= 122))) {
      return
    }
    while ((input.next >= 65 && input.next <= 90) || (input.next >= 97 && input.next <= 122)) {
      input.advance()
    }
    input.acceptToken(ShortFlag)
    return
  }

  if (!stack.canShift(CliValueToken) || !isValueChar(next)) {
    return
  }

  input.advance()
  while (isValueChar(input.next)) {
    input.advance()
  }
  input.acceptToken(CliValueToken)
}, { contextual: true })
