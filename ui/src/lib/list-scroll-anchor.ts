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

export const DEFAULT_SCROLL_BOTTOM_THRESHOLD = 24

/**
 * Returns how many items were appended to the tail of `next` relative to `prev`.
 * Returns 0 when the list was cleared, fully replaced, or only updated in place.
 */
export function countAppendedItems<T>(
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

  const anchorId = getId(prev[prev.length - 1])
  let appended = 0

  for (let index = next.length - 1; index >= 0; index -= 1) {
    const item = next[index]
    if (!item) {
      continue
    }

    if (getId(item) === anchorId) {
      break
    }
    appended += 1
  }

  if (appended === next.length) {
    return 0
  }

  return appended
}

export function isNearScrollBottom(
  scrollEl: HTMLElement,
  threshold = DEFAULT_SCROLL_BOTTOM_THRESHOLD,
): boolean {
  const distanceFromBottom =
    scrollEl.scrollHeight - scrollEl.clientHeight - scrollEl.scrollTop

  return distanceFromBottom <= threshold
}

export function resolveShouldFollowOnAppend(
  mode: boolean | 'auto' | undefined,
  scrollEl: HTMLElement | null,
  selectedRowId?: string,
  threshold = DEFAULT_SCROLL_BOTTOM_THRESHOLD,
): boolean {
  if (mode === false || mode === undefined) {
    return false
  }

  if (selectedRowId) {
    return false
  }

  if (mode === true) {
    return true
  }

  if (!scrollEl) {
    return false
  }

  return isNearScrollBottom(scrollEl, threshold)
}

/**
 * Returns how many items were removed from the head of `prev` relative to `next`.
 * Returns 0 when the list was cleared, fully replaced, or only updated in place.
 */
export function countRemovedFromHead<T>(
  prev: readonly T[],
  next: readonly T[],
  getId: (item: T) => string,
): number {
  if (next.length === 0 || prev.length === 0) {
    return 0
  }

  const nextFirstId = getId(next[0])
  const indexInPrev = prev.findIndex(item => getId(item) === nextFirstId)

  if (indexInPrev <= 0) {
    return 0
  }

  return indexInPrev
}

export function computeScrollTopAfterHeadRemoval(
  scrollTop: number,
  removedCount: number,
  rowHeight: number,
): number {
  if (removedCount <= 0 || rowHeight <= 0) {
    return scrollTop
  }

  return Math.max(0, scrollTop - (removedCount * rowHeight))
}

export function computeScrollToBottom(scrollEl: HTMLElement): number {
  return Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
}

/**
 * True when `prev` and `next` have the same length and ids in the same order.
 * Used to skip scroll adjustments for in-place field updates (e.g. status changes).
 */
export function hasSameOrderedIds<T>(
  prev: readonly T[],
  next: readonly T[],
  getId: (item: T) => string,
): boolean {
  if (prev.length !== next.length) {
    return false
  }

  for (let index = 0; index < prev.length; index += 1) {
    const prevItem = prev[index]
    const nextItem = next[index]

    if (!prevItem || !nextItem) {
      return false
    }

    if (getId(prevItem) !== getId(nextItem)) {
      return false
    }
  }

  return true
}

export function resolveShouldCompensateAppendWithSelection(
  scrollEl: HTMLElement | null,
  selectedRowId?: string,
  threshold = DEFAULT_SCROLL_BOTTOM_THRESHOLD,
): boolean {
  if (!selectedRowId || !scrollEl) {
    return false
  }

  return isNearScrollBottom(scrollEl, threshold)
}

export function computeScrollTopAfterAppendWithSelection(
  scrollTop: number,
  appendedCount: number,
  rowHeight: number,
): number {
  if (appendedCount <= 0 || rowHeight <= 0) {
    return scrollTop
  }

  return scrollTop + (appendedCount * rowHeight)
}
