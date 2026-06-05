export const apiStudioSectionTitleClass =
  'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'

/** Workbench panel: minimal left inset against the collection split. */
export const apiStudioPanelPadXClass = 'pl-1 pr-2'

export const apiStudioFieldClass =
  'h-7 rounded-sm bg-muted/35 px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted/55 focus:ring-inset focus:ring-1 focus:ring-ring/40'

export const apiStudioMonoFieldClass = `${apiStudioFieldClass} font-mono`

export const apiStudioTabClass =
  'h-6 rounded-sm px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground'

export {
  underlineTabActiveClass as apiStudioUnderlineTabActiveClass,
  underlineTabClass as apiStudioUnderlineTabClass,
  underlineTabIconClass as apiStudioUnderlineTabIconClass,
  underlineTabIdleClass as apiStudioUnderlineTabIdleClass,
  underlineTabListClass as apiStudioUnderlineTabListClass,
} from '@/components/ui/shared/underline-tab-styles'

export const apiStudioEmptyActionClass =
  'h-6 rounded-sm px-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'

export const apiStudioTabActiveClass = 'text-foreground'

export const apiStudioGhostButtonClass =
  'h-7 rounded-sm px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'

export const apiStudioGhostButtonSmClass =
  'h-6 rounded-sm px-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'

/** Square icon-only control aligned with h-7 fields. */
export const apiStudioIconButtonClass =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-40'

export const apiStudioPrimaryButtonClass =
  'inline-flex h-7 items-center justify-center gap-1 rounded-sm bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'

export const apiStudioPanelInsetClass = 'bg-muted/15'

export const apiStudioHintTextClass = 'text-[10px] leading-relaxed text-muted-foreground'

export const apiStudioTreeRowClass =
  'flex h-7 cursor-pointer items-center gap-1 rounded-sm border border-transparent px-1.5 text-xs transition-colors select-none hover:bg-muted/50 hover:border-border/40'

export const apiStudioTreeRowSelectedClass = 'bg-muted/70 border-border/60'

/** Inline rename — matches tree row label (`text-xs`), no chrome. */
export const apiStudioTreeNodeNameClass = 'min-w-0 flex-1 truncate text-xs text-foreground'

export const apiStudioTreeRenameInputClass =
  'min-w-0 flex-1 border-0 bg-transparent p-0 text-xs leading-normal text-foreground shadow-none outline-none ring-0 focus:border-0 focus:ring-0 focus:outline-none'

export const apiStudioSearchInputClass =
  'h-7 w-full rounded-sm border border-border bg-background px-2 text-[10px] font-normal leading-none text-foreground shadow-none outline-none placeholder:text-[10px] placeholder:font-normal placeholder:leading-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring/40 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden'

export const apiStudioToolbarDividerClass = 'mx-0.5 h-4 w-px shrink-0 bg-border/80'

/** Single scrollport for API Studio sidebar body (tree / history). */
export const apiStudioSidebarScrollClass =
  'min-h-0 flex-1 overflow-x-hidden overflow-y-auto'
