import { describe, expect, it } from 'vitest'
import {
  computeAnchoredScrollTop,
  countAnchorIndexShift,
  countPrependedItems,
  findAnchorItemIndex,
  resolvePrependScrollShift,
  resolveShouldAnchorOnPrepend,
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
