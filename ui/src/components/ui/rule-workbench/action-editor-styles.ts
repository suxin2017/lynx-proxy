export const actionEditorLabelClass = 'grid gap-1 text-[11px] text-muted-foreground'

export const actionEditorFieldClass =
  'h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1'

export const actionEditorTextareaClass =
  'rounded-sm border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1'

export const HANDLER_TYPES = [
  'modifyRequest',
  'modifyResponse',
  'block',
  'localFile',
  'proxyForward',
  'delay',
  'throttle',
  'htmlScriptInjector',
] as const
