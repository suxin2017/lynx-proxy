import { describe, expect, it } from 'vitest'
import {
  computeAnchoredScrollTop,
  computeScrollToBottom,
  computeScrollTopAfterAppendWithSelection,
  countAnchorIndexShift,
  countAppendedItems,
  countPrependedItems,
  countRemovedFromHead,
  computeScrollTopAfterHeadRemoval,
  findAnchorItemIndex,
  hasSameOrderedIds,
  isNearScrollBottom,
  resolvePrependScrollShift,
  resolveShouldAnchorOnPrepend,
  resolveShouldCompensateAppendWithSelection,
  resolveShouldFollowOnAppend,
  shouldAnchorScrollOnPrepend,
} from './list-scroll-anchor'

type Item = { id: string }

const getId = (item: Item) => item.id

describe('countPrependedItems', () => {
  it('counts items prepended before the previous first id', () => {
    const prev = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const next = [{ id: 'x' }, { id: 'y' }, { id: 'a' }, { id: 'b' }, { id: 'c' }]

    expect(countPrependedItems(prev, next, getId)).toBe(2)
  })

  it('returns 0 for in-place updates with the same first id', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next = [{ id: 'a' }, { id: 'b' }]

    expect(countPrependedItems(prev, next, getId)).toBe(0)
  })

  it('counts prepend even when the tail was trimmed', () => {
    const prev = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const next = [{ id: 'x' }, { id: 'a' }, { id: 'b' }]

    expect(countPrependedItems(prev, next, getId)).toBe(1)
  })

  it('returns 0 when the list is cleared', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next: Item[] = []

    expect(countPrependedItems(prev, next, getId)).toBe(0)
  })

  it('returns the full length when prepending into an empty list', () => {
    const prev: Item[] = []
    const next = [{ id: 'a' }, { id: 'b' }]

    expect(countPrependedItems(prev, next, getId)).toBe(2)
  })

  it('returns 0 when the previous anchor id disappears', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next = [{ id: 'x' }, { id: 'y' }, { id: 'z' }]

    expect(countPrependedItems(prev, next, getId)).toBe(0)
  })

  it('returns 0 for tail append only', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

    expect(countPrependedItems(prev, next, getId)).toBe(0)
  })
})

describe('shouldAnchorScrollOnPrepend', () => {
  it('anchors when a row is selected', () => {
    expect(shouldAnchorScrollOnPrepend({ hasSelection: true, scrollTop: 0 })).toBe(true)
  })

  it('anchors when the user has scrolled away from the top', () => {
    expect(shouldAnchorScrollOnPrepend({ hasSelection: false, scrollTop: 40 })).toBe(true)
  })

  it('does not anchor at the top without a selection', () => {
    expect(shouldAnchorScrollOnPrepend({ hasSelection: false, scrollTop: 0 })).toBe(false)
    expect(shouldAnchorScrollOnPrepend({ hasSelection: false, scrollTop: 2 })).toBe(false)
  })
})

describe('resolveShouldAnchorOnPrepend', () => {
  it('respects explicit true/false modes', () => {
    expect(resolveShouldAnchorOnPrepend(true, 0)).toBe(true)
    expect(resolveShouldAnchorOnPrepend(false, 100, 'row-1')).toBe(false)
    expect(resolveShouldAnchorOnPrepend(undefined, 100, 'row-1')).toBe(false)
  })

  it('uses auto rules when mode is auto', () => {
    expect(resolveShouldAnchorOnPrepend('auto', 0, 'row-1')).toBe(true)
    expect(resolveShouldAnchorOnPrepend('auto', 0)).toBe(false)
    expect(resolveShouldAnchorOnPrepend('auto', 20)).toBe(true)
  })
})

