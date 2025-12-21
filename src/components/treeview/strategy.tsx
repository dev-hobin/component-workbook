import type { NodeId } from '../../core/structure-core'
import type { VisibleNode } from '../../core/build-visible-nodes'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

// 트리 키보드/포커스 쪽에서 사용할 최소 state
export type TreeActiveState = {
  activeId: NodeId | null
}

// 트리 구조/컨텍스트 정보
export type TreeViewContext = {
  visibleNodes: VisibleNode[] // 이미 TreeView에서 만든 visibleNodes 그대로
}

// ─────────────────────────────────────────────
// 1) Initial activeId 계산
// ─────────────────────────────────────────────

export function getInitialActiveId(args: {
  state: TreeActiveState
  ctx: TreeViewContext
}): NodeId | null {
  const { state, ctx } = args
  const { activeId } = state
  const { visibleNodes } = ctx

  // 1) 이미 activeId가 있으면 그대로
  if (activeId != null) {
    return activeId
  }

  // 2) 없고, 보이는 노드가 있다면 → 첫 번째 노드
  if (visibleNodes.length > 0) {
    return visibleNodes[0].id
  }

  // 3) 진짜 아무 것도 없으면 null
  return null
}

// ─────────────────────────────────────────────
// 2) ArrowUp/Down/Home/End 이동 전략
// ─────────────────────────────────────────────

export function getNextActiveIdByKey(args: {
  state: TreeActiveState
  ctx: TreeViewContext
  key: string
}): NodeId | null {
  const { state, ctx, key } = args
  const { activeId } = state
  const { visibleNodes } = ctx

  // 보이는 노드가 하나도 없으면 포커스도 없음
  if (visibleNodes.length === 0) {
    return null
  }

  const ids = visibleNodes.map((n) => n.id)
  const currentIndex = activeId ? ids.indexOf(activeId) : -1

  const moveToIndex = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(visibleNodes.length - 1, nextIndex))
    const target = visibleNodes[clamped]
    return target ? target.id : null
  }

  switch (key) {
    case 'ArrowDown': {
      // 아직 activeId가 없으면 첫 번째로
      if (currentIndex === -1) {
        return moveToIndex(0)
      }
      return moveToIndex(currentIndex + 1)
    }

    case 'ArrowUp': {
      // 아직 activeId가 없으면 마지막으로
      if (currentIndex === -1) {
        return moveToIndex(visibleNodes.length - 1)
      }
      return moveToIndex(currentIndex - 1)
    }

    case 'Home': {
      return moveToIndex(0)
    }

    case 'End': {
      return moveToIndex(visibleNodes.length - 1)
    }

    default: {
      // 우리가 다루지 않는 key면 상태 유지
      return activeId
    }
  }
}

export type TreeExpandedState = {
  expandedIds: NodeId[]
}

function addUnique(list: NodeId[], id: NodeId): NodeId[] {
  if (list.includes(id)) return list
  return [...list, id]
}

function removeFrom(list: NodeId[], id: NodeId): NodeId[] {
  if (!list.includes(id)) return list
  return list.filter((x) => x !== id)
}

// 노드 하나를 펼치기
export function expandNode(args: {
  state: TreeExpandedState
  nodeId: NodeId
}): NodeId[] {
  const { state, nodeId } = args
  return addUnique(state.expandedIds, nodeId)
}

// 노드 하나를 접기
export function collapseNode(args: {
  state: TreeExpandedState
  nodeId: NodeId
}): NodeId[] {
  const { state, nodeId } = args
  return removeFrom(state.expandedIds, nodeId)
}

// 토글 (없으면 추가, 있으면 제거)
export function toggleNodeExpanded(args: {
  state: TreeExpandedState
  nodeId: NodeId
}): NodeId[] {
  const { state, nodeId } = args
  if (state.expandedIds.includes(nodeId)) {
    return removeFrom(state.expandedIds, nodeId)
  }
  return addUnique(state.expandedIds, nodeId)
}

export function getNextExpandedIdsByKey(args: {
  state: TreeExpandedState & { activeId: NodeId | null }
  ctx: TreeViewContext
  key: string
}): NodeId[] {
  const { state, ctx, key } = args
  const { expandedIds, activeId } = state
  const { visibleNodes } = ctx

  if (activeId == null) {
    return expandedIds
  }

  const current = visibleNodes.find((node) => node.id === activeId)
  if (!current) {
    return expandedIds
  }

  const isExpanded = expandedIds.includes(activeId)

  if (key === 'ArrowRight') {
    // 자식이 없는 leaf면 아무것도 안 함
    if (!current.hasChildren) {
      return expandedIds
    }

    // 자식이 있고 닫혀 있으면 → 펼침
    if (!isExpanded) {
      return addUnique(expandedIds, activeId)
    }

    // 자식이 있고 이미 열려 있으면 → expandedIds는 그대로
    return expandedIds
  }

  if (key === 'ArrowLeft') {
    // 열린 parent면 → 닫기
    if (current.hasChildren && isExpanded) {
      return removeFrom(expandedIds, activeId)
    }

    // 그 외(leaf이거나 이미 닫혀 있거나 child인 경우) → expandedIds는 그대로
    return expandedIds
  }

  // 우리가 다루지 않는 키면 그대로
  return expandedIds
}

export function getNextActiveIdHorizontalByKey(args: {
  state: TreeActiveState & TreeExpandedState
  ctx: TreeViewContext
  key: string
}): NodeId | null {
  const { state, ctx, key } = args
  const { activeId, expandedIds } = state
  const { visibleNodes } = ctx

  // Left/Right만 처리하는 전략이므로, 그 외 키는 그대로 리턴
  if (key !== 'ArrowRight' && key !== 'ArrowLeft') {
    return activeId
  }

  if (activeId == null) {
    return activeId
  }

  const current = visibleNodes.find((node) => node.id === activeId)
  if (!current) {
    return activeId
  }

  const isExpanded = expandedIds.includes(activeId)

  // ─────────────────────────────────────────────
  // ArrowRight: 열린 parent면 첫 자식으로 이동
  // ─────────────────────────────────────────────
  if (key === 'ArrowRight') {
    // 자식 없으면 아무 변화 없음
    if (!current.hasChildren) {
      return activeId
    }

    // 닫혀 있으면: expand는 다른 전략에서 처리, active는 그대로 둠
    if (!isExpanded) {
      return activeId
    }

    // 열려 있고 자식도 있으면 → 첫 자식으로 이동
    const firstChild = visibleNodes.find((node) => node.parentId === activeId)

    return firstChild ? firstChild.id : activeId
  }

  // ─────────────────────────────────────────────
  // ArrowLeft: child면 부모로, 열린 parent면 그대로
  // ─────────────────────────────────────────────
  if (key === 'ArrowLeft') {
    // 열린 parent & hasChildren:
    //   - 이 경우에는 collapse만 하고, 포커스는 그대로 두는 패턴
    if (current.hasChildren && isExpanded) {
      return activeId
    }

    // child인 경우(parentId가 있는 경우): 부모로 이동
    if (current.parentId != null) {
      return current.parentId
    }

    // root & leaf/닫힘 → 그대로
    return activeId
  }

  // 여기까지 올 일은 없지만 타입상 안전하게
  return activeId
}
