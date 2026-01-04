// ============================================
// Tabs Core - 순수 함수 모듈
// ============================================

export type TabValue = string | number

export type TabsOrientation = 'horizontal' | 'vertical'

export type TabsState = {
  activeValue: TabValue | null
  focusedValue: TabValue | null
}

// ============================================
// 상태 생성
// ============================================

export function createTabsState(defaultValue?: TabValue): TabsState {
  return {
    activeValue: defaultValue ?? null,
    focusedValue: null,
  }
}

// ============================================
// 상태 업데이트
// ============================================

export function selectTab(state: TabsState, value: TabValue): TabsState {
  return {
    ...state,
    activeValue: value,
    focusedValue: value,
  }
}

export function focusTab(state: TabsState, value: TabValue): TabsState {
  return { ...state, focusedValue: value }
}

export function blurTab(state: TabsState): TabsState {
  return { ...state, focusedValue: null }
}

export function isActive(state: TabsState, value: TabValue): boolean {
  return state.activeValue === value
}

export function isFocused(state: TabsState, value: TabValue): boolean {
  return state.focusedValue === value
}
