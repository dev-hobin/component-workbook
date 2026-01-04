// ============================================
// TreeView Core - 순수 함수 모듈
// ============================================
// React/DOM 없이 트리뷰의 모든 로직을 담당
// Functional Core / Imperative Shell 패턴의 Core 부분
// ============================================

// === 기본 타입 ===
export type NodeId = string
export type TreeNode = {
  id: NodeId
  children: NodeId[]
}

export type TreeShape = {
  rootIds: NodeId[]
  nodesById: Record<NodeId, TreeNode>
}

export type TreeState = {
  focusedId: NodeId | null
  selectedId: NodeId | null
  expandedIds: Set<NodeId>
}

// === 파생 타입 ===

export type VisibleNode = {
  id: NodeId
  level: number
  isLeaf: boolean
  isExpanded: boolean
  isSelected: boolean
  isFocused: boolean
}

// ============================================
// 파생 함수
// ============================================

/**
 * 현재 상태에서 화면에 보이는 노드 목록을 계산
 * DFS preorder traversal로 위에서 아래 순서
 */
export function getVisibleNodes(
  shape: TreeShape,
  state: TreeState,
): VisibleNode[] {
  const result: VisibleNode[] = []

  function visit(nodeId: NodeId, level: number): void {
    const node = shape.nodesById[nodeId]
    const isLeaf = node.children.length === 0
    const isExpanded = !isLeaf && state.expandedIds.has(nodeId)

    result.push({
      id: nodeId,
      level,
      isLeaf,
      isExpanded,
      isSelected: state.selectedId === nodeId,
      isFocused: state.focusedId === nodeId,
    })

    // 펼쳐진 parent면 자식들 방문
    if (isExpanded) {
      for (const childId of node.children) {
        visit(childId, level + 1)
      }
    }
  }

  // 루트들부터 시작
  for (const rootId of shape.rootIds) {
    visit(rootId, 1)
  }

  return result
}

/**
 * 노드의 부모 ID를 찾음
 * 없으면 null (root 노드)
 */
export function getParentId(shape: TreeShape, nodeId: NodeId): NodeId | null {
  for (const [id, node] of Object.entries(shape.nodesById)) {
    if (node.children.includes(nodeId)) {
      return id
    }
  }
  return null
}

// ============================================
// 상태 업데이트 헬퍼
// ============================================

export function setFocus(state: TreeState, nodeId: NodeId | null): TreeState {
  return {
    ...state,
    focusedId: nodeId,
  }
}

export function expand(state: TreeState, nodeId: NodeId): TreeState {
  const newExpanded = new Set(state.expandedIds)
  newExpanded.add(nodeId)
  return {
    ...state,
    expandedIds: newExpanded,
  }
}

export function collapse(state: TreeState, nodeId: NodeId): TreeState {
  const newExpanded = new Set(state.expandedIds)
  newExpanded.delete(nodeId)
  return {
    ...state,
    expandedIds: newExpanded,
  }
}

export function selectFocused(state: TreeState): TreeState {
  return {
    ...state,
    selectedId: state.focusedId,
  }
}

// ============================================
// 포커스 이동 연산
// ============================================

export function moveFocusDown(shape: TreeShape, state: TreeState): TreeState {
  const visible = getVisibleNodes(shape, state)

  if (visible.length === 0) {
    return state
  }

  // focusedId가 없으면 첫 번째로
  if (state.focusedId === null) {
    return setFocus(state, visible[0].id)
  }

  // 현재 위치 찾기
  const currentIndex = visible.findIndex((n) => n.id === state.focusedId)

  // 못 찾았으면 첫 번째로
  if (currentIndex === -1) {
    return setFocus(state, visible[0].id)
  }

  // 마지막이면 그대로
  if (currentIndex === visible.length - 1) {
    return state
  }

  // 다음으로 이동
  return setFocus(state, visible[currentIndex + 1].id)
}

export function moveFocusUp(shape: TreeShape, state: TreeState): TreeState {
  const visible = getVisibleNodes(shape, state)

  if (visible.length === 0) {
    return state
  }

  // focusedId가 없으면 첫 번째로
  if (state.focusedId === null) {
    return setFocus(state, visible[0].id)
  }

  // 현재 위치 찾기
  const currentIndex = visible.findIndex((n) => n.id === state.focusedId)

  // 못 찾았으면 첫 번째로
  if (currentIndex === -1) {
    return setFocus(state, visible[0].id)
  }

  // 첫 번째면 그대로
  if (currentIndex === 0) {
    return state
  }

  // 이전으로 이동
  return setFocus(state, visible[currentIndex - 1].id)
}

export function moveFocusFirst(shape: TreeShape, state: TreeState): TreeState {
  const visible = getVisibleNodes(shape, state)

  if (visible.length === 0) {
    return setFocus(state, null)
  }

  return setFocus(state, visible[0].id)
}

export function moveFocusLast(shape: TreeShape, state: TreeState): TreeState {
  const visible = getVisibleNodes(shape, state)

  if (visible.length === 0) {
    return setFocus(state, null)
  }

  return setFocus(state, visible[visible.length - 1].id)
}

// ============================================
// 방향키 처리
// ============================================

export function handleRight(shape: TreeShape, state: TreeState): TreeState {
  if (state.focusedId === null) {
    return state
  }

  const node = shape.nodesById[state.focusedId]
  const isLeaf = node.children.length === 0

  // leaf면 아무것도 안 함
  if (isLeaf) {
    return state
  }

  const isExpanded = state.expandedIds.has(state.focusedId)

  // 닫혀있으면 펼침
  if (!isExpanded) {
    return expand(state, state.focusedId)
  }

  // 열려있으면 첫 번째 자식으로 이동
  const firstChildId = node.children[0]
  return setFocus(state, firstChildId)
}

export function handleLeft(shape: TreeShape, state: TreeState): TreeState {
  if (state.focusedId === null) {
    return state
  }

  const node = shape.nodesById[state.focusedId]
  const isLeaf = node.children.length === 0
  const isExpanded = !isLeaf && state.expandedIds.has(state.focusedId)

  // 열려있는 parent면 접음
  if (isExpanded) {
    return collapse(state, state.focusedId)
  }

  // 그 외엔 부모로 이동
  const parentId = getParentId(shape, state.focusedId)
  if (parentId === null) {
    return state // root면 아무것도 안 함
  }

  return setFocus(state, parentId)
}
