import type { ComposeHttpMethod } from '../types'

const METHOD_COLORS: Record<ComposeHttpMethod, string> = {
  GET: 'text-emerald-600 dark:text-emerald-400',
  POST: 'text-amber-600 dark:text-amber-400',
  PUT: 'text-blue-600 dark:text-blue-400',
  PATCH: 'text-violet-600 dark:text-violet-400',
  DELETE: 'text-red-600 dark:text-red-400',
  HEAD: 'text-slate-500 dark:text-slate-400',
  OPTIONS: 'text-slate-500 dark:text-slate-400',
}

export function methodColorClass(method: ComposeHttpMethod | undefined): string {
  if (!method) return 'text-muted-foreground'
  return METHOD_COLORS[method] ?? 'text-muted-foreground'
}
