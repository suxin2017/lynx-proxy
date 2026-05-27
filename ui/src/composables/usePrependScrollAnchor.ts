import { type MaybeRefOrGetter, type Ref, toValue, watch } from 'vue'
import {
  computeAnchoredScrollTop,
  resolvePrependScrollShift,
  resolveShouldAnchorOnPrepend,
} from '@/lib/list-scroll-anchor'

export interface UsePrependScrollAnchorOptions<T> {
  scrollEl: Ref<HTMLElement | null>
  items: Ref<readonly T[]>
  rowHeight: MaybeRefOrGetter<number>
  getId: (item: T) => string
  anchorMode?: MaybeRefOrGetter<boolean | 'auto' | undefined>
  selectedRowId?: MaybeRefOrGetter<string | undefined>
}

export function usePrependScrollAnchor<T>(options: UsePrependScrollAnchorOptions<T>) {
  let previousItems: readonly T[] = []

  watch(
    options.items,
    (nextItems) => {
      const scrollEl = options.scrollEl.value
      if (!scrollEl) {
        previousItems = nextItems
        return
      }

      const selectedRowId = toValue(options.selectedRowId)
      const scrollShift = resolvePrependScrollShift(
        previousItems,
        nextItems,
        options.getId,
        selectedRowId,
      )
      previousItems = nextItems

      if (scrollShift <= 0) {
        return
      }

      const scrollTop = scrollEl.scrollTop
      const shouldAnchor = resolveShouldAnchorOnPrepend(
        toValue(options.anchorMode),
        scrollTop,
        selectedRowId,
      )

      if (!shouldAnchor) {
        return
      }

      const nextScrollTop = computeAnchoredScrollTop(
        scrollTop,
        scrollShift,
        toValue(options.rowHeight),
      )

      requestAnimationFrame(() => {
        const el = options.scrollEl.value
        if (!el) {
          return
        }

        el.scrollTop = nextScrollTop
      })
    },
    { flush: 'post' },
  )
}
