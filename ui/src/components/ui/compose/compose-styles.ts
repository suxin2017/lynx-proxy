export const composeSectionTitleClass =
  'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'

/** Borderless fields — spacing + subtle fill instead of boxes. */
export const composeFieldClass =
  'h-7 rounded-sm bg-muted/35 px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted/55 focus:ring-inset focus:ring-1 focus:ring-ring/40'

export const composeMonoFieldClass = `${composeFieldClass} font-mono`

export const composeTabClass =
  'h-6 rounded-sm px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground'

export const composeTabActiveClass = 'text-foreground'

export const composeGhostButtonClass =
  'h-7 rounded-sm px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'

/** Smaller, table-like actions (e.g. add/remove row). */
export const composeGhostButtonSmClass =
  'h-6 rounded-sm px-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'

export const composePrimaryButtonClass =
  'inline-flex h-7 items-center justify-center gap-1 rounded-sm bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

export const composePanelInsetClass = 'bg-muted/15'

export const composeErrorTextClass = 'text-[10px] leading-relaxed text-destructive'

export const composeHintTextClass = 'text-[10px] leading-relaxed text-muted-foreground'
