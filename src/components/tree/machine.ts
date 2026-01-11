import { createMachine } from 'controlled-machine'

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
  FOCUS_NEXT: undefined
  FOCUS_PREV: undefined
  FOCUS_FIRST: undefined
  FOCUS_LAST: undefined
  FOCUS_PARENT: undefined

  // Selection
  SELECT: { nodeId: NodeId | null }
  SELECT_FOCUSED: undefined

  // Expand/Collapse
  EXPAND: { nodeId: NodeId }
  COLLAPSE: { nodeId: NodeId }
  TOGGLE_EXPAND: { nodeId: NodeId }

  // Navigation
  ARROW_RIGHT: undefined
  ARROW_LEFT: undefined
}

// ============================================
// Context
// ============================================

export type TreeInput = {
  // State
  focusedId: NodeId | null
  selectedId: NodeId | null
  expandedIds: Set<NodeId>

  // Callbacks
  onFocusedIdChange: (id: NodeId | null) => void
  onSelectedIdChange: (id: NodeId | null) => void
  onExpandedIdsChange: (ids: Set<NodeId>) => void

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

type TreeActions =
  | 'noop'
  | 'focus'
  | 'focusNext'
  | 'focusPrev'
  | 'focusFirst'
  | 'focusLast'
  | 'focusParent'
  | 'focusFirstChild'
  | 'select'
  | 'selectFocused'
  | 'expand'
  | 'collapse'
  | 'toggleExpand'
  | 'expandFocused'
  | 'collapseFocused'

export const treeMachine = createMachine<{
  input: TreeInput
  events: TreeEvents
  actions: TreeActions
}>({
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
      { when: (context) => context.focusedId === null, do: 'noop' },
      {
        when: (context) =>
          context.focusedId !== null && context.isLeaf(context.focusedId),
        do: 'noop',
      },
      {
        when: (context) =>
          context.focusedId !== null &&
          !context.expandedIds.has(context.focusedId),
        do: 'expandFocused',
      },
      { do: 'focusFirstChild' },
    ],

    ARROW_LEFT: [
      { when: (context) => context.focusedId === null, do: 'noop' },
      {
        when: (context) =>
          context.focusedId !== null &&
          !context.isLeaf(context.focusedId) &&
          context.expandedIds.has(context.focusedId),
        do: 'collapseFocused',
      },
      { do: 'focusParent' },
    ],
  },

  effects: [
    {
      // 포커스 변경 시 DOM 동기화
      watch: (context) => context.focusedId,
      change: (context) => {
        if (context.focusedId) {
          context.getItemElement(context.focusedId)?.focus()
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    focus: (context, payload: { nodeId: NodeId }) => {
      context.onFocusedIdChange(payload.nodeId)
    },

    focusNext: (context) => {
      const visibleIds = context.getVisibleItemIds()
      if (visibleIds.length === 0) return

      if (context.focusedId === null) {
        context.onFocusedIdChange(visibleIds[0])
        return
      }

      const currentIndex = visibleIds.indexOf(context.focusedId)
      if (currentIndex === -1 || currentIndex >= visibleIds.length - 1) return

      context.onFocusedIdChange(visibleIds[currentIndex + 1])
    },

    focusPrev: (context) => {
      const visibleIds = context.getVisibleItemIds()
      if (visibleIds.length === 0) return

      if (context.focusedId === null) {
        context.onFocusedIdChange(visibleIds[0])
        return
      }

      const currentIndex = visibleIds.indexOf(context.focusedId)
      if (currentIndex <= 0) return

      context.onFocusedIdChange(visibleIds[currentIndex - 1])
    },

    focusFirst: (context) => {
      const visibleIds = context.getVisibleItemIds()
      if (visibleIds.length > 0) {
        context.onFocusedIdChange(visibleIds[0])
      }
    },

    focusLast: (context) => {
      const visibleIds = context.getVisibleItemIds()
      if (visibleIds.length > 0) {
        context.onFocusedIdChange(visibleIds[visibleIds.length - 1])
      }
    },

    focusParent: (context) => {
      if (context.focusedId === null) return
      const parentId = context.getParentId(context.focusedId)
      if (parentId) {
        context.onFocusedIdChange(parentId)
      }
    },

    focusFirstChild: (context) => {
      if (context.focusedId === null) return
      const childrenIds = context.getChildrenIds(context.focusedId)
      if (childrenIds.length > 0) {
        context.onFocusedIdChange(childrenIds[0])
      }
    },

    select: (context, payload: { nodeId: NodeId | null }) => {
      context.onSelectedIdChange(payload.nodeId)
    },

    selectFocused: (context) => {
      context.onSelectedIdChange(context.focusedId)
    },

    expand: (context, payload: { nodeId: NodeId }) => {
      const newExpanded = new Set(context.expandedIds)
      newExpanded.add(payload.nodeId)
      context.onExpandedIdsChange(newExpanded)
    },

    collapse: (context, payload: { nodeId: NodeId }) => {
      const newExpanded = new Set(context.expandedIds)
      newExpanded.delete(payload.nodeId)
      context.onExpandedIdsChange(newExpanded)
    },

    toggleExpand: (context, payload: { nodeId: NodeId }) => {
      const { nodeId } = payload
      const newExpanded = new Set(context.expandedIds)
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId)
      } else {
        newExpanded.add(nodeId)
      }
      context.onExpandedIdsChange(newExpanded)
    },

    expandFocused: (context) => {
      if (context.focusedId === null) return
      const newExpanded = new Set(context.expandedIds)
      newExpanded.add(context.focusedId)
      context.onExpandedIdsChange(newExpanded)
    },

    collapseFocused: (context) => {
      if (context.focusedId === null) return
      const newExpanded = new Set(context.expandedIds)
      newExpanded.delete(context.focusedId)
      context.onExpandedIdsChange(newExpanded)
    },
  },
})
