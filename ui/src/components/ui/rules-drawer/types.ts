import type { RuleHandlerType } from '@/components/ui/rule-workbench'

export interface ActionAssetTemplate {
  id: string
  name: string
  description: string
  category: string
  type: RuleHandlerType
  seedConfig?: unknown
}

