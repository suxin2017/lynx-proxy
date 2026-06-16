declare module 'sortablejs' {
  interface SortableUtils {
    select: (el: HTMLElement) => void
    deselect: (el: HTMLElement) => void
  }

  const Sortable: {
    utils: SortableUtils
  }

  export default Sortable
}
