import { createMachine } from 'controlled-machine'

// ============================================
// Types
// ============================================

export type AccordionEvents = {
  TOGGLE: { itemId: string }
  FOCUS_NEXT: undefined
  FOCUS_PREV: undefined
  FOCUS_FIRST: undefined
  FOCUS_LAST: undefined
}

export type AccordionInput = {
  // State
  expandedIds: Set<string>
  focusedId: string | null

  // Callbacks
  onExpandedIdsChange: (ids: Set<string>) => void
  onFocusedIdChange: (id: string | null) => void

  // Options
  multiple: boolean
  collapsible: boolean
  disabled: boolean

  // Helpers (lazy evaluation)
  getEnabledItemIds: () => string[]
  getTriggerElement: (itemId: string) => HTMLElement | null
}

// ============================================
// Machine
// ============================================

export const accordionMachine = createMachine<{
  input: AccordionInput
  events: AccordionEvents
  actions: 'noop' | 'expand' | 'collapse' | 'focusNext' | 'focusPrev' | 'focusFirst' | 'focusLast'
}>({
  on: {
    TOGGLE: [
      { when: (context) => context.disabled, do: 'noop' },
      {
        when: (context, { itemId }) =>
          context.expandedIds.has(itemId) && !context.collapsible && !context.multiple,
        do: 'noop',
      },
      { when: (context, { itemId }) => context.expandedIds.has(itemId), do: 'collapse' },
      { do: 'expand' },
    ],
    FOCUS_NEXT: 'focusNext',
    FOCUS_PREV: 'focusPrev',
    FOCUS_FIRST: 'focusFirst',
    FOCUS_LAST: 'focusLast',
  },

  effects: [
    {
      watch: (context) => context.focusedId,
      change: (context) => {
        if (context.focusedId) {
          context.getTriggerElement(context.focusedId)?.focus()
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    expand: (context, payload: { itemId: string }) => {
      const { itemId } = payload
      if (context.multiple) {
        context.onExpandedIdsChange(new Set([...context.expandedIds, itemId]))
      } else {
        context.onExpandedIdsChange(new Set([itemId]))
      }
    },

    collapse: (context, payload: { itemId: string }) => {
      const { itemId } = payload
      const next = new Set(context.expandedIds)
      next.delete(itemId)
      context.onExpandedIdsChange(next)
    },

    focusNext: (context) => {
      const items = context.getEnabledItemIds()
      if (items.length === 0) return
      const currentIdx = context.focusedId ? items.indexOf(context.focusedId) : -1
      const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % items.length
      context.onFocusedIdChange(items[nextIdx])
    },

    focusPrev: (context) => {
      const items = context.getEnabledItemIds()
      if (items.length === 0) return
      const currentIdx = context.focusedId ? items.indexOf(context.focusedId) : -1
      const prevIdx =
        currentIdx === -1
          ? items.length - 1
          : (currentIdx - 1 + items.length) % items.length
      context.onFocusedIdChange(items[prevIdx])
    },

    focusFirst: (context) => {
      const items = context.getEnabledItemIds()
      if (items.length > 0) context.onFocusedIdChange(items[0])
    },

    focusLast: (context) => {
      const items = context.getEnabledItemIds()
      if (items.length > 0) context.onFocusedIdChange(items[items.length - 1])
    },
  },
})

// ============================================
// Query Helpers
// ============================================

export function isExpanded(expandedIds: Set<string>, itemId: string): boolean {
  return expandedIds.has(itemId)
}
