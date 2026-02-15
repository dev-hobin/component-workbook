import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import { useCharacterSearch } from '../../hooks/use-character-search'
import { usePresence } from '../../hooks/use-presence'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'

import { useIdMap, createIdMapKey, type IdMap } from '../../primitives/id-map'
import {
  createElementRegistry,
  type ElementRegistry,
} from '../../primitives/element-registry'
import { RegistrationProvider } from '../../primitives/registration-context'
import { useRegister } from '../../primitives/use-register'

// ============================================
// Types
// ============================================

export type ItemValue = string

type TreeItemMeta = {
  value: ItemValue
  disabled: boolean
  parentValue: ItemValue | null
  depth: number
  textValue: string
}

type TreeGroupMeta = {
  parentValue: ItemValue
}

type TreeMeta = TreeItemMeta | TreeGroupMeta

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
  idMap: IdMap
  registry: ElementRegistry<TreeMeta>
  // State
  expandedValues: ItemValue[]
  selectedValues: ItemValue[]
  highlightedValue: ItemValue | null
  // Options
  selectionMode: 'single' | 'multiple'
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
// Tree-local Parent/Depth Context
// ============================================

type TreeParentContextValue = {
  parentValue: ItemValue | null
  depth: number
}

const TreeParentContext = createContext<TreeParentContextValue>({
  parentValue: null,
  depth: -1,
})

function TreeParentProvider({
  value,
  children,
}: {
  value: ItemValue | null
  children: ReactNode
}) {
  const parent = useContext(TreeParentContext)
  return (
    <TreeParentContext.Provider
      value={{ parentValue: value, depth: parent.depth + 1 }}
    >
      {children}
    </TreeParentContext.Provider>
  )
}

