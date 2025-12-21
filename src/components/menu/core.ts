// ============================================
// Menu Core - 순수 함수 모듈
// ============================================
// React/DOM 없이 메뉴의 모든 로직을 담당
// Functional Core / Imperative Shell 패턴의 Core 부분
// ============================================

// === 기본 타입 ===

export type MenuId = string
export type ItemId = string

/**
 * 메뉴 상태
 * - openedPath: 열린 메뉴 경로 (루트 → 서브메뉴 순서)
 * - focusedItemId: 현재 포커스된 아이템
 */
export type MenuState = {
  openedPath: MenuId[]
  focusedItemId: ItemId | null
}

/**
 * 메뉴 아이템 정보 (registry에서 가져온 데이터)
 */
export type MenuItem = {
  id: ItemId
  menuId: MenuId // 이 아이템이 속한 메뉴
}

// ============================================
// 상태 생성
// ============================================

export function createMenuState(): MenuState {
  return {
    openedPath: [],
    focusedItemId: null,
  }
}

// ============================================
// 메뉴 열기/닫기
// ============================================

/**
 * 메뉴 열기
 * - 최상위 메뉴면 새 경로 시작
 * - 서브메뉴면 부모 경로 뒤에 추가
 */
export function openMenu(
  state: MenuState,
  menuId: MenuId,
  parentMenuId: MenuId | null,
): MenuState {
  if (parentMenuId === null) {
    // 최상위 메뉴
    return {
      ...state,
      openedPath: [menuId],
    }
  }

  // 서브메뉴: 부모까지의 경로 유지 + 새 메뉴 추가
  const parentIndex = state.openedPath.indexOf(parentMenuId)
  if (parentIndex === -1) {
    // 부모가 없으면 부모 + 자식으로 새 경로
    return {
      ...state,
      openedPath: [parentMenuId, menuId],
    }
  }

  // 부모까지만 남기고 새 메뉴 추가
  const basePath = state.openedPath.slice(0, parentIndex + 1)
  return {
    ...state,
    openedPath: [...basePath, menuId],
  }
}

/**
 * 메뉴 닫기
 * - 해당 메뉴 이후의 모든 서브메뉴도 닫힘
 * - focusedItemId는 유지 (부모 메뉴에서 포커스 복원 시 사용)
 */
export function closeMenu(state: MenuState, menuId: MenuId): MenuState {
  const index = state.openedPath.indexOf(menuId)
  if (index === -1) {
    return state
  }

  return {
    ...state,
    openedPath: state.openedPath.slice(0, index),
    // focusedItemId는 유지하지 않음 - Shell에서 적절히 설정
  }
}

/**
 * 메뉴 닫고 부모 트리거로 포커스 이동
 */
export function closeMenuAndFocusTrigger(
  state: MenuState,
  menuId: MenuId,
): MenuState {
  const index = state.openedPath.indexOf(menuId)
  if (index === -1) {
    return state
  }

  return {
    ...state,
    openedPath: state.openedPath.slice(0, index),
    // 닫히는 메뉴의 ID가 부모 메뉴에서의 서브트리거 아이템 ID
    focusedItemId: menuId,
  }
}

/**
 * 모든 메뉴 닫기
 */
export function closeAll(state: MenuState): MenuState {
  return {
    ...state,
    openedPath: [],
    focusedItemId: null,
  }
}

/**
 * 메뉴가 열려있는지 확인
 */
export function isMenuOpen(state: MenuState, menuId: MenuId): boolean {
  return state.openedPath.includes(menuId)
}

/**
 * 최상위(루트) 메뉴 ID 가져오기
 */
export function getRootMenuId(state: MenuState): MenuId | null {
  return state.openedPath[0] ?? null
}

/**
 * 가장 깊은(활성) 메뉴 ID 가져오기
 */
export function getActiveMenuId(state: MenuState): MenuId | null {
  return state.openedPath[state.openedPath.length - 1] ?? null
}

/**
 * 메뉴가 서브메뉴인지 확인 (루트가 아닌 메뉴)
 */
export function isSubMenu(state: MenuState, menuId: MenuId): boolean {
  const index = state.openedPath.indexOf(menuId)
  return index > 0
}

/**
 * 특정 아이템이 서브메뉴 트리거인지 확인
 * (아이템 ID가 열린 경로에 있으면 해당 아이템은 서브메뉴의 트리거)
 */
export function isSubMenuTrigger(state: MenuState, itemId: ItemId): boolean {
  return state.openedPath.includes(itemId)
}

/**
 * 아이템이 속한 메뉴 찾기
 */
export function getMenuForItem(
  items: MenuItem[],
  itemId: ItemId,
): MenuId | null {
  const item = items.find((i) => i.id === itemId)
  return item?.menuId ?? null
}

// ============================================
// 포커스 이동
// ============================================

/**
 * 포커스 설정
 */
export function setFocus(state: MenuState, itemId: ItemId | null): MenuState {
  return {
    ...state,
    focusedItemId: itemId,
  }
}

/**
 * 다음 아이템으로 포커스 이동 (순환)
 */
export function moveFocusDown(
  state: MenuState,
  items: MenuItem[],
): MenuState {
  if (items.length === 0) {
    return state
  }

  if (state.focusedItemId === null) {
    return setFocus(state, items[0].id)
  }

  const currentIndex = items.findIndex((item) => item.id === state.focusedItemId)
  if (currentIndex === -1) {
    return setFocus(state, items[0].id)
  }

  const nextIndex = (currentIndex + 1) % items.length
  return setFocus(state, items[nextIndex].id)
}

