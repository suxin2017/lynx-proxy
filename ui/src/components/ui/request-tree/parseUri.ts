import type { FlatTreeNode, TrafficRecord, RawNode } from './types'

// ---------------------------------------------------------------------------
// URL → segment array
// ---------------------------------------------------------------------------

/**
 * Parse a URL into a path segment array used to build the prefix tree.
 *
 * Result format: ['https://api.example.com', 'v1', 'users', '123']
 * - Scheme + host + optional port form the first segment
 * - Query string and hash are ignored (not part of tree grouping)
 * - Empty segments from trailing/leading slashes are dropped
 */
export function parseUrlToSegments(url: string): string[] {
  try {
    const parsed = new URL(url)
    const origin = `${parsed.protocol}//${parsed.host}` // includes port if present
    const pathSegments = parsed.pathname
      .split('/')
      .filter(s => s.length > 0)
    return [origin, ...pathSegments]
  }
  catch {
    // Fallback for malformed URLs: treat the whole string as one segment
    return [url]
  }
}

// ---------------------------------------------------------------------------
// Build raw prefix tree
// ---------------------------------------------------------------------------

function makeRawNode(segment: string): RawNode {
  return { segment, children: new Map(), requests: [] }
}

/**
 * Insert a single request into an existing raw prefix tree (root node).
 * This is designed for incremental updates – call it for each new request
 * rather than rebuilding the whole tree.
 */
export function insertRequest(root: RawNode, request: TrafficRecord): void {
  const segments = parseUrlToSegments(request.url)
  let current = root
  for (const seg of segments) {
    if (!current.children.has(seg)) {
      current.children.set(seg, makeRawNode(seg))
    }
    current = current.children.get(seg)!
  }
  // Attach request at the leaf (same URL + method = same leaf)
  const existing = current.requests.find(r => r.id === request.id)
  if (!existing) {
    current.requests.push(request)
  }
}

/**
 * Update (patch) an existing request in the raw tree by id.
 * Walks the tree to find the leaf and replaces the record in place.
 * Returns true if found and updated.
 */
export function updateRequest(root: RawNode, request: TrafficRecord): boolean {
  const segments = parseUrlToSegments(request.url)
  let current = root
  for (const seg of segments) {
    const child = current.children.get(seg)
    if (!child) return false
    current = child
  }
  const idx = current.requests.findIndex(r => r.id === request.id)
  if (idx === -1) return false
  current.requests[idx] = request
  return true
}

// ---------------------------------------------------------------------------
// Compact Folders algorithm: compress single-child chains
// ---------------------------------------------------------------------------

/**
 * Stable id for a group node: hash of the full path string.
 * Using a simple djb2 hash to avoid dependencies.
 */
export function pathToId(fullPath: string): string {
  let hash = 5381
  for (let i = 0; i < fullPath.length; i++) {
    hash = ((hash << 5) + hash) ^ fullPath.charCodeAt(i)
    hash = hash >>> 0 // keep 32-bit unsigned
  }
  return `g_${hash.toString(36)}`
}

/**
 * Truncate a compressed label so it fits within a reasonable display width.
 *
 * Strategy: keep the LAST segments (most specific) and replace removed
 * leading segments with "…". The threshold is segment count based so the
 * result is predictable regardless of pixel width (CSS handles overflow).
 *
 * Examples:
 *   "v1/users/profile/settings/preferences" (6 segs) → "…/settings/preferences"
 *   "api.example.com"                        (1 seg)  → unchanged
 */
export function truncateLabel(label: string, maxSegments = 3): string {
  const parts = label.split('/')
  if (parts.length <= maxSegments) return label
  return `\u2026/${parts.slice(-maxSegments).join('/')}`
}

interface FlattenOptions {
  expandedSet: Set<string>
  depth?: number
  pathPrefix?: string
  result?: FlatTreeNode[]
}

/**
 * Recursively flatten a RawNode subtree into FlatTreeNode[] applying the
 * Compact Folders rule:
 *   - If a node has exactly 1 child and no own requests, merge with child
 *     (accumulate label segments separated by "/") until branching or leaf.
 *   - Nodes with 2+ children or own requests become real tree rows.
 */
export function flattenRawNode(
  node: RawNode,
  options: FlattenOptions,
): FlatTreeNode[] {
  const { expandedSet, depth = 0, pathPrefix = '', result = [] } = options

  // Compact: skip transparent single-child intermediate nodes
  let current = node
  let accumulatedLabel = node.segment
  let fullAccumulated = pathPrefix ? `${pathPrefix}/${node.segment}` : node.segment

  while (current.children.size === 1 && current.requests.length === 0) {
    const [child] = current.children.values()
    accumulatedLabel = `${accumulatedLabel}/${child.segment}`
    fullAccumulated = `${fullAccumulated}/${child.segment}`
    current = child
  }

  const id = pathToId(fullAccumulated)
  const isLeafHost = current.requests.length > 0

  // Count total request records under this (possibly compressed) node
  const childCount = countRequests(current)

  // ── Group node ──────────────────────────────────────────────────────────
  if (current.children.size > 0 || isLeafHost) {
    const expanded = expandedSet.has(id)
    result.push({
      id,
      label: truncateLabel(accumulatedLabel),
      fullLabel: fullAccumulated,
      depth,
      type: 'group',
      expanded,
      childCount,
    })

    if (expanded) {
      // Each request record becomes its own leaf node.
      for (const req of current.requests) {
        result.push(makeLeafNode(req, depth + 1, fullAccumulated))
      }

      for (const child of current.children.values()) {
        flattenRawNode(child, { expandedSet, depth: depth + 1, pathPrefix: fullAccumulated, result })
      }
    }
  }

  return result
}

function makeLeafNode(req: TrafficRecord, depth: number, parentPath: string): FlatTreeNode {
  const requestType = req.requestType?.trim()
  const pathTail = parentPath.split('/').filter(Boolean).at(-1) ?? parentPath
  const leafLabel = pathTail || req.method

  return {
    id: req.id,
    label: leafLabel,
    fullLabel: `${requestType ? `${requestType} · ` : ''}${req.method} ${parentPath}`,
    depth,
    type: 'leaf',
    expanded: false,
    request: req,
  }
}

function countRequests(node: RawNode): number {
  let count = node.requests.length
  for (const child of node.children.values()) {
    count += countRequests(child)
  }
  return count
}

/**
 * Build a complete flat node list from a root RawNode.
 * The root itself is a virtual sentinel (segment = '') and is not emitted.
 */
export function buildFlatTree(root: RawNode, expandedSet: Set<string>): FlatTreeNode[] {
  const result: FlatTreeNode[] = []
  for (const child of root.children.values()) {
    flattenRawNode(child, { expandedSet, depth: 0, pathPrefix: '', result })
  }
  return result
}
