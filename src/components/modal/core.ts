// ============================================
// Modal Core - 순수 함수 모듈
// ============================================

export type ModalState = {
  open: boolean
  closeOnEscape: boolean
  closeOnOutsideClick: boolean
}

export type ModalStatus = 'idle' | 'closed' | 'open'

export type ModalContext = {
  closeOnEscape: boolean
  closeOnOutsideClick: boolean
}

// ============================================
// Effects - 부수효과 명세
// ============================================

export type ModalEffect =
  | { type: 'ACTIVATE_FOCUS_TRAP'; context: ModalContext }
  | { type: 'DEACTIVATE_FOCUS_TRAP' }
  | { type: 'LOCK_BODY_SCROLL' }
  | { type: 'UNLOCK_BODY_SCROLL' }
  | { type: 'CLOSE_MODAL' }

// ============================================
// 상태 생성
// ============================================

export function createModalState(
  options: Partial<ModalState> = {},
): ModalState {
  return {
    open: false,
    closeOnEscape: true,
    closeOnOutsideClick: false,
    ...options,
  }
}

// ============================================
// 상태 → Status 파생
// ============================================

export function deriveStatus(state: ModalState): ModalStatus {
  return state.open ? 'open' : 'closed'
}

// ============================================
// 상태 조회
// ============================================

export function isOpen(state: ModalState): boolean {
  return state.open
}

// ============================================
// Status 전환에 따른 부수효과
// ============================================

export function getEffectsOnStatusChange(
  prevStatus: ModalStatus,
  nextStatus: ModalStatus,
  context: ModalContext,
): ModalEffect[] {
  // idle → open (초기 마운트 시 open 상태)
  if (prevStatus === 'idle' && nextStatus === 'open') {
    return [
      { type: 'LOCK_BODY_SCROLL' },
      { type: 'ACTIVATE_FOCUS_TRAP', context },
    ]
  }

  // idle → closed (초기 마운트 시 closed 상태 - effect 없음)
  if (prevStatus === 'idle' && nextStatus === 'closed') {
    return []
  }

  // closed → open
  if (prevStatus === 'closed' && nextStatus === 'open') {
    return [
      { type: 'LOCK_BODY_SCROLL' },
      { type: 'ACTIVATE_FOCUS_TRAP', context },
    ]
  }

  // open → closed
  if (prevStatus === 'open' && nextStatus === 'closed') {
    return [
      { type: 'DEACTIVATE_FOCUS_TRAP' },
      { type: 'UNLOCK_BODY_SCROLL' },
    ]
  }

  return []
}


// ============================================
// 이벤트 처리 - 이벤트에 따른 효과
// ============================================

/**
 * 외부 클릭 이벤트 처리
 */
export function handleOutsideClick(state: ModalState): ModalEffect[] {
  if (state.open && state.closeOnOutsideClick) {
    return [{ type: 'CLOSE_MODAL' }]
  }
  return []
}
