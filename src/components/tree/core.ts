// ============================================
// TreeView Core - 순수 함수 모듈
// ============================================

export type NodeId = string

export type TreeState = {
  focusedId: NodeId | null
  selectedId: NodeId | null
  expandedIds: Set<NodeId>
}

// ============================================
// 상태 업데이트 헬퍼
// ============================================

export function setFocus(state: TreeState, nodeId: NodeId | null): TreeState {
  return { ...state, focusedId: nodeId }
}

export function expand(state: TreeState, nodeId: NodeId): TreeState {
  const newExpanded = new Set(state.expandedIds)
  newExpanded.add(nodeId)
  return { ...state, expandedIds: newExpanded }
}

export function collapse(state: TreeState, nodeId: NodeId): TreeState {
  const newExpanded = new Set(state.expandedIds)
  newExpanded.delete(nodeId)
  return { ...state, expandedIds: newExpanded }
}

export function select(state: TreeState, nodeId: NodeId | null): TreeState {
  return { ...state, selectedId: nodeId }
}
