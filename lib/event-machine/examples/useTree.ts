/**
 * useTree 예시 (Payload 지원)
 * Event Machine으로 구현한 TreeView 컴포넌트 훅
 */

import { useState, useMemo, useCallback } from 'react'
import { useEventMachine, EventMachine } from '../index'

// ============================================
// Types
// ============================================

export type TreeNode = {
  id: string
  label: string
  children?: TreeNode[]
}

type FlatNode = {
  id: string
  label: string
  depth: number
  parentId: string | null
  hasChildren: boolean
}

type TreeContext = {
  items: TreeNode[]
  visibleNodes: FlatNode[]
  expandedIds: Set<string>
  selectedIds: Set<string>
  focusedId: string | null
  multiSelect: boolean

  // Setters
  setExpandedIds: (ids: Set<string>) => void
  setSelectedIds: (ids: Set<string>) => void
  setFocusedId: (id: string | null) => void

  // Helpers
  isExpanded: (id: string) => boolean
  isSelected: (id: string) => boolean
  isVisible: (id: string) => boolean
  hasChildren: (id: string) => boolean
  getNode: (id: string) => FlatNode | undefined
  getNext: (fromId?: string) => FlatNode | undefined
  getPrev: (fromId?: string) => FlatNode | undefined
  getFirst: () => FlatNode | undefined
  getLast: () => FlatNode | undefined
  getFirstChild: (id: string) => FlatNode | undefined
  getParent: (id: string) => FlatNode | undefined
}

// ============================================
// Events (타입 안전한 payload)
// ============================================

type TreeEvents = {
  // Payload 있는 이벤트
  FOCUS: { id: string }
  SELECT: { id: string; multi?: boolean }
  EXPAND: { id: string }
  COLLAPSE: { id: string }
  TOGGLE_EXPAND: { id: string }

  // Payload 없는 이벤트 (키보드)
  ARROW_DOWN: void
  ARROW_UP: void
  ARROW_RIGHT: void
  ARROW_LEFT: void
  ENTER: void
  SPACE: void
  HOME: void
  END: void
  ASTERISK: void
}

// ============================================
// Props
// ============================================

type UseTreeProps = {
  items: TreeNode[]

  // Controllable
  expandedIds?: Set<string>
  onExpandedChange?: (ids: Set<string>) => void
  defaultExpandedIds?: Set<string>

  selectedIds?: Set<string>
  onSelectedChange?: (ids: Set<string>) => void
  defaultSelectedIds?: Set<string>

  // Options
  multiSelect?: boolean
}

// ============================================
// Utilities
// ============================================

function flattenVisible(
  nodes: TreeNode[],
  expandedIds: Set<string>,
  depth = 0,
  parentId: string | null = null,
): FlatNode[] {
  const result: FlatNode[] = []

  for (const node of nodes) {
    result.push({
      id: node.id,
      label: node.label,
      depth,
      parentId,
      hasChildren: (node.children?.length ?? 0) > 0,
    })

    if (node.children && expandedIds.has(node.id)) {
      result.push(
        ...flattenVisible(node.children, expandedIds, depth + 1, node.id),
      )
    }
  }

  return result
}

// ============================================
// Machine Definition
// ============================================

