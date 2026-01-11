import * as focusTrapLib from 'focus-trap'
import { createMachine } from 'controlled-machine'

// ============================================
// Types
// ============================================

export type ModalEvents = {
  OPEN: undefined
  CLOSE: undefined
  OUTSIDE_CLICK: undefined
}

export type ModalState = 'open' | 'closed'

export type ModalInput = {
  // State (state 기능 활용을 위해 'state' 프로퍼티 필요)
  state: ModalState
  onOpenChange: (open: boolean) => void

  // Options
  closeOnEscape: boolean
  closeOnOutsideClick: boolean

  // Helpers
  getContentElement: () => HTMLElement | null
  getInitialFocusElement: () => HTMLElement | null | undefined

  // Effect state (React-agnostic)
  getTrap: () => focusTrapLib.FocusTrap | null
  onTrapChange: (trap: focusTrapLib.FocusTrap | null) => void
  getPrevOverflow: () => string
  onPrevOverflowChange: (overflow: string) => void
}

// ============================================
// Machine
// ============================================

export const modalMachine = createMachine<{
  input: ModalInput
  events: ModalEvents
  state: ModalState
  actions: 'noop' | 'open' | 'close'
}>({
  // 상태별 핸들러: 각 상태에서 유효한 이벤트만 처리
  states: {
    closed: {
      on: {
        OPEN: 'open',
        // closed 상태에서 CLOSE, OUTSIDE_CLICK은 무시됨
      },
    },
    open: {
      on: {
        CLOSE: 'close',
        OUTSIDE_CLICK: [
          { when: (context) => context.closeOnOutsideClick, do: 'close' },
          { do: 'noop' },
        ],
        // open 상태에서 OPEN은 무시됨
      },
    },
  },

  effects: [
    {
      watch: (context) => context.state === 'open',
      enter: (context) => {
        // 1. Body scroll lock
        context.onPrevOverflowChange(getComputedStyle(document.body).overflow)
        document.body.style.overflow = 'hidden'

        // 2. Focus trap 활성화 (다음 프레임에서 실행)
        requestAnimationFrame(() => {
          const contentEl = context.getContentElement()
          if (contentEl && !context.getTrap()) {
            const trap = focusTrapLib
              .createFocusTrap(contentEl, {
                initialFocus: context.getInitialFocusElement() ?? undefined,
                fallbackFocus: contentEl,
                allowOutsideClick: context.closeOnOutsideClick,
                escapeDeactivates: context.closeOnEscape,
                onDeactivate: () => context.onOpenChange(false),
              })
              .activate()
            context.onTrapChange(trap)
          }
        })

        // 3. Cleanup 반환
        return () => {
          const trap = context.getTrap()
          if (trap) {
            trap.deactivate()
            context.onTrapChange(null)
          }
          document.body.style.overflow = context.getPrevOverflow()
        }
      },
    },
  ],

  actions: {
    noop: () => {},
    open: (context) => context.onOpenChange(true),
    close: (context) => context.onOpenChange(false),
  },
})
