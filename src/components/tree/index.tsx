import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useMachine, type Send } from 'controlled-machine/react'

import {
  treeMachine,
  isItemExpanded,
  isItemSelected,
  type TreeEvents,
  type TreeComputed,
  type ItemValue,
  type TreeItemMeta,
} from './machine'
import { usePresence } from '../../hooks/use-presence'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'
import {
  NodeStoreProvider,
  useNodeStore,
} from '../../primitives/use-node-store'
import { useNode, useLogicalNode } from '../../primitives/use-node'
import { useStoreSubscribe } from '../../primitives/use-store-subscribe'
import {
  ParentProvider,
  useParentId,
  useLevel,
} from '../../primitives/use-parent-context'
import type { NodeStore } from '../../primitives/node-store'

// ============================================
// Types
// ============================================

type TreeRole = 'tree' | 'item' | 'label' | 'group'

type TreeGroupMeta = {
  parentValue: ItemValue
}

type TreeMeta = TreeItemMeta | TreeGroupMeta | object

type TreeContextValue = {
  // State
  expandedValues: ItemValue[]
  selectedValues: ItemValue[]
  highlightedValue: ItemValue | null
  send: Send<TreeEvents>
  computed: TreeComputed

  // NodeStore
  store: NodeStore<TreeRole, TreeMeta>

  // Options
  selectionMode: 'single' | 'multiple'
}

type ItemContextValue = {
  value: ItemValue
  depth: number
  parentValue: ItemValue | null
  hasChildren: boolean
  isExpanded: boolean
  isSelected: boolean
  isDisabled: boolean
  isHighlighted: boolean
}

// ============================================
// Contexts
// ============================================

const TreeContext = createContext<TreeContextValue | null>(null)
const ItemContext = createContext<ItemContextValue | null>(null)

function useTreeContext() {
  const context = useContext(TreeContext)
  if (!context) {
    throw new Error('Tree components must be used within Tree.Root')
  }
  return context
}

