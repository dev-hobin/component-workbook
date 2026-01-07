import type { EventMachine } from '../../../lib/event-machine'

// ============================================
// Types
// ============================================

export type NodeId = string

// ============================================
// Events
// ============================================

export type TreeEvents = {
  // Focus
  FOCUS: { nodeId: NodeId }
  FOCUS_NEXT: void
  FOCUS_PREV: void
  FOCUS_FIRST: void
  FOCUS_LAST: void
  FOCUS_PARENT: void

  // Selection
  SELECT: { nodeId: NodeId | null }
  SELECT_FOCUSED: void

  // Expand/Collapse
  EXPAND: { nodeId: NodeId }
  COLLAPSE: { nodeId: NodeId }
  TOGGLE_EXPAND: { nodeId: NodeId }

  // Navigation
  ARROW_RIGHT: void
  ARROW_LEFT: void
}

// ============================================
// Context
// ============================================

export type TreeContext = {
  // State
  focusedId: NodeId | null
  selectedId: NodeId | null
  expandedIds: Set<NodeId>

  // Setters
  setFocusedId: (id: NodeId | null) => void
  setSelectedId: (id: NodeId | null) => void
  setExpandedIds: (ids: Set<NodeId>) => void

  // Lazy getters
  getVisibleItemIds: () => NodeId[]
  getChildrenIds: (nodeId: NodeId) => NodeId[]
  getParentId: (nodeId: NodeId) => NodeId | null
  isLeaf: (nodeId: NodeId) => boolean

  // DOM helpers
  getItemElement: (nodeId: NodeId) => HTMLElement | null
}

// ============================================
// Machine
// ============================================

export const treeMachine: EventMachine<TreeContext, TreeEvents> = {
  on: {
    FOCUS: 'focus',
    FOCUS_NEXT: 'focusNext',
    FOCUS_PREV: 'focusPrev',
    FOCUS_FIRST: 'focusFirst',
    FOCUS_LAST: 'focusLast',
    FOCUS_PARENT: 'focusParent',

    SELECT: 'select',
    SELECT_FOCUSED: 'selectFocused',

    EXPAND: 'expand',
    COLLAPSE: 'collapse',
    TOGGLE_EXPAND: 'toggleExpand',

    ARROW_RIGHT: [
      { when: (ctx) => ctx.focusedId === null, do: 'noop' },
      { when: (ctx) => ctx.focusedId !== null && ctx.isLeaf(ctx.focusedId), do: 'noop' },
      { when: (ctx) => ctx.focusedId !== null && !ctx.expandedIds.has(ctx.focusedId), do: 'expandFocused' },
      { do: 'focusFirstChild' },
    ],

    ARROW_LEFT: [
      { when: (ctx) => ctx.focusedId === null, do: 'noop' },
      { when: (ctx) => ctx.focusedId !== null && !ctx.isLeaf(ctx.focusedId) && ctx.expandedIds.has(ctx.focusedId), do: 'collapseFocused' },
      { do: 'focusParent' },
    ],
  },

  effects: [
    {
      // 포커스 변경 시 DOM 동기화
      watch: (ctx) => ctx.focusedId,
      change: (ctx) => {
        if (ctx.focusedId) {
          ctx.getItemElement(ctx.focusedId)?.focus()
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    focus: (ctx, payload) => {
      ctx.setFocusedId(payload!.nodeId)
    },

    focusNext: (ctx) => {
      const visibleIds = ctx.getVisibleItemIds()
      if (visibleIds.length === 0) return

      if (ctx.focusedId === null) {
        ctx.setFocusedId(visibleIds[0])
        return
      }

      const currentIndex = visibleIds.indexOf(ctx.focusedId)
      if (currentIndex === -1 || currentIndex >= visibleIds.length - 1) return

      ctx.setFocusedId(visibleIds[currentIndex + 1])
    },

    focusPrev: (ctx) => {
      const visibleIds = ctx.getVisibleItemIds()
      if (visibleIds.length === 0) return

      if (ctx.focusedId === null) {
        ctx.setFocusedId(visibleIds[0])
        return
      }

      const currentIndex = visibleIds.indexOf(ctx.focusedId)
      if (currentIndex <= 0) return

      ctx.setFocusedId(visibleIds[currentIndex - 1])
    },

    focusFirst: (ctx) => {
      const visibleIds = ctx.getVisibleItemIds()
      if (visibleIds.length > 0) {
        ctx.setFocusedId(visibleIds[0])
      }
    },

    focusLast: (ctx) => {
      const visibleIds = ctx.getVisibleItemIds()
      if (visibleIds.length > 0) {
        ctx.setFocusedId(visibleIds[visibleIds.length - 1])
      }
    },

    focusParent: (ctx) => {
      if (ctx.focusedId === null) return
      const parentId = ctx.getParentId(ctx.focusedId)
      if (parentId) {
        ctx.setFocusedId(parentId)
      }
    },

    focusFirstChild: (ctx) => {
      if (ctx.focusedId === null) return
      const childrenIds = ctx.getChildrenIds(ctx.focusedId)
      if (childrenIds.length > 0) {
        ctx.setFocusedId(childrenIds[0])
      }
    },

    select: (ctx, payload) => {
      ctx.setSelectedId(payload!.nodeId)
    },

    selectFocused: (ctx) => {
      ctx.setSelectedId(ctx.focusedId)
    },

    expand: (ctx, payload) => {
      const newExpanded = new Set(ctx.expandedIds)
      newExpanded.add(payload!.nodeId)
      ctx.setExpandedIds(newExpanded)
    },

    collapse: (ctx, payload) => {
      const newExpanded = new Set(ctx.expandedIds)
      newExpanded.delete(payload!.nodeId)
      ctx.setExpandedIds(newExpanded)
    },

    toggleExpand: (ctx, payload) => {
      const { nodeId } = payload!
      const newExpanded = new Set(ctx.expandedIds)
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId)
      } else {
        newExpanded.add(nodeId)
      }
      ctx.setExpandedIds(newExpanded)
    },

    expandFocused: (ctx) => {
      if (ctx.focusedId === null) return
      const newExpanded = new Set(ctx.expandedIds)
      newExpanded.add(ctx.focusedId)
      ctx.setExpandedIds(newExpanded)
    },

    collapseFocused: (ctx) => {
      if (ctx.focusedId === null) return
      const newExpanded = new Set(ctx.expandedIds)
      newExpanded.delete(ctx.focusedId)
      ctx.setExpandedIds(newExpanded)
    },
  },
}
