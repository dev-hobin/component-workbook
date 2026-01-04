import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useId,
} from 'react'

import {
  type TreeState,
  type TreeShape,
  type NodeId,
  moveFocusDown,
  moveFocusUp,
  moveFocusFirst,
  moveFocusLast,
  handleRight,
  handleLeft,
  selectFocused,
  expand,
  collapse,
  getVisibleNodes,
  type VisibleNode,
} from './core'

import { createIdGenerator } from '../../core/id-core'
import { IdProvider, useDomId } from '../../shell/use-dom-id'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { findNodeFromMouseEvent } from '../../shell/dom'

import {
  ComponentStoreProvider,
  useSnapshot,
} from '../../shell/use-component-store'
import { ParentProvider, useParentId } from '../../shell/use-parent-context'
import { useNode } from '../../shell/use-node'
import {
  getChildrenByRole,
  getElement,
} from '../../core/component-store-helpers'
import type { ComponentSnapshot } from '../../core/component-store'

// ============================================
// Types
// ============================================

type TreeRole = 'root' | 'item' | 'text'
type TreeMeta = object

type TreeContextValue = {
  state: TreeState
  shape: TreeShape
  visibleNodesById: Map<NodeId, VisibleNode>
}

// ============================================
// Helpers
// ============================================

function snapshotToTreeShape(
  snapshot: ComponentSnapshot<TreeRole, TreeMeta>,
): TreeShape {
  const nodesById: Record<NodeId, { id: NodeId; children: NodeId[] }> = {}
  const rootIds: NodeId[] = []

  for (const node of snapshot.nodes.values()) {
    if (node.role !== 'item') continue

    const children = getChildrenByRole(snapshot, node.id, 'item').map(
      (n) => n.id,
    )
    nodesById[node.id] = { id: node.id, children }

    // parent가 없거나 parent가 item이 아니면 root
    const parent = node.parentId ? snapshot.nodes.get(node.parentId) : null
    if (!parent || parent.role !== 'item') {
      rootIds.push(node.id)
    }
  }

  return { rootIds, nodesById }
}

// ============================================
// Contexts
// ============================================

const TreeContext = createContext<TreeContextValue | null>(null)

function useTreeContext() {
  const context = useContext(TreeContext)
  if (!context) {
    throw new Error('TreeView 컴포넌트는 TreeView.Root 안에서 사용해야 합니다.')
  }
  return context
}

// ============================================
// Root
// ============================================

type RootProps = {
  children: React.ReactNode
  className?: string
  'aria-label'?: string

  // Controlled (undefined = uncontrolled, null = "선택 없음")
  focusedId?: NodeId | null
  selectedId?: NodeId | null
  expandedIds?: Set<NodeId>

  // Defaults
  defaultFocusedId?: NodeId | null
  defaultSelectedId?: NodeId | null
  defaultExpandedIds?: Set<NodeId>

  // Callbacks
  onFocusChange?: (id: NodeId | null) => void
  onSelectChange?: (id: NodeId | null) => void
  onExpandChange?: (ids: Set<NodeId>) => void
}

function Root(props: RootProps) {
  return (
    <ComponentStoreProvider<TreeRole, TreeMeta>>
      <RootInner {...props} />
    </ComponentStoreProvider>
  )
}