function useTreeParent() {
  return useContext(TreeParentContext)
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
// Registry Helpers
// ============================================

function getVisibleItemValues(
  registry: ElementRegistry<TreeMeta>,
  expandedValues: ItemValue[],
): ItemValue[] {
  const result: ItemValue[] = []

  const allItems = registry.getEntriesByRoleInDomOrder('item')

  function isAncestorCollapsed(parentValue: ItemValue | null): boolean {
    if (parentValue === null) return false
    if (!expandedValues.includes(parentValue)) return true
    // Check grandparent
    const parentEntry = allItems.find(
      (e) => (e.meta as TreeItemMeta).value === parentValue,
    )
    if (!parentEntry) return false
    return isAncestorCollapsed(
      (parentEntry.meta as TreeItemMeta).parentValue,
    )
  }

  for (const entry of allItems) {
    const meta = entry.meta as TreeItemMeta
    if (meta.disabled) continue
    if (isAncestorCollapsed(meta.parentValue)) continue
    result.push(meta.value)
  }

  return result
}

function getHasChildren(
  registry: ElementRegistry<TreeMeta>,
  value: ItemValue,
): boolean {
  const groups = registry.getEntriesByRole('group')
  return groups.some(
    (entry) => (entry.meta as TreeGroupMeta).parentValue === value,
  )
}

function getParentValue(
  registry: ElementRegistry<TreeMeta>,
  value: ItemValue,
): ItemValue | null {
  const entry = registry.getEntry(value, 'item')
  if (!entry) return null
  return (entry.meta as TreeItemMeta).parentValue
}

function getFirstChildValue(
  registry: ElementRegistry<TreeMeta>,
  value: ItemValue,
): ItemValue | null {
  const allItems = registry.getEntriesByRoleInDomOrder('item')
  const children = allItems.filter((entry) => {
    const meta = entry.meta as TreeItemMeta
    return meta.parentValue === value && !meta.disabled
  })
  if (children.length === 0) return null
  return (children[0].meta as TreeItemMeta).value
}

function getSiblingValues(
  registry: ElementRegistry<TreeMeta>,
  value: ItemValue,
): ItemValue[] {
  const entry = registry.getEntry(value, 'item')
  if (!entry) return []
  const parentVal = (entry.meta as TreeItemMeta).parentValue

  const allItems = registry.getEntriesByRole('item')
  return allItems
    .filter((e) => (e.meta as TreeItemMeta).parentValue === parentVal)
    .map((e) => (e.meta as TreeItemMeta).value)
}

function getItemTextValue(
  registry: ElementRegistry<TreeMeta>,
  value: ItemValue,
): string {
  const entry = registry.getEntry(value, 'item')
  if (!entry) return ''
  return (entry.meta as TreeItemMeta).textValue ?? ''
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
    const [idMap, idActions] = useIdMap()

    const registryRef = useRef<ElementRegistry<TreeMeta>>(null!)
    if (!registryRef.current) {
      registryRef.current = createElementRegistry<TreeMeta>()
    }
    const registry = registryRef.current

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

    const [highlightedValue, setHighlightedValue] = useState<ItemValue | null>(
      null,
    )

    // Ref for expandedValues (needed in callbacks that compute visible items)
    const expandedValuesRef = useRef(expandedValues)
    expandedValuesRef.current = expandedValues

    // Focus highlighted item when it changes
    useEffect(() => {
      if (highlightedValue) {
        const labelElement = registry.getElement(highlightedValue, 'label')
        labelElement?.focus()
      }
    }, [highlightedValue, registry])

    // Character search
    const typeahead = useCharacterSearch(
      () => {
        const visible = getVisibleItemValues(
          registry,
          expandedValuesRef.current,
        )
        return visible.map((v) => getItemTextValue(registry, v))
      },
      (index) => {
        const visible = getVisibleItemValues(
          registry,
          expandedValuesRef.current,
        )
        if (index >= 0 && index < visible.length) {
          setHighlightedValue(visible[index])
        }
      },
      (() => {
        if (!highlightedValue) return undefined
        const visible = getVisibleItemValues(
          registry,
          expandedValuesRef.current,
        )
        const idx = visible.indexOf(highlightedValue)
        return idx >= 0 ? idx : undefined
      })(),
    )

    // Actions
    const expand = useCallback(
      (value: ItemValue) => {
        if (!getHasChildren(registry, value)) return
        if (expandedValues.includes(value)) return
        setExpandedValues([...expandedValues, value])
      },
      [registry, expandedValues, setExpandedValues],
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
        if (!getHasChildren(registry, value)) return
        if (expandedValues.includes(value)) {
          setExpandedValues(expandedValues.filter((v) => v !== value))
        } else {
          setExpandedValues([...expandedValues, value])
        }
      },
      [registry, expandedValues, setExpandedValues],
    )

    const select = useCallback(
      (value: ItemValue) => {
        const entry = registry.getEntry(value, 'item')
        if (!entry || (entry.meta as TreeItemMeta).disabled) return

        if (selectionMode === 'single') {
          setSelectedValues([value])
        } else {
          if (!selectedValues.includes(value)) {
            setSelectedValues([...selectedValues, value])
          }
        }
      },
      [registry, selectionMode, selectedValues, setSelectedValues],
    )

    const toggleSelect = useCallback(
      (value: ItemValue) => {
        const entry = registry.getEntry(value, 'item')
        if (!entry || (entry.meta as TreeItemMeta).disabled) return

        if (selectedValues.includes(value)) {
          setSelectedValues(selectedValues.filter((v) => v !== value))
        } else {
          setSelectedValues([...selectedValues, value])
        }
      },
      [registry, selectedValues, setSelectedValues],
    )

    // Keyboard handler on tree root
    const handleKeyDown = (e: React.KeyboardEvent) => {
      const visible = getVisibleItemValues(registry, expandedValues)

      const currentIndex = highlightedValue
        ? visible.indexOf(highlightedValue)
        : -1

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          if (visible.length === 0) return
          const nextIndex =
            currentIndex === -1
              ? 0
              : Math.min(currentIndex + 1, visible.length - 1)
          setHighlightedValue(visible[nextIndex])
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          if (visible.length === 0) return
          const prevIndex =
            currentIndex === -1
              ? visible.length - 1
              : Math.max(currentIndex - 1, 0)
          setHighlightedValue(visible[prevIndex])
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (!highlightedValue) return
          const hasChildren = getHasChildren(registry, highlightedValue)
          if (!hasChildren) return

          const isExpanded = expandedValues.includes(highlightedValue)
          if (!isExpanded) {
            expand(highlightedValue)
          } else {
            const firstChild = getFirstChildValue(registry, highlightedValue)
            if (firstChild) {
              setHighlightedValue(firstChild)
            }
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (!highlightedValue) return
          const hasChildren = getHasChildren(registry, highlightedValue)
          const isExpanded =
            hasChildren && expandedValues.includes(highlightedValue)

          if (isExpanded) {
            collapse(highlightedValue)
          } else {
            const parentVal = getParentValue(registry, highlightedValue)
            if (parentVal) {
              setHighlightedValue(parentVal)
            }
          }
          break
        }
        case 'Home':
          e.preventDefault()
          if (visible.length > 0) {
            setHighlightedValue(visible[0])
          }
          break
        case 'End':
          e.preventDefault()
          if (visible.length > 0) {
            setHighlightedValue(visible[visible.length - 1])
          }
          break
        case 'Enter': {
          e.preventDefault()
          if (!highlightedValue) return
          const entry = registry.getEntry(highlightedValue, 'item')
          if (!entry || (entry.meta as TreeItemMeta).disabled) return

          const hasChildren = getHasChildren(registry, highlightedValue)
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
          const siblings = getSiblingValues(registry, highlightedValue)
          const toExpand = siblings.filter((v) => {
            return (
              getHasChildren(registry, v) && !expandedValues.includes(v)
            )
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
      idMap,
      registry,
      expandedValues,
      selectedValues,
      highlightedValue,
      selectionMode,
      setHighlightedValue,
      expand,
      collapse,
      toggleExpand,
      select,
      toggleSelect,
    }

    return (
      <RegistrationProvider idActions={idActions} registry={registry}>
        <TreeContext.Provider value={contextValue}>
          <div
            ref={composeRefs(forwardedRef, treeRef)}
            {...mergeProps(
              {
                role: 'tree',
                tabIndex: 0,
                'aria-multiselectable':
                  selectionMode === 'multiple' || undefined,
                'data-part': 'tree',
                onKeyDown: handleKeyDown,
              },
              rest,
            )}
          >
            <TreeParentProvider value={null}>{children}</TreeParentProvider>
          </div>
        </TreeContext.Provider>
      </RegistrationProvider>
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
    const { registry, expandedValues, selectedValues, highlightedValue } =
      useTreeContext()
    const { parentValue, depth } = useTreeParent()

    const hasChildren = getHasChildren(registry, value)

    const isExpanded = isItemExpanded(expandedValues, value)
    const isSelected = isItemSelected(selectedValues, value)
    const isHighlighted = highlightedValue === value
    const isDisabled = disabled

    const { ref } = useRegister<TreeItemMeta>({
      value,
      role: 'item',
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
          <TreeParentProvider value={value}>{children}</TreeParentProvider>
        </div>
      </ItemContext.Provider>
    )
  },
)

// ============================================
// ItemLabel
// ============================================

export type ItemLabelProps = {
  children: ReactNode
} & ComponentPropsWithoutRef<'div'>

export const ItemLabel = forwardRef<HTMLDivElement, ItemLabelProps>(
  ({ children, id: userDomId, ...rest }, forwardedRef) => {
    const { setHighlightedValue, toggleExpand, toggleSelect } = useTreeContext()
    const {
      value,
      hasChildren,
      isExpanded,
      isSelected,
      isDisabled,
      isHighlighted,
    } = useItemContext()

    const { ref, domId } = useRegister({
      value,
      role: 'label',
      id: userDomId,
    })

    return (
      <div
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            id: domId,
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
            onClick: () => {
              if (isDisabled) return
              setHighlightedValue(value)
              if (hasChildren) {
                toggleExpand(value)
              } else {
                toggleSelect(value)
              }
            },
            onFocus: () => {
              if (isDisabled) return
              setHighlightedValue(value)
            },
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
  ({ children, id: userDomId, ...rest }, forwardedRef) => {
    const { idMap } = useTreeContext()
    const { value, isExpanded } = useItemContext()
    const elementRef = useRef<HTMLDivElement>(null)

    const { ref, domId } = useRegister<TreeGroupMeta>({
      value,
      role: 'group',
      id: userDomId,
      meta: {
        parentValue: value,
      },
    })

    const labelDomId = idMap.get(createIdMapKey(value, 'label'))

    const { isPresent, transitionState } = usePresence({
      isVisible: isExpanded,
      resolveElement: () => elementRef.current,
    })

    if (!isPresent) return null

    return (
      <div
        ref={composeRefs(forwardedRef, ref, elementRef)}
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