describe('resolvePrependScrollShift', () => {
  it('uses selected row index shift when a row is selected', () => {
    const prev = [{ id: 'a' }, { id: 'selected' }, { id: 'c' }]
    const next = [{ id: 'x' }, { id: 'a' }, { id: 'selected' }, { id: 'c' }]

    expect(resolvePrependScrollShift(prev, next, getId, 'selected')).toBe(1)
  })

  it('falls back to prepend count when there is no selection', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next = [{ id: 'x' }, { id: 'a' }, { id: 'b' }]

    expect(resolvePrependScrollShift(prev, next, getId)).toBe(1)
  })
})

describe('findAnchorItemIndex', () => {
  it('finds the selected item index', () => {
    const items = [{ id: 'a' }, { id: 'selected' }]

    expect(findAnchorItemIndex(items, 'selected', getId)).toBe(1)
    expect(findAnchorItemIndex(items, undefined, getId)).toBe(-1)
  })
})

describe('countAnchorIndexShift', () => {
  it('returns the positive index delta', () => {
    expect(countAnchorIndexShift(2, 5)).toBe(3)
    expect(countAnchorIndexShift(-1, 2)).toBe(0)
    expect(countAnchorIndexShift(4, 4)).toBe(0)
  })
})

describe('computeAnchoredScrollTop', () => {
  it('adds row height for each prepended item', () => {
    expect(computeAnchoredScrollTop(120, 3, 20)).toBe(180)
  })

  it('returns the original scrollTop when nothing was prepended', () => {
    expect(computeAnchoredScrollTop(120, 0, 20)).toBe(120)
  })
})

describe('countAppendedItems', () => {
  it('counts items appended after the previous last id', () => {
    const prev = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const next = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'x' }, { id: 'y' }]

    expect(countAppendedItems(prev, next, getId)).toBe(2)
  })

  it('returns 0 for in-place updates with the same last id', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next = [{ id: 'a' }, { id: 'b' }]

    expect(countAppendedItems(prev, next, getId)).toBe(0)
  })

  it('returns 0 for head prepend only', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next = [{ id: 'x' }, { id: 'a' }, { id: 'b' }]

    expect(countAppendedItems(prev, next, getId)).toBe(0)
  })

  it('returns the full length when appending into an empty list', () => {
    const prev: Item[] = []
    const next = [{ id: 'a' }, { id: 'b' }]

    expect(countAppendedItems(prev, next, getId)).toBe(2)
  })
})

describe('isNearScrollBottom', () => {
  it('returns true when within the bottom threshold', () => {
    const scrollEl = {
      scrollHeight: 500,
      clientHeight: 200,
      scrollTop: 290,
    } as HTMLElement

    expect(isNearScrollBottom(scrollEl, 24)).toBe(true)
  })

  it('returns false when far from the bottom', () => {
    const scrollEl = {
      scrollHeight: 500,
      clientHeight: 200,
      scrollTop: 0,
    } as HTMLElement

    expect(isNearScrollBottom(scrollEl, 24)).toBe(false)
  })
})

describe('countRemovedFromHead', () => {
  it('counts items removed before the new first id', () => {
    const prev = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const next = [{ id: 'b' }, { id: 'c' }]

    expect(countRemovedFromHead(prev, next, getId)).toBe(1)
  })

  it('returns 0 when the first id is unchanged', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

    expect(countRemovedFromHead(prev, next, getId)).toBe(0)
  })

  it('returns 0 for tail append only', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

    expect(countRemovedFromHead(prev, next, getId)).toBe(0)
  })
})

describe('computeScrollTopAfterHeadRemoval', () => {
  it('subtracts row height for each removed item', () => {
    expect(computeScrollTopAfterHeadRemoval(120, 3, 20)).toBe(60)
  })

  it('does not go below zero', () => {
    expect(computeScrollTopAfterHeadRemoval(30, 3, 20)).toBe(0)
  })
})

