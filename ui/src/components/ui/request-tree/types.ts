export type RequestStatus = 'pending' | 'success' | 'error' | 'cancelled'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | string

export interface TrafficRecord {
  id: string
  url: string
  method: HttpMethod
  requestType?: string
  status: RequestStatus
  statusCode?: number
}

/** Internal node used during tree construction (never exposed outside composable) */
export interface RawNode {
  segment: string
  children: Map<string, RawNode>
  requests: TrafficRecord[]
}

/** A single rendered row in the flattened virtual list */
export interface FlatTreeNode {
  /** Unique stable id: path hash for groups, request.id for leaves */
  id: string
  /** Truncation-safe display label (may be `…/b/c` for long paths) */
  label: string
  /** Full untruncated path, used as native title tooltip */
  fullLabel: string
  depth: number
  type: 'group' | 'leaf'
  expanded: boolean
  /** Only set on leaf nodes */
  request?: TrafficRecord
  /** Number of request records under this URL node (shown on group badge) */
  childCount?: number
}
