import { createEventMachine } from '../../event-machine'

// ============================================
// Types
// ============================================

export type TabValue = string | number

export type TabsOrientation = 'horizontal' | 'vertical'

// ============================================
// Events
// ============================================

export type TabsEvents = {
  SELECT: { value: TabValue }
  FOCUS: { value: TabValue }
  BLUR: undefined
  FOCUS_NEXT: undefined
  FOCUS_PREV: undefined
  FOCUS_FIRST: undefined
  FOCUS_LAST: undefined
}

// ============================================
// Context
// ============================================

export type TabsContext = {
  // State
  activeValue: TabValue | null
  focusedValue: TabValue | null

  // Setters
  setActiveValue: (value: TabValue | null) => void
  setFocusedValue: (value: TabValue | null) => void

  // Lazy getters
  getEnabledTabs: () => Array<{ value: TabValue }>

  // DOM helpers
  getTabElement: (value: TabValue) => HTMLElement | null
}

// ============================================
// Machine
// ============================================

export const tabsMachine = createEventMachine<
  TabsContext,
  TabsEvents,
  Record<string, never>,
  'select' | 'focus' | 'blur' | 'focusNext' | 'focusPrev' | 'focusFirst' | 'focusLast'
>({
  on: {
    SELECT: 'select',
    FOCUS: 'focus',
    BLUR: 'blur',
    FOCUS_NEXT: 'focusNext',
    FOCUS_PREV: 'focusPrev',
    FOCUS_FIRST: 'focusFirst',
    FOCUS_LAST: 'focusLast',
  },

  effects: [
    {
      // 포커스 변경 시 DOM 동기화
      watch: (ctx) => ctx.focusedValue,
      change: (ctx) => {
        if (ctx.focusedValue !== null) {
          ctx.getTabElement(ctx.focusedValue)?.focus()
        }
      },
    },
  ],

  actions: {
    select: (ctx, payload: { value: TabValue }) => {
      const { value } = payload
      ctx.setActiveValue(value)
      ctx.setFocusedValue(value)
    },

    focus: (ctx, payload: { value: TabValue }) => {
      const { value } = payload
      ctx.setFocusedValue(value)
    },

    blur: (ctx) => {
      ctx.setFocusedValue(null)
    },

    focusNext: (ctx) => {
      const tabs = ctx.getEnabledTabs()
      if (tabs.length === 0) return

      if (ctx.focusedValue === null) {
        ctx.setFocusedValue(tabs[0].value)
        return
      }

      const currentIndex = tabs.findIndex((t) => t.value === ctx.focusedValue)
      if (currentIndex === -1) {
        ctx.setFocusedValue(tabs[0].value)
        return
      }

      const nextIndex = (currentIndex + 1) % tabs.length
      ctx.setFocusedValue(tabs[nextIndex].value)
    },

    focusPrev: (ctx) => {
      const tabs = ctx.getEnabledTabs()
      if (tabs.length === 0) return

      if (ctx.focusedValue === null) {
        ctx.setFocusedValue(tabs[tabs.length - 1].value)
        return
      }

      const currentIndex = tabs.findIndex((t) => t.value === ctx.focusedValue)
      if (currentIndex === -1) {
        ctx.setFocusedValue(tabs[0].value)
        return
      }

      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
      ctx.setFocusedValue(tabs[prevIndex].value)
    },

    focusFirst: (ctx) => {
      const tabs = ctx.getEnabledTabs()
      if (tabs.length > 0) {
        ctx.setFocusedValue(tabs[0].value)
      }
    },

    focusLast: (ctx) => {
      const tabs = ctx.getEnabledTabs()
      if (tabs.length > 0) {
        ctx.setFocusedValue(tabs[tabs.length - 1].value)
      }
    },
  },
})

// ============================================
// Query Helpers
// ============================================

export function isActive(activeValue: TabValue | null, value: TabValue): boolean {
  return activeValue === value
}