describe('resolveShouldFollowOnAppend', () => {
  it('respects explicit true/false modes', () => {
    expect(resolveShouldFollowOnAppend(true, null)).toBe(true)
    expect(resolveShouldFollowOnAppend(false, null)).toBe(false)
    expect(resolveShouldFollowOnAppend(undefined, null)).toBe(false)
  })

  it('does not follow when a row is selected', () => {
    const nearBottom = {
      scrollHeight: 500,
      clientHeight: 200,
      scrollTop: 290,
    } as HTMLElement

    expect(resolveShouldFollowOnAppend('auto', nearBottom, 'selected')).toBe(false)
    expect(resolveShouldFollowOnAppend(true, nearBottom, 'selected')).toBe(false)
  })

  it('uses auto rules when mode is auto', () => {
    const nearBottom = {
      scrollHeight: 500,
      clientHeight: 200,
      scrollTop: 290,
    } as HTMLElement
    const farFromBottom = {
      scrollHeight: 500,
      clientHeight: 200,
      scrollTop: 0,
    } as HTMLElement

    expect(resolveShouldFollowOnAppend('auto', nearBottom)).toBe(true)
    expect(resolveShouldFollowOnAppend('auto', farFromBottom)).toBe(false)
  })
})

describe('computeScrollToBottom', () => {
  it('returns scrollHeight minus clientHeight', () => {
    const scrollEl = {
      scrollHeight: 500,
      clientHeight: 200,
      scrollTop: 0,
    } as HTMLElement

    expect(computeScrollToBottom(scrollEl)).toBe(300)
  })
})

describe('hasSameOrderedIds', () => {
  it('returns true when ids match in the same order', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next = [{ id: 'a' }, { id: 'b' }]

    expect(hasSameOrderedIds(prev, next, getId)).toBe(true)
  })

  it('returns false when length differs', () => {
    const prev = [{ id: 'a' }]
    const next = [{ id: 'a' }, { id: 'b' }]

    expect(hasSameOrderedIds(prev, next, getId)).toBe(false)
  })

  it('returns false when order changes', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const next = [{ id: 'b' }, { id: 'a' }]

    expect(hasSameOrderedIds(prev, next, getId)).toBe(false)
  })
})

describe('resolveShouldCompensateAppendWithSelection', () => {
  it('returns true when a row is selected and near the bottom', () => {
    const nearBottom = {
      scrollHeight: 500,
      clientHeight: 200,
      scrollTop: 290,
    } as HTMLElement

    expect(resolveShouldCompensateAppendWithSelection(nearBottom, 'selected')).toBe(true)
  })

  it('returns false without a selection', () => {
    const nearBottom = {
      scrollHeight: 500,
      clientHeight: 200,
      scrollTop: 290,
    } as HTMLElement

    expect(resolveShouldCompensateAppendWithSelection(nearBottom)).toBe(false)
  })

  it('returns false when far from the bottom', () => {
    const farFromBottom = {
      scrollHeight: 500,
      clientHeight: 200,
      scrollTop: 0,
    } as HTMLElement

    expect(resolveShouldCompensateAppendWithSelection(farFromBottom, 'selected')).toBe(false)
  })
})

describe('computeScrollTopAfterAppendWithSelection', () => {
  it('adds row height for each appended item', () => {
    expect(computeScrollTopAfterAppendWithSelection(280, 1, 20)).toBe(300)
  })

  it('returns the original scrollTop when nothing was appended', () => {
    expect(computeScrollTopAfterAppendWithSelection(280, 0, 20)).toBe(280)
  })
})

describe('in-place status update', () => {
  it('treats same-order same-length lists as no structural change', () => {
    const prev = [{ id: 'a' }, { id: 'selected' }, { id: 'c' }]
    const next = [{ id: 'a' }, { id: 'selected' }, { id: 'c' }]

    expect(hasSameOrderedIds(prev, next, getId)).toBe(true)
    expect(countPrependedItems(prev, next, getId)).toBe(0)
    expect(countAppendedItems(prev, next, getId)).toBe(0)
    expect(countRemovedFromHead(prev, next, getId)).toBe(0)
    expect(resolvePrependScrollShift(prev, next, getId, 'selected')).toBe(0)
  })
})
