import { computed, ref, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import type { FlatTreeNode, TrafficRecord, RawNode } from './types'
import { buildFlatTree, insertRequest, pathToId, updateRequest } from './parseUri'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseRequestTreeOptions {
  /** How many levels deep to auto-expand on mount (default: 1 = root origin) */
  defaultExpandDepth?: number
  /** Debounce delay in ms for batching incoming request updates (default: 100) */
  debounceMs?: number
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useRequestTree(
  requests: Ref<TrafficRecord[]>,
  options: UseRequestTreeOptions = {},
) {
  const { defaultExpandDepth = 1, debounceMs = 100 } = options

  // Internal raw prefix tree (sentinel root, never rendered)
  const rawRoot = ref<RawNode>({ segment: '', children: new Map(), requests: [] })

  // Set of expanded node ids (persisted by full path for stability)
  const expandedSet = ref<Set<string>>(new Set())
  // Map from id to full path for stable expansion
  let idToPath = new Map<string, string>()
  let pathToIdMap = new Map<string, string>()

  // Currently selected request id
  const selectedId = ref<string | undefined>(undefined)

  // Search / filter keyword
  const searchTerm = ref('')

  // ---------------------------------------------------------------------------
  // Debounced incremental update
  // ---------------------------------------------------------------------------

  let pendingIds = new Set<string>()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleFlush() {
    if (debounceTimer !== null) return
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      flushPending()
    }, debounceMs)
  }

  function flushPending() {
    // Before update, record expanded paths
    idToPath.clear()
    pathToIdMap.clear()
    // Build id <-> path mapping from current flatNodes
    const prevFlat = buildFlatTree(rawRoot.value, expandedSet.value)
    for (const node of prevFlat) {
      if (node.type === 'group') {
        idToPath.set(node.id, node.fullLabel)
        pathToIdMap.set(node.fullLabel, node.id)
      }
    }
    const expandedPaths = new Set<string>()
    for (const id of expandedSet.value) {
      const path = idToPath.get(id)
      if (path) expandedPaths.add(path)
    }

    const ids = pendingIds
    pendingIds = new Set()

    for (const id of ids) {
      const req = requests.value.find(r => r.id === id)
      if (!req) continue
      // Try update first (request already in tree), then insert
      const updated = updateRequest(rawRoot.value, req)
      if (!updated) {
        insertRequest(rawRoot.value, req)
        // Auto-expand newly added origin node if within defaultExpandDepth
        autoExpand(rawRoot.value, defaultExpandDepth)
      }
    }

    // Trigger reactivity: replace with a shallow copy so computed re-runs
    rawRoot.value = { ...rawRoot.value }

    // After update, restore expandedSet by matching full paths
    nextTick(() => {
      // Incrementally expand: start with empty, then expand parent paths to reveal children
      let currentExpanded = new Set<string>()
      let iteration = 0
      const maxIterations = 20

      while (expandedPaths.size > 0 && iteration < maxIterations) {
        iteration++
        const newFlat = buildFlatTree(rawRoot.value, currentExpanded)
        const newPathToId = new Map<string, string>()
        for (const node of newFlat) {
          if (node.type === 'group') {
            newPathToId.set(node.fullLabel, node.id)
          }
        }

        let foundNew = false
        for (const path of expandedPaths) {
          const id = newPathToId.get(path)
          if (id && !currentExpanded.has(id)) {
            currentExpanded.add(id)
            foundNew = true
          }
        }

        if (!foundNew) break
      }

      expandedSet.value = currentExpanded
    })
  }

  // ---------------------------------------------------------------------------
  // Auto-expand root levels on initial load
  // ---------------------------------------------------------------------------

  function autoExpand(node: RawNode, depth: number, pathPrefix = '') {
    if (depth <= 0) return
    for (const child of node.children.values()) {
      const fullPath = pathPrefix ? `${pathPrefix}/${child.segment}` : child.segment
      const id = pathToId(fullPath)
      expandedSet.value.add(id)
      autoExpand(child, depth - 1, fullPath)
    }
  }

  // ---------------------------------------------------------------------------
  // Watch incoming requests
  // ---------------------------------------------------------------------------

  // Track known ids to detect new / removed requests
  const knownIds = new Set<string>()

  watch(
    requests,
    (newList) => {
      for (const req of newList) {
        pendingIds.add(req.id)
        knownIds.add(req.id)
      }
      scheduleFlush()
    },
    { immediate: true, deep: false },
  )

  // ---------------------------------------------------------------------------
  // Flat visible nodes (based on expandedSet)
  // ---------------------------------------------------------------------------

  const flatNodes = computed<FlatTreeNode[]>(() => {
    // Access rawRoot.value to track reactivity
    void rawRoot.value
    return buildFlatTree(rawRoot.value, expandedSet.value)
  })

  // ---------------------------------------------------------------------------
  // Filtered nodes (search)
  // ---------------------------------------------------------------------------

  const filteredNodes = computed<FlatTreeNode[]>(() => {
    const term = searchTerm.value.trim().toLowerCase()
    if (!term) return flatNodes.value

    // Collect ids of matching leaf nodes
    const matchingLeafIds = new Set<string>()
    const matchingGroupIds = new Set<string>()

    for (const node of flatNodes.value) {
      if (node.type === 'leaf' && node.request) {
        const haystack = node.fullLabel.toLowerCase()
        if (haystack.includes(term)) {
          matchingLeafIds.add(node.id)
        }
      }
      if (node.type === 'group') {
        const haystack = node.fullLabel.toLowerCase()
        if (haystack.includes(term)) {
          matchingGroupIds.add(node.id)
        }
      }
    }

    if (matchingLeafIds.size === 0 && matchingGroupIds.size === 0) return []

    // Walk flat list: include a group if any of its descendants matched
    // We need ancestor tracking: maintain a stack of (node, depth)
    const result: FlatTreeNode[] = []
    const groupStack: Array<{ node: FlatTreeNode, hasMatch: boolean }> = []

    for (const node of flatNodes.value) {
      // Pop groups that are no longer ancestors
      while (groupStack.length > 0 && groupStack[groupStack.length - 1].node.depth >= node.depth) {
        const popped = groupStack.pop()!
        if (popped.hasMatch) {
          result.push(popped.node)
        }
      }

      if (node.type === 'group') {
        // Defer group; emit only if a descendant matches
        const selfMatch = matchingGroupIds.has(node.id)
        groupStack.push({ node, hasMatch: selfMatch })
      }
      else {
        // Leaf
        if (matchingLeafIds.has(node.id)) {
          // Mark all ancestor groups as having a match
          for (const g of groupStack) {
            g.hasMatch = true
          }
          result.push(node)
        }
      }
    }

    // Flush remaining groups
    for (const g of groupStack) {
      if (g.hasMatch) result.push(g.node)
    }

    // Re-sort to restore depth-first order
    // The above approach emits groups deferred, so we need to rebuild order
    return rebuildOrder(flatNodes.value, result)
  })

  function rebuildOrder(original: FlatTreeNode[], kept: FlatTreeNode[]): FlatTreeNode[] {
    const keptIds = new Set(kept.map(n => n.id))
    return original.filter(n => keptIds.has(n.id))
  }

  // ---------------------------------------------------------------------------
  // Public actions
  // ---------------------------------------------------------------------------

  function toggle(nodeId: string) {
    const set = new Set(expandedSet.value)
    if (set.has(nodeId)) {
      set.delete(nodeId)
    }
    else {
      set.add(nodeId)
    }
    expandedSet.value = set
  }

  function select(requestId: string) {
    selectedId.value = requestId
  }

  function reset() {
    rawRoot.value = { segment: '', children: new Map(), requests: [] }
    expandedSet.value = new Set()
    selectedId.value = undefined
    knownIds.clear()
    pendingIds.clear()
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  return {
    flatNodes,
    filteredNodes,
    searchTerm,
    selectedId,
    expandedSet,
    toggle,
    select,
    reset,
  }
}
