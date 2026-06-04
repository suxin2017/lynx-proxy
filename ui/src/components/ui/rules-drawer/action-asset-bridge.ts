import { createAction } from '@/components/ui/rule-workbench'
import type { RuleActionDraft } from '@/components/ui/rule-workbench'
import type { ActionAssetTemplate } from './types'

export function actionFromAssetTemplate(
  asset: ActionAssetTemplate,
  order: number,
): RuleActionDraft {
  return createAction({
    type: asset.type,
    enabled: true,
    order,
    config: asset.seedConfig,
  } as Partial<RuleActionDraft>)
}

export function actionDraftFromAssetTemplate(asset: ActionAssetTemplate): RuleActionDraft {
  return createAction({
    id: `asset-edit-${asset.id}`,
    type: asset.type,
    enabled: true,
    order: 1,
    config: asset.seedConfig,
  } as Partial<RuleActionDraft>)
}

export function applyActionDraftToAssetTemplate(
  asset: ActionAssetTemplate,
  action: RuleActionDraft,
  category?: string,
): ActionAssetTemplate {
  return {
    ...asset,
    type: action.type,
    seedConfig: structuredClone(action.config),
    ...(category !== undefined ? { category } : {}),
  }
}

export function assetTemplateFromAction(
  action: RuleActionDraft,
  overrides?: Partial<ActionAssetTemplate>,
): ActionAssetTemplate {
  return {
    id: overrides?.id ?? `asset-${Math.random().toString(36).slice(2, 9)}`,
    name: overrides?.name ?? '未命名资产',
    category: overrides?.category ?? '未分类',
    type: action.type,
    seedConfig: structuredClone(action.config),
  }
}
