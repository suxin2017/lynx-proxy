import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

export function useHorizontalScrollHints(
  scrollRef: Ref<HTMLElement | null>,
  deps: () => unknown[] = () => [],
) {
  const canScrollStart = ref(false)
  const canScrollEnd = ref(false)

  function update() {
    const el = scrollRef.value
    if (!el) {
      canScrollStart.value = false
      canScrollEnd.value = false
      return
    }

    const { scrollLeft, scrollWidth, clientWidth } = el
    const overflow = scrollWidth > clientWidth + 1
    canScrollStart.value = overflow && scrollLeft > 2
    canScrollEnd.value = overflow && scrollLeft + clientWidth < scrollWidth - 2
  }

  let observer: ResizeObserver | undefined

  function bind(el: HTMLElement) {
    observer?.disconnect()
    observer = new ResizeObserver(update)
    observer.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    update()
  }

  function unbind(el: HTMLElement) {
    el.removeEventListener('scroll', update)
    observer?.disconnect()
    observer = undefined
  }

  watch(
    scrollRef,
    (el, prev) => {
      if (prev) unbind(prev)
      if (el) bind(el)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    const el = scrollRef.value
    if (el) unbind(el)
  })

  watch(deps, () => {
    requestAnimationFrame(update)
  }, { deep: true })

  return { canScrollStart, canScrollEnd, update }
}
