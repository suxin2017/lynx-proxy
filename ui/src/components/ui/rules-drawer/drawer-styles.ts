import { cn } from '@/lib/utils'

/** Flat list row — border only, no shadow/ring stack */
export function drawerListItemClass(selected = false) {
  return cn(
    'rounded-md border px-2.5 py-2 transition-colors',
    selected
      ? 'border-primary/45 bg-primary/5'
      : 'border-transparent bg-muted/25 hover:border-border/60 hover:bg-muted/40',
  )
}

export const drawerEmptyStateClass =
  'rounded-sm border border-dashed border-border/70 bg-muted/15 p-3 text-xs text-muted-foreground'

/** Toolbar title input — border only, no shadow */
export const drawerToolbarInputClass =
  'rounded-sm border border-input bg-background text-xs font-semibold text-foreground outline-none ring-ring placeholder:text-muted-foreground transition-colors hover:border-border focus:ring-1'

/** List search — flat border, no WebKit search inner shadow */
export const drawerSearchInputClass =
  'h-7 w-full rounded-sm border border-input bg-background text-xs text-foreground shadow-none outline-none ring-ring transition-colors placeholder:text-muted-foreground focus:ring-1'

export function drawerFilterChipClass(active = false) {
  return cn(
    'rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors',
    active
      ? 'border-primary/40 bg-primary/10 text-foreground'
      : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
  )
}
