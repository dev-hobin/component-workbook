import type { EventMachine } from '../../../lib/event-machine'

// ============================================
// Types
// ============================================

export type AccordionEvents = {
  TOGGLE: { itemId: string }
  FOCUS_NEXT: void
  FOCUS_PREV: void
  FOCUS_FIRST: void
  FOCUS_LAST: void
}

export type AccordionContext = {
  // State
  expandedIds: Set<string>
  focusedId: string | null

  // Setters
  setExpandedIds: (ids: Set<string>) => void
  setFocusedId: (id: string | null) => void

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

export const accordionMachine: EventMachine<AccordionContext, AccordionEvents> = {
  on: {
    TOGGLE: [
      { when: (ctx) => ctx.disabled, do: 'noop' },
      {
        when: (ctx, { itemId }) =>
          ctx.expandedIds.has(itemId) && !ctx.collapsible && !ctx.multiple,
        do: 'noop',
      },
      { when: (ctx, { itemId }) => ctx.expandedIds.has(itemId), do: 'collapse' },
      { do: 'expand' },
    ],
    FOCUS_NEXT: 'focusNext',
    FOCUS_PREV: 'focusPrev',
    FOCUS_FIRST: 'focusFirst',
    FOCUS_LAST: 'focusLast',
  },

  effects: [
    {
      watch: (ctx) => ctx.focusedId,
      change: (ctx) => {
        if (ctx.focusedId) {
          ctx.getTriggerElement(ctx.focusedId)?.focus()
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    expand: (ctx, payload) => {
      const { itemId } = payload!
      if (ctx.multiple) {
        ctx.setExpandedIds(new Set([...ctx.expandedIds, itemId]))
      } else {
        ctx.setExpandedIds(new Set([itemId]))
      }
    },

    collapse: (ctx, payload) => {
      const { itemId } = payload!
      const next = new Set(ctx.expandedIds)
      next.delete(itemId)
      ctx.setExpandedIds(next)
    },

    focusNext: (ctx) => {
      const items = ctx.getEnabledItemIds()
      if (items.length === 0) return
      const currentIdx = ctx.focusedId ? items.indexOf(ctx.focusedId) : -1
      const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % items.length
      ctx.setFocusedId(items[nextIdx])
    },

    focusPrev: (ctx) => {
      const items = ctx.getEnabledItemIds()
      if (items.length === 0) return
      const currentIdx = ctx.focusedId ? items.indexOf(ctx.focusedId) : -1
      const prevIdx =
        currentIdx === -1
          ? items.length - 1
          : (currentIdx - 1 + items.length) % items.length
      ctx.setFocusedId(items[prevIdx])
    },

    focusFirst: (ctx) => {
      const items = ctx.getEnabledItemIds()
      if (items.length > 0) ctx.setFocusedId(items[0])
    },

    focusLast: (ctx) => {
      const items = ctx.getEnabledItemIds()
      if (items.length > 0) ctx.setFocusedId(items[items.length - 1])
    },
  },
}

// ============================================
// Query Helpers
// ============================================

export function isExpanded(expandedIds: Set<string>, itemId: string): boolean {
  return expandedIds.has(itemId)
}
