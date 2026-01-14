import { createMachine } from 'controlled-machine'

// ============================================
// Types
// ============================================

export type TabValue = string

export type TabsInput = {
  // State
  value: TabValue
  onValueChange?: (value: TabValue) => void

  // Options
  activationMode: 'automatic' | 'manual'
  loop: boolean

  // Lazy helpers (computed from NodeStore in shell)
  getEnabledValues: () => TabValue[]
}

export type TabsInternal = {
  // Focus tracking for keyboard navigation (internal state)
  focusedValue: TabValue | null
}

export type TabsEvents = {
  // Tab selection
  SELECT: { value: TabValue }

  // Focus tracking (syncs focusedValue when trigger receives focus)
  FOCUS: { value: TabValue }

  // Keyboard navigation (W3C APG)
  FOCUS_NEXT: undefined
  FOCUS_PREV: undefined
  FOCUS_FIRST: undefined
  FOCUS_LAST: undefined

  // Manual mode activation (Enter/Space)
  ACTIVATE_FOCUSED: undefined
}

export type TabsComputed = {
  // Navigation helpers
  enabledValues: TabValue[]
  currentIndex: number
  nextValue: TabValue | null
  prevValue: TabValue | null
  firstValue: TabValue | null
  lastValue: TabValue | null
}

export type TabsActions =
  | 'select'
  | 'focus'
  | 'focusNext'
  | 'focusPrev'
  | 'focusFirst'
  | 'focusLast'
  | 'activateFocused'

// ============================================
// Machine
// ============================================

export const tabsMachine = createMachine<{
  input: TabsInput
  internal: TabsInternal
  events: TabsEvents
  computed: TabsComputed
  actions: TabsActions
}>({
  internal: {
    focusedValue: null,
  },

  computed: {
    enabledValues: (context) => context.getEnabledValues(),

    currentIndex: (context) => {
      const enabledValues = context.getEnabledValues()
      // Use focusedValue for navigation, fallback to value
      const current = context.focusedValue ?? context.value
      return enabledValues.indexOf(current)
    },

    nextValue: (context) => {
      const enabledValues = context.getEnabledValues()
      if (enabledValues.length === 0) return null

      const currentIndex = enabledValues.indexOf(context.focusedValue ?? context.value)
      if (currentIndex === -1) return enabledValues[0]

      if (context.loop) {
        return enabledValues[(currentIndex + 1) % enabledValues.length]
      }
      return currentIndex < enabledValues.length - 1
        ? enabledValues[currentIndex + 1]
        : null
    },

    prevValue: (context) => {
      const enabledValues = context.getEnabledValues()
      if (enabledValues.length === 0) return null

      const currentIndex = enabledValues.indexOf(context.focusedValue ?? context.value)
      if (currentIndex === -1) return enabledValues[enabledValues.length - 1]

      if (context.loop) {
        return enabledValues[
          (currentIndex - 1 + enabledValues.length) % enabledValues.length
        ]
      }
      return currentIndex > 0 ? enabledValues[currentIndex - 1] : null
    },

    firstValue: (context) => {
      const enabledValues = context.getEnabledValues()
      return enabledValues[0] ?? null
    },

    lastValue: (context) => {
      const enabledValues = context.getEnabledValues()
      return enabledValues[enabledValues.length - 1] ?? null
    },
  },

  on: {
    SELECT: 'select',
    FOCUS: 'focus',
    FOCUS_NEXT: 'focusNext',
    FOCUS_PREV: 'focusPrev',
    FOCUS_FIRST: 'focusFirst',
    FOCUS_LAST: 'focusLast',
    ACTIVATE_FOCUSED: 'activateFocused',
  },

  actions: {
    select: (context, payload: { value: TabValue }) => {
      if (payload.value !== context.value) {
        context.onValueChange?.(payload.value)
      }
    },

    focus: (context, payload: { value: TabValue }, assign) => {
      // Sync focusedValue when trigger receives focus (click, programmatic focus, etc.)
      if (payload.value !== context.focusedValue) {
        assign({ focusedValue: payload.value })
      }
    },

    focusNext: (context, _, assign) => {
      const enabledValues = context.getEnabledValues()
      if (enabledValues.length === 0) return

      const currentIndex = enabledValues.indexOf(context.focusedValue ?? context.value)
      let nextIndex: number

      if (currentIndex === -1) {
        nextIndex = 0
      } else if (context.loop) {
        nextIndex = (currentIndex + 1) % enabledValues.length
      } else {
        nextIndex = Math.min(currentIndex + 1, enabledValues.length - 1)
      }

      const nextValue = enabledValues[nextIndex]
      assign({ focusedValue: nextValue })

      // Automatic mode: also activate
      if (context.activationMode === 'automatic' && nextValue !== context.value) {
        context.onValueChange?.(nextValue)
      }
    },

    focusPrev: (context, _, assign) => {
      const enabledValues = context.getEnabledValues()
      if (enabledValues.length === 0) return

      const currentIndex = enabledValues.indexOf(context.focusedValue ?? context.value)
      let prevIndex: number

      if (currentIndex === -1) {
        prevIndex = enabledValues.length - 1
      } else if (context.loop) {
        prevIndex = (currentIndex - 1 + enabledValues.length) % enabledValues.length
      } else {
        prevIndex = Math.max(currentIndex - 1, 0)
      }

      const prevValue = enabledValues[prevIndex]
      assign({ focusedValue: prevValue })

      // Automatic mode: also activate
      if (context.activationMode === 'automatic' && prevValue !== context.value) {
        context.onValueChange?.(prevValue)
      }
    },

    focusFirst: (context, _, assign) => {
      const enabledValues = context.getEnabledValues()
      if (enabledValues.length === 0) return

      const firstValue = enabledValues[0]
      assign({ focusedValue: firstValue })

      // Automatic mode: also activate
      if (context.activationMode === 'automatic' && firstValue !== context.value) {
        context.onValueChange?.(firstValue)
      }
    },

    focusLast: (context, _, assign) => {
      const enabledValues = context.getEnabledValues()
      if (enabledValues.length === 0) return

      const lastValue = enabledValues[enabledValues.length - 1]
      assign({ focusedValue: lastValue })

      // Automatic mode: also activate
      if (context.activationMode === 'automatic' && lastValue !== context.value) {
        context.onValueChange?.(lastValue)
      }
    },

    activateFocused: (context) => {
      // Manual mode: Enter/Space to activate focused tab
      if (context.focusedValue && context.focusedValue !== context.value) {
        context.onValueChange?.(context.focusedValue)
      }
    },
  },
})