function useItemContext() {
  const context = useContext(ItemContext)
  if (!context) {
    throw new Error('Tree.ItemLabel/ItemGroup must be used within Tree.Item')
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: ReactNode
  defaultExpandedValues?: ItemValue[]
  expandedValues?: ItemValue[]
  onExpandedValuesChange?: (values: ItemValue[]) => void
  defaultSelectedValues?: ItemValue[]
  selectedValues?: ItemValue[]
  onSelectedValuesChange?: (values: ItemValue[]) => void
  selectionMode?: 'single' | 'multiple'
  'aria-label'?: string
  'aria-labelledby'?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>

export const Root = forwardRef<HTMLDivElement, RootProps>(
  (
    {
      children,
      defaultExpandedValues = [],
      expandedValues: expandedValuesProp,
      onExpandedValuesChange,
      defaultSelectedValues = [],
      selectedValues: selectedValuesProp,
      onSelectedValuesChange,
      selectionMode = 'single',
      ...rest
    },
    forwardedRef,
  ) => {
    return (
      <NodeStoreProvider<TreeRole, TreeMeta>>
        <RootImpl
          ref={forwardedRef}
          defaultExpandedValues={defaultExpandedValues}
          expandedValues={expandedValuesProp}
          onExpandedValuesChange={onExpandedValuesChange}
          defaultSelectedValues={defaultSelectedValues}
          selectedValues={selectedValuesProp}
          onSelectedValuesChange={onSelectedValuesChange}
          selectionMode={selectionMode}
          {...rest}
        >
          {children}
        </RootImpl>
      </NodeStoreProvider>
    )
  },
)

const RootImpl = forwardRef<HTMLDivElement, RootProps>(
  (
    {
      children,
      defaultExpandedValues = [],
      expandedValues: expandedValuesProp,
      onExpandedValuesChange,
      defaultSelectedValues = [],
      selectedValues: selectedValuesProp,
      onSelectedValuesChange,
      selectionMode = 'single',
      ...rest
    },
    forwardedRef,
  ) => {
    const treeId = useId()
    const store = useNodeStore<TreeRole, TreeMeta>()
    const treeRef = useRef<HTMLDivElement>(null)

    // Controllable state
    const [expandedValues, setExpandedValues] = useControllableState({
      prop: expandedValuesProp,
      defaultProp: defaultExpandedValues,
      onChange: onExpandedValuesChange,
    })

    const [selectedValues, setSelectedValues] = useControllableState({
      prop: selectedValuesProp,
      defaultProp: defaultSelectedValues,
      onChange: onSelectedValuesChange,
    })

    const [highlightedValue, setHighlightedValue] = useState<ItemValue | null>(
      null,
    )

    // Refs for latest values
    const expandedValuesRef = useRef(expandedValues)
    expandedValuesRef.current = expandedValues

    // Machine helpers using NodeStore - real-time queries
    const getVisibleItemValues = useCallback(() => {
      const result: ItemValue[] = []
      const currentExpanded = expandedValuesRef.current ?? []

      // Get all items and build visible list
      const allItems = store.getNodesByRole('item')

      // Build hasChildren lookup from groups
      const groups = store.getNodesByRole('group')
      const parentsWithChildren = new Set(
        groups
          .filter((node) => 'parentValue' in node.meta)
          .map((node) => (node.meta as { parentValue: ItemValue }).parentValue),
      )

      // Sort by DOM order using depth-first traversal
      function collectVisible(parentValue: ItemValue | null) {
        const children = allItems.filter((node) => {
          const meta = node.meta as TreeItemMeta
          return meta.parentValue === parentValue && !meta.disabled
        })

        // Sort children by their DOM position
        children.sort((a, b) => {
          if (!a.element || !b.element) return 0
          const position = a.element.compareDocumentPosition(b.element)
          if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
          if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
          return 0
        })

        for (const child of children) {
          const meta = child.meta as TreeItemMeta
          result.push(meta.value)

          // If expanded and has children, recurse
          const hasChildren = parentsWithChildren.has(meta.value)
          if (hasChildren && currentExpanded.includes(meta.value)) {
            collectVisible(meta.value)
          }
        }
      }

      collectVisible(null)
      return result
    }, [store])

    const getItemMeta = useCallback(
      (value: ItemValue): TreeItemMeta | null => {
        const node = store.getNode(value, 'item')
        return node ? (node.meta as TreeItemMeta) : null
      },
      [store],
    )

    const getParentValue = useCallback(
      (value: ItemValue): ItemValue | null => {
        const meta = getItemMeta(value)
        return meta?.parentValue ?? null
      },
      [getItemMeta],
    )

    const getFirstChildValue = useCallback(
      (value: ItemValue): ItemValue | null => {
        const allItems = store.getNodesByRole('item')
        const children = allItems.filter((node) => {
          const meta = node.meta as TreeItemMeta
          return meta.parentValue === value && !meta.disabled
        })

        if (children.length === 0) return null

        // Sort by DOM order and return first
        children.sort((a, b) => {
          if (!a.element || !b.element) return 0
          const position = a.element.compareDocumentPosition(b.element)
          if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
          if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
          return 0
        })

        return (children[0].meta as TreeItemMeta).value
      },
      [store],
    )

    const getSiblingValues = useCallback(
      (value: ItemValue): ItemValue[] => {
        const meta = getItemMeta(value)
        if (!meta) return []

        const allItems = store.getNodesByRole('item')
        return allItems
          .filter((node) => {
            const nodeMeta = node.meta as TreeItemMeta
            return nodeMeta.parentValue === meta.parentValue
          })
          .map((node) => (node.meta as TreeItemMeta).value)
      },
      [store, getItemMeta],
    )

    const getItemTextValue = useCallback(
      (value: ItemValue): string => {
        const meta = getItemMeta(value)
        return meta?.textValue ?? ''
      },
      [getItemMeta],
    )

    const getHasChildren = useCallback(
      (value: ItemValue): boolean => {
        const groups = store.getNodesByRole('group')
        return groups.some(
          (node) =>
            'parentValue' in node.meta && node.meta.parentValue === value,
        )
      },
      [store],
    )

    // Machine
    const { send, computed } = useMachine(treeMachine, {
      input: {
        expandedValues: expandedValues ?? [],
        onExpandedValuesChange: setExpandedValues,
        selectedValues: selectedValues ?? [],
        onSelectedValuesChange: setSelectedValues,
        highlightedValue,
        onHighlightedValueChange: setHighlightedValue,
        selectionMode,
        getVisibleItemValues,
        getItemMeta,
        getParentValue,
        getFirstChildValue,
        getSiblingValues,
        getItemTextValue,
        getHasChildren,
      },
      actions: {
        focusItem: () => {
          if (highlightedValue) {
            requestAnimationFrame(() => {
              const labelElement = store.getElement(highlightedValue, 'label')
              labelElement?.focus()
            })
          }
        },
      },
    })

    // Keyboard handler on tree root
    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          send('HIGHLIGHT_NEXT')
          break
        case 'ArrowUp':
          e.preventDefault()
          send('HIGHLIGHT_PREV')
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
          send('HIGHLIGHT_FIRST')
          break
        case 'End':
          e.preventDefault()
          send('HIGHLIGHT_LAST')
          break
        case 'Enter':
          e.preventDefault()
          send('ACTIVATE')
          break
        case ' ':
          e.preventDefault()
          if (highlightedValue) {
            send('TOGGLE_SELECT', { value: highlightedValue })
          }
          break
        case '*':
          e.preventDefault()
          send('EXPAND_SIBLINGS')
          break
        default:
          // Character search
          if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            send('TYPE_CHARACTER', { character: e.key })
          }
          break
      }
    }

    const contextValue: TreeContextValue = {
      expandedValues: expandedValues ?? [],
      selectedValues: selectedValues ?? [],
      highlightedValue,
      send,
      computed,
      store,
      selectionMode,
    }

    return (
      <TreeContext.Provider value={contextValue}>
        <div
          ref={composeRefs(forwardedRef, treeRef)}
          {...mergeProps(
            {
              role: 'tree',
              id: treeId,
              tabIndex: 0,
              'aria-multiselectable': selectionMode === 'multiple' || undefined,
              'data-part': 'tree',
              onKeyDown: handleKeyDown,
            },
            rest,
          )}
        >
          <ParentProvider id={null}>{children}</ParentProvider>
        </div>
      </TreeContext.Provider>
    )
  },
)

