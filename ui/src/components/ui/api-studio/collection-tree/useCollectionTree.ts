import { computed, ref, watch, type Ref } from 'vue'
import type { CollectionNode, FlatCollectionNode } from '../types'

interface TreeBranch {
  node: CollectionNode
  children: TreeBranch[]
}

function isBranchKind(kind: CollectionNode['kind']): boolean {
  return kind === 'collection' || kind === 'folder'
}

function buildBranches(nodes: CollectionNode[]): TreeBranch[] {
  const byParent = new Map<string | null, CollectionNode[]>()

  for (const node of nodes) {
    const siblings = byParent.get(node.parentId) ?? []
    siblings.push(node)
    byParent.set(node.parentId, siblings)
  }

  function sortNodes(list: CollectionNode[]): CollectionNode[] {
    return [...list].sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0)
      if (orderDiff !== 0) return orderDiff
      const rank = (kind: CollectionNode['kind']) => {
        if (kind === 'collection') return 0
        if (kind === 'folder') return 1
        return 2
      }
      const diff = rank(a.kind) - rank(b.kind)
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name)
    })
  }

  function build(parentId: string | null): TreeBranch[] {
    const children = sortNodes(byParent.get(parentId) ?? [])
    return children.map(node => ({
      node,
      children: isBranchKind(node.kind) ? build(node.id) : [],
    }))
  }

  return build(null)
}

function nodeMatchesSearch(node: CollectionNode, term: string): boolean {
  return node.name.toLowerCase().includes(term)
}

function filterBranches(branches: TreeBranch[], term: string): TreeBranch[] {
  const normalized = term.trim().toLowerCase()
  if (!normalized) return branches

  function filter(branch: TreeBranch): TreeBranch | null {
    const childMatches = branch.children
      .map(filter)
      .filter((item): item is TreeBranch => item !== null)

    if (nodeMatchesSearch(branch.node, normalized) || childMatches.length > 0) {
      return { node: branch.node, children: childMatches }
    }
    return null
  }

  return branches
    .map(filter)
    .filter((item): item is TreeBranch => item !== null)
}

function flattenBranches(
  branches: TreeBranch[],
  expandedSet: Set<string>,
  depth = 0,
): FlatCollectionNode[] {
  const rows: FlatCollectionNode[] = []

  for (const branch of branches) {
    const { node, children } = branch
    const hasChildren = children.length > 0
    const expanded = expandedSet.has(node.id)

    rows.push({
      id: node.id,
      parentId: node.parentId,
      kind: node.kind,
      name: node.name,
      method: node.method,
      draftId: node.draftId,
      depth,
      hasChildren,
      expanded,
    })

    if (hasChildren && expanded) {
      rows.push(...flattenBranches(children, expandedSet, depth + 1))
    }
  }

  return rows
}

function collectExpandableIds(nodes: CollectionNode[]): string[] {
  return nodes.filter(node => isBranchKind(node.kind)).map(node => node.id)
}

export interface UseCollectionTreeOptions {
  defaultExpandAll?: boolean
}

export function useCollectionTree(
  nodes: Ref<CollectionNode[]>,
  options: UseCollectionTreeOptions = {},
) {
  const searchTerm = ref('')
  const expandedSet = ref<Set<string>>(new Set())
  const selectedId = ref<string | undefined>(undefined)

  const branches = computed(() => buildBranches(nodes.value))
  const filteredBranches = computed(() =>
    filterBranches(branches.value, searchTerm.value),
  )

  const flatNodes = computed(() =>
    flattenBranches(filteredBranches.value, expandedSet.value),
  )

  watch(
    nodes,
    (next) => {
      if (options.defaultExpandAll) {
        expandedSet.value = new Set(collectExpandableIds(next))
        return
      }
      if (expandedSet.value.size === 0) {
        expandedSet.value = new Set(
          next.filter(node => node.kind === 'collection').map(node => node.id),
        )
      }
    },
    { immediate: true, deep: true },
  )

  watch(searchTerm, (term) => {
    if (!term.trim()) return
    expandedSet.value = new Set(collectExpandableIds(nodes.value))
  })

  function toggleExpand(id: string) {
    const next = new Set(expandedSet.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    expandedSet.value = next
  }

  function selectNode(id: string) {
    selectedId.value = id
  }

  function nodeById(id: string): CollectionNode | undefined {
    return nodes.value.find(node => node.id === id)
  }

  function expandNode(id: string) {
    const next = new Set(expandedSet.value)
    next.add(id)
    expandedSet.value = next
  }

  return {
    searchTerm,
    expandedSet,
    selectedId,
    flatNodes,
    toggleExpand,
    expandNode,
    selectNode,
    nodeById,
  }
}