const treeMachine: EventMachine<TreeContext, TreeEvents> = {
  on: {
    // === Payload 있는 이벤트 ===

    FOCUS: 'focus',

    SELECT: [
      {
        when: (ctx, { multi }) => multi === true && ctx.multiSelect,
        do: 'addToSelection',
      },
      { do: 'select' },
    ],

    EXPAND: [
      { when: (ctx, { id }) => !ctx.hasChildren(id), do: 'noop' },
      { do: 'expand' },
    ],

    COLLAPSE: 'collapse',

    TOGGLE_EXPAND: [
      { when: (ctx, { id }) => ctx.isExpanded(id), do: 'collapsePayload' },
      { when: (ctx, { id }) => ctx.hasChildren(id), do: 'expandPayload' },
      { do: 'noop' },
    ],

    // === Payload 없는 이벤트 (키보드) ===

    ARROW_DOWN: 'focusNext',
    ARROW_UP: 'focusPrev',
    HOME: 'focusFirst',
    END: 'focusLast',

    ARROW_RIGHT: [
      {
        when: (ctx) => ctx.focusedId !== null && ctx.isExpanded(ctx.focusedId),
        do: 'focusFirstChild',
      },
      {
        when: (ctx) => ctx.focusedId !== null && ctx.hasChildren(ctx.focusedId),
        do: 'expandFocused',
      },
      { do: 'noop' },
    ],

    ARROW_LEFT: [
      {
        when: (ctx) => ctx.focusedId !== null && ctx.isExpanded(ctx.focusedId),
        do: 'collapseFocused',
      },
      { do: 'focusParent' },
    ],

    ENTER: 'toggleSelectFocused',
    SPACE: 'toggleSelectFocused',
    ASTERISK: 'expandAll',
  },

  always: [
    {
      when: (ctx) => ctx.focusedId !== null && !ctx.isVisible(ctx.focusedId),
      do: 'focusFirst',
    },
  ],

  actions: {
    noop: () => {},

    // === Payload 액션 ===

    focus: (ctx, { id }: { id: string }) => {
      ctx.setFocusedId(id)
    },

    select: (ctx, { id }: { id: string }) => {
      ctx.setSelectedIds(new Set([id]))
    },

    addToSelection: (ctx, { id }: { id: string }) => {
      ctx.setSelectedIds(new Set([...ctx.selectedIds, id]))
    },

    expand: (ctx, { id }: { id: string }) => {
      ctx.setExpandedIds(new Set([...ctx.expandedIds, id]))
    },

    collapse: (ctx, { id }: { id: string }) => {
      const next = new Set(ctx.expandedIds)
      next.delete(id)
      ctx.setExpandedIds(next)
    },

    // TOGGLE_EXPAND용 (payload에서 id 가져옴)
    expandPayload: (ctx, { id }: { id: string }) => {
      ctx.setExpandedIds(new Set([...ctx.expandedIds, id]))
    },
    collapsePayload: (ctx, { id }: { id: string }) => {
      const next = new Set(ctx.expandedIds)
      next.delete(id)
      ctx.setExpandedIds(next)
    },

    // === 키보드 액션 (focusedId 사용) ===

    focusNext: (ctx) => {
      const next = ctx.getNext(ctx.focusedId ?? undefined)
      if (next) ctx.setFocusedId(next.id)
    },

    focusPrev: (ctx) => {
      const prev = ctx.getPrev(ctx.focusedId ?? undefined)
      if (prev) ctx.setFocusedId(prev.id)
    },

    focusFirst: (ctx) => {
      const first = ctx.getFirst()
      if (first) ctx.setFocusedId(first.id)
    },

    focusLast: (ctx) => {
      const last = ctx.getLast()
      if (last) ctx.setFocusedId(last.id)
    },

    focusFirstChild: (ctx) => {
      if (!ctx.focusedId) return
      const child = ctx.getFirstChild(ctx.focusedId)
      if (child) ctx.setFocusedId(child.id)
    },

    focusParent: (ctx) => {
      if (!ctx.focusedId) return
      const parent = ctx.getParent(ctx.focusedId)
      if (parent) ctx.setFocusedId(parent.id)
    },

    expandFocused: (ctx) => {
      if (!ctx.focusedId) return
      ctx.setExpandedIds(new Set([...ctx.expandedIds, ctx.focusedId]))
    },

    collapseFocused: (ctx) => {
      if (!ctx.focusedId) return
      const next = new Set(ctx.expandedIds)
      next.delete(ctx.focusedId)
      ctx.setExpandedIds(next)
    },

    toggleSelectFocused: (ctx) => {
      if (!ctx.focusedId) return

      if (ctx.multiSelect) {
        const next = new Set(ctx.selectedIds)
        if (next.has(ctx.focusedId)) {
          next.delete(ctx.focusedId)
        } else {
          next.add(ctx.focusedId)
        }
        ctx.setSelectedIds(next)
      } else {
        if (ctx.selectedIds.has(ctx.focusedId)) {
          ctx.setSelectedIds(new Set())
        } else {
          ctx.setSelectedIds(new Set([ctx.focusedId]))
        }
      }
    },

    expandAll: (ctx) => {
      const allIds = new Set<string>()
      const collect = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.children?.length) {
            allIds.add(node.id)
            collect(node.children)
          }
        }
      }
      collect(ctx.items)
      ctx.setExpandedIds(allIds)
    },
  },
}

// ============================================
// Hook
// ============================================