// ============================================
// Item
// ============================================

export type ItemProps = {
  value: ItemValue
  /** 문자 검색에 사용될 텍스트 값 */
  textValue?: string
  disabled?: boolean
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>

export const Item = forwardRef<HTMLDivElement, ItemProps>(
  (
    { value, textValue = '', disabled = false, children, ...rest },
    forwardedRef,
  ) => {
    const { expandedValues, selectedValues, highlightedValue } =
      useTreeContext()
    const parentValue = useParentId() as ItemValue | null

    // Calculate depth from parent chain
    const depth = useDepth()

    // Check if item has children by querying store for groups with this item as parent
    const hasChildren = useHasChildren(value)

    const isExpanded = isItemExpanded(expandedValues, value)
    const isSelected = isItemSelected(selectedValues, value)
    const isHighlighted = highlightedValue === value
    const isDisabled = disabled

    // useNode for registration
    const { ref } = useNode<TreeRole, TreeItemMeta>({
      role: 'item',
      id: value,
      meta: {
        value,
        disabled,
        parentValue,
        depth,
        textValue,
      },
    })

    const itemContextValue: ItemContextValue = {
      value,
      depth,
      parentValue,
      hasChildren,
      isExpanded,
      isSelected,
      isDisabled,
      isHighlighted,
    }

    return (
      <ItemContext.Provider value={itemContextValue}>
        <div
          ref={composeRefs(forwardedRef, ref)}
          {...mergeProps(
            {
              role: 'treeitem',
              'aria-expanded': hasChildren ? isExpanded : undefined,
              'aria-selected': isSelected,
              'aria-disabled': isDisabled || undefined,
              'data-part': 'item',
              'data-state': hasChildren
                ? isExpanded
                  ? 'open'
                  : 'closed'
                : undefined,
              'data-selected': isSelected || undefined,
              'data-disabled': isDisabled || undefined,
              'data-highlighted': isHighlighted || undefined,
              'data-depth': depth,
              style: { '--tree-depth': depth } as React.CSSProperties,
            },
            rest,
          )}
        >
          <ParentProvider id={value}>{children}</ParentProvider>
        </div>
      </ItemContext.Provider>
    )
  },
)

// Helper to calculate depth - uses React context instead of store queries
// Store queries fail on first render because items aren't registered yet
function useDepth(): number {
  const level = useLevel()
  // level starts at 1 for items inside Root's ParentProvider
  // depth should be 0 for root-level items, so depth = level - 1
  return level - 1
}

// Helper to check if an item has children (ItemGroup registered with this value as parent)
function useHasChildren(value: ItemValue): boolean {
  const { store } = useTreeContext()

  return useStoreSubscribe(store, (s) => {
    const groups = s.getNodesByRole('group')
    return groups.some(
      (node) => 'parentValue' in node.meta && node.meta.parentValue === value,
    )
  })
}

// ============================================
// ItemLabel
// ============================================

export type ItemLabelProps = {
  children: ReactNode
} & ComponentPropsWithoutRef<'div'>

export const ItemLabel = forwardRef<HTMLDivElement, ItemLabelProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { send } = useTreeContext()
    const {
      value,
      hasChildren,
      isExpanded,
      isSelected,
      isDisabled,
      isHighlighted,
    } = useItemContext()

    const { ref } = useNode<TreeRole, object>({
      role: 'label',
      id: value,
    })

    const handleClick = () => {
      if (isDisabled) return
      send('HIGHLIGHT', { value })
      if (hasChildren) {
        send('TOGGLE_EXPAND', { value })
      } else {
        send('TOGGLE_SELECT', { value })
      }
    }

    const handleFocus = () => {
      if (isDisabled) return
      send('HIGHLIGHT', { value })
    }

    return (
      <div
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            tabIndex: isHighlighted ? 0 : -1,
            'data-part': 'label',
            'data-state': hasChildren
              ? isExpanded
                ? 'open'
                : 'closed'
              : undefined,
            'data-selected': isSelected || undefined,
            'data-disabled': isDisabled || undefined,
            'data-highlighted': isHighlighted || undefined,
            onClick: handleClick,
            onFocus: handleFocus,
          },
          rest,
        )}
      >
        {children}
      </div>
    )
  },
)

