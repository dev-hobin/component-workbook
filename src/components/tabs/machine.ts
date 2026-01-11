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

export type TabsInput = {
  // State
  activeValue: TabValue | null
  focusedValue: TabValue | null

  // Callbacks
  onActiveValueChange: (value: TabValue | null) => void
  onFocusedValueChange: (value: TabValue | null) => void

  // Lazy getters
  getEnabledTabs: () => Array<{ value: TabValue }>

  // DOM helpers
  getTabElement: (value: TabValue) => HTMLElement | null
}

// ============================================
// Machine
// ============================================

export const tabsMachine = createEventMachine<{
  input: TabsInput
  events: TabsEvents
  actions: 'setActive' | 'setFocus' | 'clearFocus' | 'focusNext' | 'focusPrev' | 'focusFirst' | 'focusLast'
}>({
  on: {
    SELECT: ['setActive', 'setFocus'],  // 선택 시 활성화 + 포커스
    FOCUS: 'setFocus',
    BLUR: 'clearFocus',
    FOCUS_NEXT: 'focusNext',
    FOCUS_PREV: 'focusPrev',
    FOCUS_FIRST: 'focusFirst',
    FOCUS_LAST: 'focusLast',
  },

  effects: [
    {
      // 포커스 변경 시 DOM 동기화
      watch: (context) => context.focusedValue,
      change: (context) => {
        if (context.focusedValue !== null) {
          context.getTabElement(context.focusedValue)?.focus()
        }
      },
    },
  ],

  actions: {
    setActive: (context, payload: { value: TabValue }) => {
      context.onActiveValueChange(payload.value)
    },

    setFocus: (context, payload: { value: TabValue }) => {
      context.onFocusedValueChange(payload.value)
    },

    clearFocus: (context) => {
      context.onFocusedValueChange(null)
    },

    focusNext: (context) => {
      const tabs = context.getEnabledTabs()
      if (tabs.length === 0) return

      if (context.focusedValue === null) {
        context.onFocusedValueChange(tabs[0].value)
        return
      }

      const currentIndex = tabs.findIndex((t) => t.value === context.focusedValue)
      if (currentIndex === -1) {
        context.onFocusedValueChange(tabs[0].value)
        return
      }

      const nextIndex = (currentIndex + 1) % tabs.length
      context.onFocusedValueChange(tabs[nextIndex].value)
    },

    focusPrev: (context) => {
      const tabs = context.getEnabledTabs()
      if (tabs.length === 0) return

      if (context.focusedValue === null) {
        context.onFocusedValueChange(tabs[tabs.length - 1].value)
        return
      }

      const currentIndex = tabs.findIndex((t) => t.value === context.focusedValue)
      if (currentIndex === -1) {
        context.onFocusedValueChange(tabs[0].value)
        return
      }

      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
      context.onFocusedValueChange(tabs[prevIndex].value)
    },

    focusFirst: (context) => {
      const tabs = context.getEnabledTabs()
      if (tabs.length > 0) {
        context.onFocusedValueChange(tabs[0].value)
      }
    },

    focusLast: (context) => {
      const tabs = context.getEnabledTabs()
      if (tabs.length > 0) {
        context.onFocusedValueChange(tabs[tabs.length - 1].value)
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
