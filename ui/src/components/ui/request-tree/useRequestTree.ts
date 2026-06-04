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
      if (expandedPaths.size === 0) {
        return
      }

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
  const requestSnapshotById = new Map<string, string>()

  const requestFingerprint = (req: TrafficRecord) => {
    return `${req.method}|${req.url}|${req.status}|${req.statusCode ?? ''}|${req.requestType ?? ''}`
  }

  const rebuildTreeFromList = (list: TrafficRecord[]) => {
    rawRoot.value = { segment: '', children: new Map(), requests: [] }
    for (const req of list) {
      insertRequest(rawRoot.value, req)
    }
    autoExpand(rawRoot.value, defaultExpandDepth)
    rawRoot.value = { ...rawRoot.value }
  }

  watch(
    requests,
    (newList) => {
      const previousKnownIds = new Set(knownIds)
      const currentIds = new Set<string>()
      const addedIds: string[] = []
      let hasRemovals = false

      for (const req of newList) {
        currentIds.add(req.id)
        if (!previousKnownIds.has(req.id)) {
          addedIds.push(req.id)
        }

        const fingerprint = requestFingerprint(req)
        const previous = requestSnapshotById.get(req.id)

        if (previous !== fingerprint) {
          requestSnapshotById.set(req.id, fingerprint)
          pendingIds.add(req.id)
        }

        knownIds.add(req.id)
      }

      for (const id of [...knownIds]) {
        if (!currentIds.has(id)) {
          hasRemovals = true
          knownIds.delete(id)
          requestSnapshotById.delete(id)
        }
      }

      const shouldRebuild = hasRemovals || addedIds.length > 1

      if (shouldRebuild) {
        pendingIds.clear()
        if (debounceTimer !== null) {
          clearTimeout(debounceTimer)
          debounceTimer = null
        }
        rebuildTreeFromList(newList)
        return
      }

      if (pendingIds.size > 0) {
        scheduleFlush()
      }
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
    requestSnapshotById.clear()
    pendingIds.clear()
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  return {
    flatNodes,
    selectedId,
    expandedSet,
    toggle,
    select,
    reset,
  }
}
