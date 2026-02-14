import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import { useHighlight, type UseHighlightReturn } from '../../hooks/use-highlight'
import { useCharacterSearch } from '../../hooks/use-character-search'
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

export type ItemValue = string

export type TreeItemMeta = {
  value: ItemValue
  disabled: boolean
  parentValue: ItemValue | null
  depth: number
  textValue: string
}

type TreeRole = 'tree' | 'item' | 'label' | 'group'

type TreeGroupMeta = {
  parentValue: ItemValue
}

type TreeMeta = TreeItemMeta | TreeGroupMeta | object

export function isItemExpanded(
  expandedValues: ItemValue[],
  value: ItemValue,
): boolean {
  return expandedValues.includes(value)
}

export function isItemSelected(
  selectedValues: ItemValue[],
  value: ItemValue,
): boolean {
  return selectedValues.includes(value)
}

type TreeContextValue = {
  // State
  expandedValues: ItemValue[]
  selectedValues: ItemValue[]
  highlightedValue: ItemValue | null

  // NodeStore
  store: NodeStore<TreeRole, TreeMeta>

  // Options
  selectionMode: 'single' | 'multiple'

  // Highlight
  highlight: UseHighlightReturn

  // Actions
  setHighlightedValue: (value: ItemValue | null) => void
  expand: (value: ItemValue) => void
  collapse: (value: ItemValue) => void
  toggleExpand: (value: ItemValue) => void
  select: (value: ItemValue) => void
  toggleSelect: (value: ItemValue) => void
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

    // Controllable states
    const [expandedValues = [], setExpandedValues] = useControllableState({
      prop: expandedValuesProp,
      defaultProp: defaultExpandedValues,
      onChange: onExpandedValuesChange,
    })
    const [selectedValues = [], setSelectedValues] = useControllableState({
      prop: selectedValuesProp,
      defaultProp: defaultSelectedValues,
      onChange: onSelectedValuesChange,
    })

    // Refs for latest values (needed in callbacks)
    const expandedValuesRef = useRef(expandedValues)
    expandedValuesRef.current = expandedValues

    // NodeStore-based helpers
    const getVisibleItemValues = useCallback(() => {
      const result: ItemValue[] = []
      const currentExpanded = expandedValuesRef.current ?? []

      const allItems = store.getNodesByRole('item')

      const groups = store.getNodesByRole('group')
      const parentsWithChildren = new Set(
        groups
          .filter((node) => 'parentValue' in node.meta)
          .map((node) => (node.meta as { parentValue: ItemValue }).parentValue),
      )

      function collectVisible(parentValue: ItemValue | null) {
        const children = allItems.filter((node) => {
          const meta = node.meta as TreeItemMeta
          return meta.parentValue === parentValue && !meta.disabled
        })

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

    // useHighlight: index 기반
    const visibleItems = getVisibleItemValues()
    const highlight = useHighlight(visibleItems.length)

    // index → value 파생
    const highlightedValue =
      highlight.index >= 0 ? (visibleItems[highlight.index] ?? null) : null

    // character search
    const typeahead = useCharacterSearch(
      () => visibleItems.map((v) => getItemTextValue(v)),
      (index) => highlight.set(index),
      highlight.index >= 0 ? highlight.index : undefined,
    )

    // setHighlightedValue: value로 직접 설정 (click, focus 등)
    const setHighlightedValue = useCallback(
      (value: ItemValue | null) => {
        if (value === null) {
          highlight.clear()
          return
        }
        const items = getVisibleItemValues()
        const idx = items.indexOf(value)
        if (idx >= 0) {
          highlight.set(idx)
        }
      },
      [getVisibleItemValues, highlight],
    )

    // Focus highlighted item when it changes
    useEffect(() => {
      if (highlightedValue) {
        requestAnimationFrame(() => {
          const labelElement = store.getElement(highlightedValue, 'label')
          labelElement?.focus()
        })
      }
    }, [highlightedValue, store])

    // Actions
    const expand = useCallback(
      (value: ItemValue) => {
        if (!getHasChildren(value)) return
        if (expandedValues.includes(value)) return
        setExpandedValues([...expandedValues, value])
      },
      [expandedValues, setExpandedValues, getHasChildren],
    )

    const collapse = useCallback(
      (value: ItemValue) => {
        if (!expandedValues.includes(value)) return
        setExpandedValues(expandedValues.filter((v) => v !== value))
      },
      [expandedValues, setExpandedValues],
    )

    const toggleExpand = useCallback(
      (value: ItemValue) => {
        if (!getHasChildren(value)) return
        if (expandedValues.includes(value)) {
          setExpandedValues(expandedValues.filter((v) => v !== value))
        } else {
          setExpandedValues([...expandedValues, value])
        }
      },
      [expandedValues, setExpandedValues, getHasChildren],
    )

    const select = useCallback(
      (value: ItemValue) => {
        const meta = getItemMeta(value)
        if (meta?.disabled) return

        if (selectionMode === 'single') {
          setSelectedValues([value])
        } else {
          if (!selectedValues.includes(value)) {
            setSelectedValues([...selectedValues, value])
          }
        }
      },
      [selectionMode, selectedValues, setSelectedValues, getItemMeta],
    )

    const toggleSelect = useCallback(
      (value: ItemValue) => {
        const meta = getItemMeta(value)
        if (meta?.disabled) return

        if (selectedValues.includes(value)) {
          setSelectedValues(selectedValues.filter((v) => v !== value))
        } else {
          setSelectedValues([...selectedValues, value])
        }
      },
      [selectedValues, setSelectedValues, getItemMeta],
    )

    // Keyboard handler on tree root
    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          highlight.next()
          break
        case 'ArrowUp':
          e.preventDefault()
          highlight.prev()
          break
        case 'ArrowRight': {
          e.preventDefault()
          if (!highlightedValue) return
          const hasChildren = getHasChildren(highlightedValue)
          if (!hasChildren) return

          const isExpanded = expandedValues.includes(highlightedValue)
          if (!isExpanded) {
            expand(highlightedValue)
          } else {
            // Move to first child
            const firstChild = getFirstChildValue(highlightedValue)
            if (firstChild) {
              // After expand, firstChild is at highlight.index + 1
              highlight.set(highlight.index + 1)
            }
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (!highlightedValue) return
          const hasChildren = getHasChildren(highlightedValue)
          const isExpanded = hasChildren && expandedValues.includes(highlightedValue)

          if (isExpanded) {
            collapse(highlightedValue)
          } else {
            // Move to parent
            const parentVal = getParentValue(highlightedValue)
            if (parentVal) {
              const items = getVisibleItemValues()
              const idx = items.indexOf(parentVal)
              if (idx >= 0) {
                highlight.set(idx)
              }
            }
          }
          break
        }
        case 'Home':
          e.preventDefault()
          highlight.first()
          break
        case 'End':
          e.preventDefault()
          highlight.last()
          break
        case 'Enter': {
          e.preventDefault()
          if (!highlightedValue) return
          const meta = getItemMeta(highlightedValue)
          if (!meta || meta.disabled) return

          const hasChildren = getHasChildren(highlightedValue)
          if (hasChildren) {
            toggleExpand(highlightedValue)
          } else if (selectionMode === 'multiple') {
            toggleSelect(highlightedValue)
          } else {
            select(highlightedValue)
          }
          break
        }
        case ' ': {
          e.preventDefault()
          if (!highlightedValue) return
          if (selectionMode === 'multiple') {
            toggleSelect(highlightedValue)
          } else {
            select(highlightedValue)
          }
          break
        }
        case '*': {
          e.preventDefault()
          if (!highlightedValue) return
          const siblings = getSiblingValues(highlightedValue)
          const toExpand = siblings.filter((v) => {
            return getHasChildren(v) && !expandedValues.includes(v)
          })
          if (toExpand.length > 0) {
            setExpandedValues([...expandedValues, ...toExpand])
          }
          break
        }
        default:
          if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            typeahead(e.key)
          }
          break
      }
    }

    const contextValue: TreeContextValue = {
      expandedValues,
      selectedValues,
      highlightedValue,
      store,
      selectionMode,
      highlight,
      setHighlightedValue,
      expand,
      collapse,
      toggleExpand,
      select,
      toggleSelect,
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

    const depth = useDepth()
    const hasChildren = useHasChildren(value)

    const isExpanded = isItemExpanded(expandedValues, value)
    const isSelected = isItemSelected(selectedValues, value)
    const isHighlighted = highlightedValue === value
    const isDisabled = disabled

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

// Helper to calculate depth
function useDepth(): number {
  const level = useLevel()
  return level - 1
}

// Helper to check if an item has children
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
    const { setHighlightedValue, toggleExpand, toggleSelect } = useTreeContext()
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
      setHighlightedValue(value)
      if (hasChildren) {
        toggleExpand(value)
      } else {
        toggleSelect(value)
      }
    }

    const handleFocus = () => {
      if (isDisabled) return
      setHighlightedValue(value)
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
    const { store } = useTreeContext()
    const { value, isExpanded } = useItemContext()
    const elementRef = useRef<HTMLDivElement>(null)

    const { domId } = useLogicalNode<TreeRole, TreeGroupMeta>({
      role: 'group',
      id: value,
      meta: {
        parentValue: value,
      },
    })

    const labelDomId = useStoreSubscribe(
      store,
      (s) => s.getNode(value, 'label')?.domId ?? null,
    )

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
            'aria-labelledby': labelDomId ?? undefined,
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
