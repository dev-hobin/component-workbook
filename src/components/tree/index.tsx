import React, { createContext, useContext, useId, useRef } from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useMachine, type Send } from 'controlled-machine/react'

import { treeMachine, type TreeEvents, type NodeId } from './machine'
import { findNodeFromMouseEvent } from '../../primitives/dom'

import {
  NodeStoreProvider,
  useNodeStore,
} from '../../primitives/use-node-store'
import {
  ParentProvider,
  useParentId,
  useLevel,
} from '../../primitives/use-parent-context'
import { useNode } from '../../primitives/use-node'
import { useStoreSubscribe } from '../../primitives/use-store-subscribe'
import type { NodeStore } from '../../primitives/node-store'

// ============================================
// Types
// ============================================

type TreeRole = 'item' | 'text'
type TreeMeta = object

type TreeContextValue = {
  focusedId: NodeId | null
  selectedId: NodeId | null
  expandedIds: Set<NodeId>
  store: NodeStore<TreeRole, TreeMeta>
  send: Send<TreeEvents>
}

// ============================================
// Helpers
// ============================================

/** visible items를 DOM 순서대로 반환 (expandedIds 기반 필터링) */
function getVisibleItemIds(
  store: NodeStore<TreeRole, TreeMeta>,
  expandedIds: Set<NodeId>,
): NodeId[] {
  const result: NodeId[] = []
  const allItems = store.getNodesByRole('item')

  // root items 찾기 (parent가 없거나 parent가 item이 아닌 것)
  const rootItems = allItems.filter((node) => {
    if (!node.parentId) return true
    return !store.getNode(node.parentId, 'item')
  })

  function visit(nodeId: NodeId) {
    result.push(nodeId)

    // 펼쳐진 상태면 자식들도 방문
    if (expandedIds.has(nodeId)) {
      const children = store.getChildrenByRole(nodeId, 'item')
      for (const child of children) {
        visit(child.id)
      }
    }
  }

  for (const root of rootItems) {
    visit(root.id)
  }

  return result
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

  // Controlled
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
    <NodeStoreProvider<TreeRole, TreeMeta>>
      <RootInner {...props} />
    </NodeStoreProvider>
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
  const store = useNodeStore<TreeRole, TreeMeta>()
  const treeId = useId()

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

  // Refs for lazy getters
  const storeRef = useRef(store)
  storeRef.current = store
  const expandedIdsRef = useRef(expandedIds)
  expandedIdsRef.current = expandedIds

  // Event machine
  const { send } = useMachine(treeMachine, {
    focusedId: focusedId ?? null,
    selectedId: selectedId ?? null,
    expandedIds: expandedIds ?? new Set(),
    onFocusedIdChange: (id: NodeId | null) => setFocusedId(id),
    onSelectedIdChange: (id: NodeId | null) => setSelectedId(id),
    onExpandedIdsChange: (ids: Set<NodeId>) => setExpandedIds(ids),
    getVisibleItemIds: () =>
      getVisibleItemIds(storeRef.current, expandedIdsRef.current ?? new Set()),
    getChildrenIds: (nodeId: NodeId) =>
      storeRef.current.getChildrenByRole(nodeId, 'item').map((n) => n.id),
    getParentId: (nodeId: NodeId) => {
      const node = storeRef.current.getNode(nodeId, 'item')
      if (!node?.parentId) return null
      const parentNode = storeRef.current.getNode(node.parentId, 'item')
      return parentNode ? parentNode.id : null
    },
    isLeaf: (nodeId: NodeId) =>
      storeRef.current.getChildrenByRole(nodeId, 'item').length === 0,
    getItemElement: (nodeId: NodeId) =>
      storeRef.current.getElement(nodeId, 'item'),
  })

  // 키보드 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        send('FOCUS_NEXT')
        break
      case 'ArrowUp':
        e.preventDefault()
        send('FOCUS_PREV')
        break
      case 'ArrowRight':
        e.preventDefault()
        send('ARROW_RIGHT')
        break
      case 'ArrowLeft':
        e.preventDefault()
        send('ARROW_LEFT')
        break
      case 'Home':
        e.preventDefault()
        send('FOCUS_FIRST')
        break
      case 'End':
        e.preventDefault()
        send('FOCUS_LAST')
        break
      case 'Enter':
        e.preventDefault()
        send('SELECT_FOCUSED')
        break
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    const itemNodes = store.getNodesByRole('item')
    const elements = new Map(
      itemNodes
        .filter((n) => n.element)
        .map((n) => [n.id, n.element as HTMLElement]),
    )
    const nodeId = findNodeFromMouseEvent(e, elements)
    if (nodeId) {
      send('FOCUS', { nodeId })
      send('SELECT', { nodeId })
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    const itemNodes = store.getNodesByRole('item')
    const elements = new Map(
      itemNodes
        .filter((n) => n.element)
        .map((n) => [n.id, n.element as HTMLElement]),
    )
    const nodeId = findNodeFromMouseEvent(e, elements)
    if (nodeId) {
      const children = store.getChildrenByRole(nodeId, 'item')
      const isLeaf = children.length === 0
      if (!isLeaf) {
        send('TOGGLE_EXPAND', { nodeId })
      }
    }
  }

  const treeContextValue: TreeContextValue = {
    focusedId: focusedId ?? null,
    selectedId: selectedId ?? null,
    expandedIds: expandedIds ?? new Set(),
    store,
    send,
  }

  return (
    <TreeContext.Provider value={treeContextValue}>
      <ParentProvider id="__tree_root__">
        <ul
          id={`tree-${treeId}`}
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
  const { focusedId, selectedId, expandedIds, store } = useTreeContext()
  const { ref, domId } = useNode<TreeRole>({
    role: 'item',
    id: nodeId,
  })

  const level = useLevel()
  const hasChildren = useStoreSubscribe(
    store,
    (s) => s.getChildrenByRole(nodeId, 'item').length > 0,
  )

  const isExpanded = hasChildren && expandedIds.has(nodeId)
  const isSelected = selectedId === nodeId
  const isFocused = focusedId === nodeId

  return (
    <ParentProvider id={nodeId}>
      <li
        ref={ref}
        id={domId}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
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
  const { expandedIds } = useTreeContext()
  const parentId = useParentId()

  if (parentId === null || parentId === '__tree_root__') {
    throw new Error('SubRoot는 Item 안에서 사용해야 합니다.')
  }

  const isExpanded = expandedIds.has(parentId)

  return (
    <ul
      role="group"
      id={`group-${parentId}`}
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
  const { ref, domId } = useNode<TreeRole>({
    role: 'text',
  })

  return (
    <span ref={ref} id={domId} className={className}>
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
