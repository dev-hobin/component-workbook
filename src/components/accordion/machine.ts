import { createMachine } from 'controlled-machine'

// ============================================
// Types
// ============================================

export type ItemId = string

export type AccordionInput = {
  value: ItemId[]
  multiple: boolean
  collapsible: boolean
  onValueChange: (value: ItemId[]) => void
}

export type AccordionEvents = {
  TOGGLE: { itemId: ItemId }
  EXPAND: { itemId: ItemId }
  COLLAPSE: { itemId: ItemId }
}

export type AccordionComputed = {
  expandedSet: Set<ItemId>
}

export type AccordionActions = 'toggle' | 'expand' | 'collapse'

// ============================================
// Machine
// ============================================

export const accordionMachine = createMachine<{
  input: AccordionInput
  events: AccordionEvents
  computed: AccordionComputed
  actions: AccordionActions
}>({
  computed: {
    expandedSet: (input) => new Set(input.value),
  },

  on: {
    TOGGLE: 'toggle',
    EXPAND: 'expand',
    COLLAPSE: 'collapse',
  },

  actions: {
    toggle: (context, payload: { itemId: ItemId }) => {
      const { itemId } = payload
      const isExpanded = context.value.includes(itemId)

      if (isExpanded) {
        // Collapse
        if (!context.collapsible && context.value.length === 1) {
          return // Cannot collapse the only expanded item
        }
        const next = context.value.filter((id) => id !== itemId)
        context.onValueChange(next)
      } else {
        // Expand
        if (context.multiple) {
          context.onValueChange([...context.value, itemId])
        } else {
          context.onValueChange([itemId])
        }
      }
    },

    expand: (context, payload: { itemId: ItemId }) => {
      const { itemId } = payload
      if (context.value.includes(itemId)) return

      if (context.multiple) {
        context.onValueChange([...context.value, itemId])
      } else {
        context.onValueChange([itemId])
      }
    },

    collapse: (context, payload: { itemId: ItemId }) => {
      const { itemId } = payload
      if (!context.value.includes(itemId)) return

      if (!context.collapsible && context.value.length === 1) {
        return // Cannot collapse the only expanded item
      }
      const next = context.value.filter((id) => id !== itemId)
      context.onValueChange(next)
    },
  },
})
