import { createMachine } from 'controlled-machine'

// ============================================
// Types
// ============================================

export type ModalInput = {
  // 핵심 상태
  open: boolean
  onOpenChange: (open: boolean) => void

  // 닫기 옵션
  closeOnEscape: boolean
  closeOnBackdropClick: boolean
}

export type ModalEvents = {
  // 상태 변경
  OPEN: undefined
  CLOSE: undefined

  // 사용자 인터랙션 (조건부 닫기)
  ESCAPE_KEY: undefined
  BACKDROP_CLICK: undefined

  // DOM 이벤트 (effect에서 send로 호출, Shell에서 action override)
  LOCK_SCROLL: undefined
  UNLOCK_SCROLL: undefined
  ACTIVATE_FOCUS_TRAP: undefined
  DEACTIVATE_FOCUS_TRAP: undefined
}

export type ModalComputed = {
  isOpen: boolean
}

export type ModalActions =
  | 'open'
  | 'close'
  // DOM actions (Shell에서 override)
  | 'lockScroll'
  | 'unlockScroll'
  | 'activateFocusTrap'
  | 'deactivateFocusTrap'

export type ModalGuards = 'shouldCloseOnEscape' | 'shouldCloseOnBackdrop'

// ============================================
// Machine
// ============================================

/**
 * Modal Machine - 선언적 명세
 *
 * 이 Machine을 읽으면 Modal의 동작이 이해됩니다:
 *
 * ## 이벤트
 * - OPEN 이벤트 → 모달 열기
 * - CLOSE 이벤트 → 모달 닫기
 * - ESCAPE_KEY 이벤트 → closeOnEscape가 true면 닫기
 * - BACKDROP_CLICK 이벤트 → closeOnBackdropClick이 true면 닫기
 *
 * ## 부수 효과 (Effects)
 * - 모달 열림 시: 포커스 트랩 활성화, 스크롤 잠금
 * - 모달 닫힘 시: 포커스 트랩 해제, 스크롤 복원, 트리거로 포커스 복귀
 */
export const modalMachine = createMachine<{
  input: ModalInput
  events: ModalEvents
  computed: ModalComputed
  actions: ModalActions
  guards: ModalGuards
}>({
  computed: {
    isOpen: (ctx) => ctx.open,
  },

  guards: {
    shouldCloseOnEscape: (ctx) => ctx.closeOnEscape,
    shouldCloseOnBackdrop: (ctx) => ctx.closeOnBackdropClick,
  },

  on: {
    OPEN: 'open',
    CLOSE: 'close',

    // Escape 키: closeOnEscape 옵션이 true일 때만 닫기
    ESCAPE_KEY: [{ when: 'shouldCloseOnEscape', do: 'close' }],

    // 백드롭 클릭: closeOnBackdropClick 옵션이 true일 때만 닫기
    BACKDROP_CLICK: [{ when: 'shouldCloseOnBackdrop', do: 'close' }],

    // DOM 이벤트
    LOCK_SCROLL: 'lockScroll',
    UNLOCK_SCROLL: 'unlockScroll',
    ACTIVATE_FOCUS_TRAP: 'activateFocusTrap',
    DEACTIVATE_FOCUS_TRAP: 'deactivateFocusTrap',
  },

  effects: [
    {
      // 포커스 트랩 및 스크롤 잠금
      watch: (ctx) => ctx.open,
      enter: (_ctx, { send }) => {
        send('LOCK_SCROLL')
        send('ACTIVATE_FOCUS_TRAP')

        return () => {
          send('DEACTIVATE_FOCUS_TRAP')
          send('UNLOCK_SCROLL')
        }
      },
    },
    // Escape 키, 외부 클릭은 DismissableLayer가 처리 (Shell에서 설정)
    // Machine은 ESCAPE_KEY, BACKDROP_CLICK 이벤트만 선언적으로 처리
  ],

  actions: {
    open: (ctx) => {
      if (!ctx.open) {
        ctx.onOpenChange(true)
      }
    },

    close: (ctx) => {
      if (ctx.open) {
        ctx.onOpenChange(false)
      }
    },

    // DOM actions (Shell에서 override)
    lockScroll: () => {},
    unlockScroll: () => {},
    activateFocusTrap: () => {},
    deactivateFocusTrap: () => {},
  },
})