// ============================================
// ItemGroup
// ============================================

export type ItemGroupProps = {
  children: ReactNode
} & ComponentPropsWithoutRef<'div'>

export const ItemGroup = forwardRef<HTMLDivElement, ItemGroupProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { value, isExpanded } = useItemContext()
    const elementRef = useRef<HTMLDivElement>(null)

    const { domId } = useLogicalNode<TreeRole, TreeGroupMeta>({
      role: 'group',
      id: value,
      meta: {
        parentValue: value,
      },
    })

    const { isPresent, transitionState } = usePresence({
      isVisible: isExpanded,
      resolveElement: () => elementRef.current,
    })

    if (!isPresent) return null

    return (
      <div
        ref={composeRefs(forwardedRef, elementRef)}
        {...mergeProps(
          {
            role: 'group',
            id: domId,
            'aria-labelledby': `label::${value}`,
            'data-part': 'group',
            'data-state': isExpanded ? 'open' : 'closed',
            'data-transition': transitionState,
          },
          rest,
        )}
      >
        {children}
      </div>
    )
  },
)
ItemGroup.displayName = 'TreeItemGroup'

// ============================================
// ItemIndicator (expand/collapse icon)
// ============================================

export type ItemIndicatorProps = {
  children?: ReactNode
} & ComponentPropsWithoutRef<'div'>

export const ItemIndicator = forwardRef<HTMLDivElement, ItemIndicatorProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { hasChildren, isExpanded } = useItemContext()

    if (!hasChildren) return null

    return (
      <div
        ref={forwardedRef}
        {...mergeProps(
          {
            'data-part': 'indicator',
            'data-state': isExpanded ? 'open' : 'closed',
            'aria-hidden': true,
          },
          rest,
        )}
      >
        {children}
      </div>
    )
  },
)

// ============================================
// Export
// ============================================

export { useItemContext }

const Tree = {
  Root,
  Item,
  ItemLabel,
  ItemGroup,
  ItemIndicator,
}

export default Tree
