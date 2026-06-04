import { type MaybeRefOrGetter, type Ref, toValue, watch } from 'vue'
import {
  countAppendedItems,
  countRemovedFromHead,
  computeScrollToBottom,
  computeScrollTopAfterAppendWithSelection,
  computeScrollTopAfterHeadRemoval,
  hasSameOrderedIds,
  resolveShouldCompensateAppendWithSelection,
  resolveShouldFollowOnAppend,
} from '@/lib/list-scroll-anchor'

export interface UseTailScrollFollowOptions<T> {
  scrollEl: Ref<HTMLElement | null>
  items: Ref<readonly T[]>
  rowHeight: MaybeRefOrGetter<number>
  getId: (item: T) => string
  followMode?: MaybeRefOrGetter<boolean | 'auto' | undefined>
  selectedRowId?: MaybeRefOrGetter<string | undefined>
}

export function useTailScrollFollow<T>(options: UseTailScrollFollowOptions<T>) {
  let previousItems: readonly T[] = []

  watch(
    options.items,
    (nextItems) => {
      const scrollEl = options.scrollEl.value
      if (!scrollEl) {
        previousItems = nextItems
        return
      }

      if (hasSameOrderedIds(previousItems, nextItems, options.getId)) {
        previousItems = nextItems
        return
      }

      const removedCount = countRemovedFromHead(
        previousItems,
        nextItems,
        options.getId,
      )
      const appendedCount = countAppendedItems(
        previousItems,
        nextItems,
        options.getId,
      )
      const selectedRowId = toValue(options.selectedRowId)
      const rowHeight = toValue(options.rowHeight)
      const shouldCompensateAppend = resolveShouldCompensateAppendWithSelection(
        scrollEl,
        selectedRowId,
      )

      previousItems = nextItems

      if (removedCount <= 0 && appendedCount <= 0) {
        return
      }

      requestAnimationFrame(() => {
        const el = options.scrollEl.value
        if (!el) {
          return
        }

        if (removedCount > 0) {
          el.scrollTop = computeScrollTopAfterHeadRemoval(
            el.scrollTop,
            removedCount,
            rowHeight,
          )
        }

        if (appendedCount <= 0) {
          return
        }

        if (selectedRowId) {
          if (!shouldCompensateAppend) {
            return
          }

          const compensated = computeScrollTopAfterAppendWithSelection(
            el.scrollTop,
            appendedCount,
            rowHeight,
          )
          el.scrollTop = Math.min(compensated, computeScrollToBottom(el))
          return
        }

        const shouldFollow = resolveShouldFollowOnAppend(
          toValue(options.followMode),
          el,
          selectedRowId,
        )

        if (!shouldFollow) {
          return
        }

        el.scrollTop = computeScrollToBottom(el)
      })
    },
    { flush: 'post' },
  )
}
