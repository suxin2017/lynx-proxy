export const DEFAULT_SCROLL_TOP_THRESHOLD = 2

export interface ShouldAnchorScrollOptions {
  hasSelection: boolean
  scrollTop: number
  threshold?: number
}

/**
 * Returns how many items were prepended to the front of `next` relative to `prev`.
 * Returns 0 when the list was cleared, fully replaced, or only updated in place.
 */
export function countPrependedItems<T>(
  prev: readonly T[],
  next: readonly T[],
  getId: (item: T) => string,
): number {
  if (next.length === 0) {
    return 0
  }

  if (prev.length === 0) {
    return next.length
  }

  const anchorId = getId(prev[0])
  let prepended = 0

  for (const item of next) {
    if (getId(item) === anchorId) {
      break
    }
    prepended += 1
  }

  if (prepended === next.length) {
    return 0
  }

  return prepended
}

export function shouldAnchorScrollOnPrepend(options: ShouldAnchorScrollOptions): boolean {
  const threshold = options.threshold ?? DEFAULT_SCROLL_TOP_THRESHOLD
  return options.hasSelection || options.scrollTop > threshold
}

export function resolveShouldAnchorOnPrepend(
  mode: boolean | 'auto' | undefined,
  scrollTop: number,
  selectedRowId?: string,
  threshold = DEFAULT_SCROLL_TOP_THRESHOLD,
): boolean {
  if (mode === false || mode === undefined) {
    return false
  }

  if (mode === true) {
    return true
  }

  return shouldAnchorScrollOnPrepend({
    hasSelection: Boolean(selectedRowId),
    scrollTop,
    threshold,
  })
}

export function findAnchorItemIndex<T>(
  items: readonly T[],
  selectedRowId: string | undefined,
  getId: (item: T) => string,
): number {
  if (!selectedRowId) {
    return -1
  }

  return items.findIndex(item => getId(item) === selectedRowId)
}

export function countAnchorIndexShift(
  prevIndex: number,
  nextIndex: number,
): number {
  if (prevIndex < 0 || nextIndex <= prevIndex) {
    return 0
  }

  return nextIndex - prevIndex
}

export function resolvePrependScrollShift<T>(
  prevItems: readonly T[],
  nextItems: readonly T[],
  getId: (item: T) => string,
  selectedRowId?: string,
): number {
  if (selectedRowId) {
    const prevIndex = findAnchorItemIndex(prevItems, selectedRowId, getId)
    const nextIndex = findAnchorItemIndex(nextItems, selectedRowId, getId)
    const indexShift = countAnchorIndexShift(prevIndex, nextIndex)

    if (indexShift > 0) {
      return indexShift
    }
  }

  return countPrependedItems(prevItems, nextItems, getId)
}

export function computeAnchoredScrollTop(
  scrollTop: number,
  prependedCount: number,
  rowHeight: number,
): number {
  if (prependedCount <= 0 || rowHeight <= 0) {
    return scrollTop
  }

  return scrollTop + (prependedCount * rowHeight)
}