/**
 * 이전 아이템으로 포커스 이동 (순환)
 */
export function moveFocusUp(
  state: MenuState,
  items: MenuItem[],
): MenuState {
  if (items.length === 0) {
    return state
  }

  if (state.focusedItemId === null) {
    return setFocus(state, items[items.length - 1].id)
  }

  const currentIndex = items.findIndex((item) => item.id === state.focusedItemId)
  if (currentIndex === -1) {
    return setFocus(state, items[0].id)
  }

  const prevIndex = (currentIndex - 1 + items.length) % items.length
  return setFocus(state, items[prevIndex].id)
}

/**
 * 첫 번째 아이템으로 포커스
 */
export function moveFocusFirst(
  state: MenuState,
  items: MenuItem[],
): MenuState {
  if (items.length === 0) {
    return setFocus(state, null)
  }
  return setFocus(state, items[0].id)
}

/**
 * 마지막 아이템으로 포커스
 */
export function moveFocusLast(
  state: MenuState,
  items: MenuItem[],
): MenuState {
  if (items.length === 0) {
    return setFocus(state, null)
  }
  return setFocus(state, items[items.length - 1].id)
}

// ============================================
// 키보드 핸들링 헬퍼
// ============================================

export type KeyboardAction =
  | { type: 'ARROW_DOWN' }
  | { type: 'ARROW_UP' }
  | { type: 'ARROW_RIGHT'; isSubTrigger: boolean; subMenuId?: MenuId }
  | { type: 'ARROW_LEFT'; currentMenuId: MenuId; isSubMenu: boolean }
  | { type: 'ENTER' }
  | { type: 'ESCAPE'; currentMenuId: MenuId }
  | { type: 'HOME' }
  | { type: 'END' }
  | { type: 'TAB'; shiftKey: boolean; currentMenuId: MenuId }

/**
 * 키보드 액션 결과
 * - state: 새로운 메뉴 상태
 * - focusTarget: 포커스할 대상 (Shell에서 처리)
 */
export type KeyboardActionResult = {
  state: MenuState
  focusTarget:
    | { type: 'item'; itemId: ItemId }
    | { type: 'trigger'; menuId: MenuId }
    | { type: 'none' }
}

/**
 * 키보드 액션에 따른 상태 변환
 * focusTarget을 함께 반환하여 Shell에서 DOM 포커스 처리
 */
export function handleKeyboardAction(
  state: MenuState,
  action: KeyboardAction,
  items: MenuItem[],
  currentMenuId: MenuId,
): KeyboardActionResult {
  const noFocus: KeyboardActionResult['focusTarget'] = { type: 'none' }

  switch (action.type) {
    case 'ARROW_DOWN': {
      const nextState = moveFocusDown(state, items)
      return {
        state: nextState,
        focusTarget: nextState.focusedItemId
          ? { type: 'item', itemId: nextState.focusedItemId }
          : noFocus,
      }
    }

    case 'ARROW_UP': {
      const nextState = moveFocusUp(state, items)
      return {
        state: nextState,
        focusTarget: nextState.focusedItemId
          ? { type: 'item', itemId: nextState.focusedItemId }
          : noFocus,
      }
    }

    case 'ARROW_RIGHT': {
      if (action.isSubTrigger && action.subMenuId) {
        const nextState = openMenu(state, action.subMenuId, currentMenuId)
        // 서브메뉴 열릴 때 첫 아이템으로 포커스는 Shell에서 처리
        return { state: nextState, focusTarget: noFocus }
      }
      return { state, focusTarget: noFocus }
    }

    case 'ARROW_LEFT': {
      if (action.isSubMenu) {
        // 서브메뉴 닫고 부모의 서브트리거로 포커스 복원
        const nextState = closeMenuAndFocusTrigger(state, currentMenuId)
        return {
          state: nextState,
          focusTarget: { type: 'trigger', menuId: currentMenuId },
        }
      }
      return { state, focusTarget: noFocus }
    }

    case 'ESCAPE': {
      // ESC는 현재 메뉴만 닫고 트리거로 포커스
      // 서브메뉴면 부모 메뉴의 서브트리거로, 루트면 루트 트리거로
      const nextState = closeMenuAndFocusTrigger(state, currentMenuId)
      return {
        state: nextState,
        focusTarget: { type: 'trigger', menuId: currentMenuId },
      }
    }

    case 'TAB': {
      if (action.shiftKey) {
        // Shift+Tab: 현재 메뉴 닫고 트리거로
        const nextState = closeMenuAndFocusTrigger(state, currentMenuId)
        return {
          state: nextState,
          focusTarget: { type: 'trigger', menuId: currentMenuId },
        }
      } else {
        // Tab: 전체 닫기 (포커스는 브라우저가 처리)
        return { state: closeAll(state), focusTarget: noFocus }
      }
    }

    case 'HOME': {
      const nextState = moveFocusFirst(state, items)
      return {
        state: nextState,
        focusTarget: nextState.focusedItemId
          ? { type: 'item', itemId: nextState.focusedItemId }
          : noFocus,
      }
    }

    case 'END': {
      const nextState = moveFocusLast(state, items)
      return {
        state: nextState,
        focusTarget: nextState.focusedItemId
          ? { type: 'item', itemId: nextState.focusedItemId }
          : noFocus,
      }
    }

    case 'ENTER':
      // Enter는 Shell에서 처리 (아이템 클릭 동작)
      return { state, focusTarget: noFocus }

    default:
      return { state, focusTarget: noFocus }
  }
}