function RootInner({
  children,
  className,
  'aria-label': ariaLabel,
  focusedId: focusedIdProp,
  selectedId: selectedIdProp,
  expandedIds: expandedIdsProp,
  defaultFocusedId = null,
  defaultSelectedId = null,
  defaultExpandedIds = new Set(),
  onFocusChange,
  onSelectChange,
  onExpandChange,
}: RootProps) {
  const snapshot = useSnapshot<TreeRole, TreeMeta>()
  const shape = useMemo(() => snapshotToTreeShape(snapshot), [snapshot])

  const reactId = useId()
  const getId = useMemo(() => createIdGenerator(`tree-${reactId}`), [reactId])

  const [focusedId, setFocusedId] = useControllableState({
    prop: focusedIdProp,
    defaultProp: defaultFocusedId,
    onChange: onFocusChange,
  })

  const [selectedId, setSelectedId] = useControllableState({
    prop: selectedIdProp,
    defaultProp: defaultSelectedId,
    onChange: onSelectChange,
  })

  const [expandedIds, setExpandedIds] = useControllableState({
    prop: expandedIdsProp,
    defaultProp: defaultExpandedIds,
    onChange: onExpandChange,
  })

  const state: TreeState = useMemo(
    () => ({
      focusedId,
      selectedId,
      expandedIds,
    }),
    [focusedId, selectedId, expandedIds],
  )

  const visibleNodes = useMemo(
    () => getVisibleNodes(shape, state),
    [shape, state],
  )

  const visibleNodesById = useMemo(
    () => new Map(visibleNodes.map((n) => [n.id, n])),
    [visibleNodes],
  )

  // 키보드 핸들러
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const next = moveFocusDown(shape, state)
          setFocusedId(next.focusedId)
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const next = moveFocusUp(shape, state)
          setFocusedId(next.focusedId)
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          const next = handleRight(shape, state)
          setFocusedId(next.focusedId)
          setExpandedIds(next.expandedIds)
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          const next = handleLeft(shape, state)
          setFocusedId(next.focusedId)
          setExpandedIds(next.expandedIds)
          break
        }
        case 'Home': {
          e.preventDefault()
          const next = moveFocusFirst(shape, state)
          setFocusedId(next.focusedId)
          break
        }
        case 'End': {
          e.preventDefault()
          const next = moveFocusLast(shape, state)
          setFocusedId(next.focusedId)
          break
        }
        case 'Enter': {
          e.preventDefault()
          const next = selectFocused(state)
          setSelectedId(next.selectedId)
          break
        }
      }
    },
    [shape, state, setFocusedId, setSelectedId, setExpandedIds],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const itemNodes = Array.from(snapshot.nodes.values()).filter(
        (n) => n.role === 'item',
      )
      const elements = new Map(
        itemNodes
          .filter((n) => n.element)
          .map((n) => [n.id, n.element as HTMLElement]),
      )
      const nodeId = findNodeFromMouseEvent(e, elements)
      if (nodeId) {
        setFocusedId(nodeId)
        setSelectedId(nodeId)
      }
    },
    [snapshot, setFocusedId, setSelectedId],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const itemNodes = Array.from(snapshot.nodes.values()).filter(
        (n) => n.role === 'item',
      )
      const elements = new Map(
        itemNodes
          .filter((n) => n.element)
          .map((n) => [n.id, n.element as HTMLElement]),
      )
      const nodeId = findNodeFromMouseEvent(e, elements)
      if (nodeId) {
        const node = shape.nodesById[nodeId]
        const isLeaf = node ? node.children.length === 0 : true
        if (!isLeaf) {
          const isExpanded = expandedIds.has(nodeId)
          const next = isExpanded
            ? collapse(state, nodeId)
            : expand(state, nodeId)
          setExpandedIds(next.expandedIds)
        }
      }
    },
    [snapshot, shape.nodesById, expandedIds, state, setExpandedIds],
  )

  // 포커스 동기화
  useEffect(() => {
    if (state.focusedId) {
      const element = getElement(snapshot, state.focusedId)
      element?.focus()
    }
  }, [state.focusedId, snapshot])

  const treeContextValue = useMemo<TreeContextValue>(
    () => ({
      state,
      shape,
      visibleNodesById,
    }),
    [state, shape, visibleNodesById],
  )

  return (
    <IdProvider value={getId}>
      <TreeContext.Provider value={treeContextValue}>
        <ParentProvider id="__tree_root__">
          <ul
            id={getId('root')}
            role="tree"
            aria-label={ariaLabel}
            aria-multiselectable={false}
            className={className}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          >
            {children}
          </ul>
        </ParentProvider>
      </TreeContext.Provider>
    </IdProvider>
  )
}

// ============================================
// Item
// ============================================

type ItemProps = {
  nodeId: NodeId
  children: React.ReactNode
  className?: string
}

function Item({ nodeId, children, className }: ItemProps) {
  const { state, shape, visibleNodesById } = useTreeContext()
  const { ref } = useNode<TreeRole>({
    role: 'item',
    id: nodeId,
    domId: nodeId,
  })

  const domId = useDomId('item', nodeId)

  const node = shape.nodesById[nodeId]
  const isLeaf = node ? node.children.length === 0 : true
  const isExpanded = !isLeaf && state.expandedIds.has(nodeId)
  const isSelected = state.selectedId === nodeId
  const isFocused = state.focusedId === nodeId
  const level = visibleNodesById.get(nodeId)?.level ?? 1

  return (
    <ParentProvider id={nodeId}>
      <li
        ref={ref as React.RefObject<HTMLLIElement>}
        id={domId}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={isLeaf ? undefined : isExpanded}
        aria-level={level}
        tabIndex={isFocused ? 0 : -1}
        data-selected={isSelected}
        data-focused={isFocused}
        className={className}
      >
        {children}
      </li>
    </ParentProvider>
  )
}

// ============================================
// SubRoot
// ============================================

type SubRootProps = {
  children: React.ReactNode
  className?: string
}

function SubRoot({ children, className }: SubRootProps) {
  const { state } = useTreeContext()
  const parentId = useParentId()
  const id = useDomId('group', parentId!)

  if (parentId === null || parentId === '__tree_root__') {
    throw new Error('SubRoot는 Item 안에서 사용해야 합니다.')
  }

  const isExpanded = state.expandedIds.has(parentId)

  return (
    <ul
      role="group"
      id={id}
      hidden={!isExpanded}
      data-expanded={isExpanded}
      className={className}
    >
      {children}
    </ul>
  )
}

// ============================================
// Text
// ============================================

type TextProps = {
  children: React.ReactNode
  className?: string
}

function Text({ children, className }: TextProps) {
  const parentId = useParentId()
  const { ref, domId } = useNode<TreeRole>({
    role: 'text',
    domId: parentId ? `${parentId}-text` : undefined,
  })

  return (
    <span
      ref={ref as React.RefObject<HTMLSpanElement>}
      id={domId}
      className={className}
    >
      {children}
    </span>
  )
}

// ============================================
// Export
// ============================================

export const TreeView = {
  Root,
  Item,
  SubRoot,
  Text,
}
