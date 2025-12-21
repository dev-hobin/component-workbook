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

import type { NodeId, HierarchyShape } from '../../core/registry-core'

import {
  RegistryContext,
  ParentIdContext,
  useRegistryProvider,
  useParentId,
  type RegistryContextValue,
} from '../../shell/use-registry'
import { createIdGenerator } from '../../core/id-core'
import { IdProvider, useDomId } from '../../shell/use-dom-id'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { findNodeFromMouseEvent } from '../../shell/dom'

// ============================================
// Types
// ============================================

type TreeContextValue = {
  state: TreeState
  shape: HierarchyShape
  visibleNodesById: Map<NodeId, VisibleNode>
  registry: RegistryContextValue
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

function Root({
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
  const registry = useRegistryProvider()
  const shape = registry.getShape()

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
      const nodeId = findNodeFromMouseEvent(e, registry.getElements())
      if (nodeId) {
        setFocusedId(nodeId)
        setSelectedId(nodeId)
      }
    },
    [registry, setFocusedId, setSelectedId],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const nodeId = findNodeFromMouseEvent(e, registry.getElements())
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
    [registry, shape.nodesById, expandedIds, state, setExpandedIds],
  )

  // 포커스 동기화
  useEffect(() => {
    if (state.focusedId) {
      const element = registry.getElement(state.focusedId)
      element?.focus()
    }
  }, [state.focusedId, registry])

  const treeContextValue = useMemo<TreeContextValue>(
    () => ({
      state,
      shape,
      visibleNodesById,
      registry,
    }),
    [state, shape, visibleNodesById, registry],
  )

  return (
    <IdProvider value={getId}>
      <RegistryContext.Provider value={registry}>
        <TreeContext.Provider value={treeContextValue}>
          <ParentIdContext.Provider value={null}>
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
          </ParentIdContext.Provider>
        </TreeContext.Provider>
      </RegistryContext.Provider>
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
  const { state, shape, visibleNodesById, registry } = useTreeContext()

  const parentId = useParentId()
  const id = useDomId('item', nodeId)

  const node = shape.nodesById[nodeId]
  const isLeaf = node ? node.children.length === 0 : true
  const isExpanded = !isLeaf && state.expandedIds.has(nodeId)
  const isSelected = state.selectedId === nodeId
  const isFocused = state.focusedId === nodeId
  const level = visibleNodesById.get(nodeId)?.level ?? 1

  return (
    <ParentIdContext.Provider value={nodeId}>
      <li
        id={id}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={isLeaf ? undefined : isExpanded}
        aria-level={level}
        tabIndex={isFocused ? 0 : -1}
        data-selected={isSelected}
        data-focused={isFocused}
        className={className}
        ref={(el) => {
          if (el) registry.register({ id: nodeId, parentId, element: el })
          else registry.unregister(nodeId)
        }}
      >
        {children}
      </li>
    </ParentIdContext.Provider>
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

  if (parentId === null) {
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
// Text (optional helper)
// ============================================

type TextProps = {
  children: React.ReactNode
  className?: string
}

function Text({ children, className }: TextProps) {
  const parentId = useParentId()
  const id = useDomId('text', parentId!)

  return (
    <span id={id} className={className}>
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
