import type { InjectionKey } from 'vue'
import type {
  ApiRequestDraft,
  CollectionNode,
} from './types'
import type {
  CreateCollectionNodeBody,
  MoveCollectionNodeBody,
} from '@/lib/http/api-studio-api'

export interface CollectionPersistence {
  createNode: (body: CreateCollectionNodeBody) => Promise<CollectionNode>
  renameNode: (id: string, name: string) => Promise<CollectionNode>
  moveNode: (id: string, body: MoveCollectionNodeBody) => Promise<CollectionNode>
  deleteNode: (id: string) => Promise<void>
  loadDraft: (draftId: string) => Promise<ApiRequestDraft>
  saveDraft: (draftId: string, draft: ApiRequestDraft) => Promise<void>
}

export const COLLECTION_PERSISTENCE_KEY: InjectionKey<CollectionPersistence> = Symbol(
  'apiStudioCollectionPersistence',
)