export function useTree(props: UseTreeProps) {
  const {
    items,
    expandedIds: controlledExpanded,
    onExpandedChange,
    defaultExpandedIds = new Set<string>(),
    selectedIds: controlledSelected,
    onSelectedChange,
    defaultSelectedIds = new Set<string>(),
    multiSelect = false,
  } = props

  // Internal states
  const [internalExpanded, setInternalExpanded] = useState(defaultExpandedIds)
  const [internalSelected, setInternalSelected] = useState(defaultSelectedIds)
  const [focusedId, setFocusedId] = useState<string | null>(null)

  // Controlled vs Uncontrolled
  const expandedIds = controlledExpanded ?? internalExpanded
  const selectedIds = controlledSelected ?? internalSelected

  const setExpandedIds = useCallback(
    (ids: Set<string>) => {
      if (controlledExpanded === undefined) {
        setInternalExpanded(ids)
      }
      onExpandedChange?.(ids)
    },
    [controlledExpanded, onExpandedChange],
  )

  const setSelectedIds = useCallback(
    (ids: Set<string>) => {
      if (controlledSelected === undefined) {
        setInternalSelected(ids)
      }
      onSelectedChange?.(ids)
    },
    [controlledSelected, onSelectedChange],
  )

  // Derived
  const visibleNodes = useMemo(
    () => flattenVisible(items, expandedIds),
    [items, expandedIds],
  )

  // Build context
  const ctx: TreeContext = useMemo(() => {
    const getIndex = (id?: string) =>
      id ? visibleNodes.findIndex((n) => n.id === id) : -1

    return {
      items,
      visibleNodes,
      expandedIds,
      selectedIds,
      focusedId,
      multiSelect,
      setExpandedIds,
      setSelectedIds,
      setFocusedId,

      isExpanded: (id) => expandedIds.has(id),
      isSelected: (id) => selectedIds.has(id),
      isVisible: (id) => visibleNodes.some((n) => n.id === id),
      hasChildren: (id) =>
        visibleNodes.find((n) => n.id === id)?.hasChildren ?? false,
      getNode: (id) => visibleNodes.find((n) => n.id === id),

      getNext: (fromId) => {
        const idx = fromId ? getIndex(fromId) : -1
        return visibleNodes[idx + 1]
      },
      getPrev: (fromId) => {
        const idx = fromId ? getIndex(fromId) : visibleNodes.length
        return visibleNodes[idx - 1]
      },
      getFirst: () => visibleNodes[0],
      getLast: () => visibleNodes[visibleNodes.length - 1],
      getFirstChild: (id) => {
        const idx = getIndex(id)
        const next = visibleNodes[idx + 1]
        return next?.parentId === id ? next : undefined
      },
      getParent: (id) => {
        const node = visibleNodes.find((n) => n.id === id)
        return node?.parentId
          ? visibleNodes.find((n) => n.id === node.parentId)
          : undefined
      },
    }
  }, [
    items,
    visibleNodes,
    expandedIds,
    selectedIds,
    focusedId,
    multiSelect,
    setExpandedIds,
    setSelectedIds,
  ])

  // Event machine
  const send = useEventMachine(treeMachine, ctx)

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const keyMap: Record<string, keyof TreeEvents> = {
        ArrowDown: 'ARROW_DOWN',
        ArrowUp: 'ARROW_UP',
        ArrowRight: 'ARROW_RIGHT',
        ArrowLeft: 'ARROW_LEFT',
        Enter: 'ENTER',
        ' ': 'SPACE',
        Home: 'HOME',
        End: 'END',
        '*': 'ASTERISK',
      }

      const event = keyMap[e.key]
      if (event) {
        e.preventDefault()
        // void 이벤트는 payload 없이 호출
        send(event)
      }
    },
    [send],
  )

  return {
    // State
    expandedIds,
    selectedIds,
    focusedId,
    visibleNodes,

    // Send (타입 안전)
    send,

    // Convenience methods (send 래핑)
    focus: (id: string) => send('FOCUS', { id }),
    select: (id: string, multi?: boolean) => send('SELECT', { id, multi }),
    expand: (id: string) => send('EXPAND', { id }),
    collapse: (id: string) => send('COLLAPSE', { id }),
    toggleExpand: (id: string) => send('TOGGLE_EXPAND', { id }),

    // Props getters
    getTreeProps: () => ({
      role: 'tree' as const,
      'aria-multiselectable': multiSelect || undefined,
      tabIndex: 0,
      onKeyDown: handleKeyDown,
      onFocus: () => {
        if (focusedId === null && visibleNodes.length > 0) {
          setFocusedId(visibleNodes[0].id)
        }
      },
    }),

    getNodeProps: (id: string) => {
      const node = visibleNodes.find((n) => n.id === id)
      const isExpanded = expandedIds.has(id)
      const isSelected = selectedIds.has(id)
      const isFocused = focusedId === id

      return {
        role: 'treeitem' as const,
        'aria-expanded': node?.hasChildren ? isExpanded : undefined,
        'aria-selected': isSelected,
        tabIndex: isFocused ? 0 : -1,
        'data-focused': isFocused || undefined,
        onClick: () => {
          send('FOCUS', { id })
          send('SELECT', { id })
        },
        onDoubleClick: () => {
          send('TOGGLE_EXPAND', { id })
        },
      }
    },

    getExpandButtonProps: (id: string) => ({
      'aria-label': expandedIds.has(id) ? 'Collapse' : 'Expand',
      tabIndex: -1,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        send('TOGGLE_EXPAND', { id })
      },
    }),
  }
}

// ============================================
// Usage Example
// ============================================

/*
function TreeExample() {
  const tree = useTree({
    items: [
      { id: '1', label: 'Folder 1', children: [
        { id: '1-1', label: 'File 1' },
      ]},
      { id: '2', label: 'File 2' },
    ],
  });

  return (
    <div {...tree.getTreeProps()}>
      {tree.visibleNodes.map(node => (
        <div 
          key={node.id} 
          {...tree.getNodeProps(node.id)}
          style={{ paddingLeft: node.depth * 20 }}
        >
          {node.hasChildren && (
            <button {...tree.getExpandButtonProps(node.id)}>
              {tree.expandedIds.has(node.id) ? '▼' : '▶'}
            </button>
          )}
          {node.label}
        </div>
      ))}
    </div>
  );
}

// 직접 send 사용
tree.send('SELECT', { id: 'node-1', multi: true });
tree.send('EXPAND', { id: 'folder-1' });
tree.send('ARROW_DOWN'); // payload 없음
*/
