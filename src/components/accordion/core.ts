// ============================================
// Accordion Core - 순수 함수 모듈
// ============================================

export type ItemId = string

export type AccordionState = {
  expandedIds: Set<ItemId>
  focusedId: ItemId | null
}

// ============================================
// 상태 생성
// ============================================

export function createAccordionState(
  defaultExpanded: ItemId[] = [],
): AccordionState {
  return {
    expandedIds: new Set(defaultExpanded),
    focusedId: null,
  }
}

// ============================================
// 상태 업데이트
// ============================================

export function expand(state: AccordionState, itemId: ItemId): AccordionState {
  const newExpanded = new Set(state.expandedIds)
  newExpanded.add(itemId)
  return { ...state, expandedIds: newExpanded }
}

export function collapse(state: AccordionState, itemId: ItemId): AccordionState {
  const newExpanded = new Set(state.expandedIds)
  newExpanded.delete(itemId)
  return { ...state, expandedIds: newExpanded }
}

export function toggle(state: AccordionState, itemId: ItemId): AccordionState {
  if (state.expandedIds.has(itemId)) {
    return collapse(state, itemId)
  }
  return expand(state, itemId)
}

export function expandOnly(
  state: AccordionState,
  itemId: ItemId,
): AccordionState {
  return { ...state, expandedIds: new Set([itemId]) }
}

export function collapseAll(state: AccordionState): AccordionState {
  return { ...state, expandedIds: new Set() }
}

export function setFocus(
  state: AccordionState,
  itemId: ItemId | null,
): AccordionState {
  return { ...state, focusedId: itemId }
}

export function isExpanded(state: AccordionState, itemId: ItemId): boolean {
  return state.expandedIds.has(itemId)
}
