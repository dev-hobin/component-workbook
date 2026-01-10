import * as focusTrapLib from 'focus-trap'
import { createEventMachine } from '../../event-machine'

// ============================================
// Types
// ============================================

export type ModalEvents = {
  OPEN: undefined
  CLOSE: undefined
  OUTSIDE_CLICK: undefined
}

export type ModalContext = {
  // State
  isOpen: boolean
  setOpen: (open: boolean) => void

  // Options
  closeOnEscape: boolean
  closeOnOutsideClick: boolean

  // Helpers
  getContentElement: () => HTMLElement | null
  getInitialFocusElement: () => HTMLElement | null | undefined

  // Effect state (React-agnostic)
  getTrap: () => focusTrapLib.FocusTrap | null
  setTrap: (trap: focusTrapLib.FocusTrap | null) => void
  getPrevOverflow: () => string
  setPrevOverflow: (overflow: string) => void
}

// ============================================
// Machine
// ============================================

export const modalMachine = createEventMachine<{
  context: ModalContext
  events: ModalEvents
  actions: 'noop' | 'open' | 'close'
}>({
  on: {
    OPEN: 'open',
    CLOSE: 'close',
    OUTSIDE_CLICK: [
      { when: (ctx) => ctx.closeOnOutsideClick, do: 'close' },
      { do: 'noop' },
    ],
  },

  effects: [
    {
      watch: (ctx) => ctx.isOpen,
      enter: (ctx) => {
        // 1. Body scroll lock
        ctx.setPrevOverflow(getComputedStyle(document.body).overflow)
        document.body.style.overflow = 'hidden'

        // 2. Focus trap 활성화 (다음 프레임에서 실행)
        requestAnimationFrame(() => {
          const contentEl = ctx.getContentElement()
          if (contentEl && !ctx.getTrap()) {
            const trap = focusTrapLib
              .createFocusTrap(contentEl, {
                initialFocus: ctx.getInitialFocusElement() ?? undefined,
                fallbackFocus: contentEl,
                allowOutsideClick: ctx.closeOnOutsideClick,
                escapeDeactivates: ctx.closeOnEscape,
                onDeactivate: () => ctx.setOpen(false),
              })
              .activate()
            ctx.setTrap(trap)
          }
        })

        // 3. Cleanup 반환
        return () => {
          const trap = ctx.getTrap()
          if (trap) {
            trap.deactivate()
            ctx.setTrap(null)
          }
          document.body.style.overflow = ctx.getPrevOverflow()
        }
      },
    },
  ],

  actions: {
    noop: () => {},
    open: (ctx) => ctx.setOpen(true),
    close: (ctx) => ctx.setOpen(false),
  },
})
