import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

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

export type ItemId = string

type AccordionMeta = {
  disabled?: boolean
}

type AccordionContextValue = {
  idMap: IdMap
  registry: ElementRegistry<AccordionMeta>
  value: ItemId[]
  expandedSet: Set<ItemId>
  toggle: (itemId: ItemId) => void
  disabled: boolean
  orientation: 'vertical' | 'horizontal'
}

type ItemContextValue = {
  itemId: ItemId
  isDisabled: boolean
  isExpanded: boolean
}

// ============================================
// Contexts
// ============================================

const AccordionContext = createContext<AccordionContextValue | null>(null)
const ItemContext = createContext<ItemContextValue | null>(null)

function useAccordionContext() {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error('Accordion components must be used within Accordion.Root')
  }
  return context
}

function useItemContext() {
  const context = useContext(ItemContext)
  if (!context) {
    throw new Error(
      'Accordion.ItemTrigger/ItemContent/ItemIndicator must be used within Accordion.Item',
    )
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  value?: ItemId[]
  defaultValue?: ItemId[]
  onValueChange?: (value: ItemId[]) => void
  multiple?: boolean
  collapsible?: boolean
  disabled?: boolean
  orientation?: 'vertical' | 'horizontal'
} & ComponentPropsWithoutRef<'div'>

export const Root = forwardRef<HTMLDivElement, RootProps>(
  (
    {
      children,
      value: valueProp,
      defaultValue = [],
      onValueChange,
      multiple = false,
      collapsible = true,
      disabled = false,
      orientation = 'vertical',
      ...rest
    },
    forwardedRef,
  ) => {
    const [idMap, idActions] = useIdMap()

    const registryRef = useRef<ElementRegistry<AccordionMeta>>(null!)
    if (!registryRef.current) {
      registryRef.current = createElementRegistry<AccordionMeta>()
    }
    const registry = registryRef.current

    const [value = [], setValue] = useControllableState({
      prop: valueProp,
      defaultProp: defaultValue,
      onChange: onValueChange,
    })

    const expandedSet = useMemo(() => new Set(value), [value])

    const toggle = (itemId: ItemId) => {
      const isExpanded = value.includes(itemId)
      if (isExpanded) {
        if (!collapsible && value.length === 1) return
        setValue(value.filter((id) => id !== itemId))
      } else {
        setValue(multiple ? [...value, itemId] : [itemId])
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      const items = registry.getEntriesByRoleInDomOrder('item')
      const enabledItems = items.filter(
        (entry) => !entry.meta.disabled && !disabled,
      )
      if (enabledItems.length === 0) return

      const isVertical = orientation === 'vertical'
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight'
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft'

      const currentElement = document.activeElement
      const currentIndex = enabledItems.findIndex(
        (entry) =>
          registry.getElement(entry.value, 'trigger') === currentElement,
      )

      let targetIndex: number | null = null

      switch (e.key) {
        case nextKey:
          e.preventDefault()
          targetIndex =
            currentIndex === -1
              ? 0
              : (currentIndex + 1) % enabledItems.length
          break
        case prevKey:
          e.preventDefault()
          targetIndex =
            currentIndex === -1
              ? enabledItems.length - 1
              : (currentIndex - 1 + enabledItems.length) % enabledItems.length
          break
        case 'Home':
          e.preventDefault()
          targetIndex = 0
          break
        case 'End':
          e.preventDefault()
          targetIndex = enabledItems.length - 1
          break
      }

      if (targetIndex !== null) {
        const targetValue = enabledItems[targetIndex].value
        registry.getElement(targetValue, 'trigger')?.focus()
      }
    }

    const contextValue: AccordionContextValue = {
      idMap,
      registry,
      value,
      expandedSet,
      toggle,
      disabled,
      orientation,
    }

    return (
      <RegistrationProvider idActions={idActions} registry={registry}>
        <AccordionContext.Provider value={contextValue}>
          <div
            ref={forwardedRef}
            {...mergeProps(
              {
                'data-part': 'root',
                'data-orientation': orientation,
                'data-disabled': disabled || undefined,
                onKeyDown: handleKeyDown,
              },
              rest,
            )}
          >
            {children}
          </div>
        </AccordionContext.Provider>
      </RegistrationProvider>
    )
  },
)

// ============================================
// Item
// ============================================

export type ItemProps = {
  value: ItemId
  disabled?: boolean
} & ComponentPropsWithoutRef<'div'>

export const Item = forwardRef<HTMLDivElement, ItemProps>(
  ({ children, value: itemId, disabled = false, ...rest }, forwardedRef) => {
    const { expandedSet, disabled: rootDisabled } = useAccordionContext()

    const isDisabled = rootDisabled || disabled

    const { ref } = useRegister<AccordionMeta>({
      value: itemId,
      role: 'item',
      meta: { disabled: isDisabled },
    })

    const isExpanded = expandedSet.has(itemId)

    const itemContextValue: ItemContextValue = {
      itemId,
      isDisabled,
      isExpanded,
    }

    return (
      <ItemContext.Provider value={itemContextValue}>
        <div
          ref={composeRefs(forwardedRef, ref)}
          {...mergeProps(
            {
              'data-part': 'item',
              'data-state': isExpanded ? 'open' : 'closed',
              'data-disabled': isDisabled || undefined,
            },
            rest,
          )}
        >
          {children}
        </div>
      </ItemContext.Provider>
    )
  },
)

// ============================================
// ItemTrigger
// ============================================

export type ItemTriggerProps = ComponentPropsWithoutRef<'button'>

export const ItemTrigger = forwardRef<HTMLButtonElement, ItemTriggerProps>(
  ({ children, id: userDomId, ...rest }, forwardedRef) => {
    const { idMap, toggle } = useAccordionContext()
    const { itemId, isDisabled, isExpanded } = useItemContext()

    const { ref, domId } = useRegister({
      value: itemId,
      role: 'trigger',
      id: userDomId,
    })

    const contentDomId = idMap.get(createIdMapKey(itemId, 'content'))

    return (
      <h3>
        <button
          ref={composeRefs(forwardedRef, ref)}
          {...mergeProps(
            {
              type: 'button',
              id: domId,
              disabled: isDisabled,
              'aria-expanded': isExpanded,
              'aria-controls': contentDomId ?? undefined,
              'aria-disabled': isDisabled || undefined,
              'data-part': 'trigger',
              'data-state': isExpanded ? 'open' : 'closed',
              'data-disabled': isDisabled || undefined,
              onClick: () => {
                if (!isDisabled) toggle(itemId)
              },
            },
            rest,
          )}
        >
          {children}
        </button>
      </h3>
    )
  },
)

// ============================================
// ItemContent
// ============================================

export type ItemContentProps = {
  lazyMount?: boolean
  unmountOnExit?: boolean
} & ComponentPropsWithoutRef<'div'>

export const ItemContent = forwardRef<HTMLDivElement, ItemContentProps>(
  (
    { children, id: userDomId, lazyMount = false, unmountOnExit = false, ...rest },
    forwardedRef,
  ) => {
    const { idMap } = useAccordionContext()
    const { itemId, isDisabled, isExpanded } = useItemContext()

    const { ref, domId } = useRegister({
      value: itemId,
      role: 'content',
      id: userDomId,
    })

    const elementRef = useRef<HTMLDivElement>(null)

    const wasEverExpandedRef = useRef(isExpanded)
    if (isExpanded) wasEverExpandedRef.current = true

    const { isPresent, transitionState } = usePresence({
      isVisible: isExpanded,
      resolveElement: () => elementRef.current,
    })

    const triggerDomId = idMap.get(createIdMapKey(itemId, 'trigger'))

    const shouldRender = (() => {
      if (lazyMount && !wasEverExpandedRef.current) {
        return false
      }
      if (unmountOnExit && !isPresent) {
        return false
      }
      return true
    })()

    if (!shouldRender) {
      return null
    }

    return (
      <div
        ref={composeRefs(forwardedRef, ref, elementRef)}
        {...mergeProps(
          {
            id: domId,
            role: 'region',
            'aria-labelledby': triggerDomId ?? undefined,
            'data-part': 'content',
            'data-state': isExpanded ? 'open' : 'closed',
            'data-disabled': isDisabled || undefined,
            'data-transition': transitionState,
            hidden: !isExpanded && !isPresent,
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
// ItemIndicator
// ============================================

export type ItemIndicatorProps = ComponentPropsWithoutRef<'span'>

export const ItemIndicator = forwardRef<HTMLSpanElement, ItemIndicatorProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { isExpanded, isDisabled } = useItemContext()

    return (
      <span
        ref={forwardedRef}
        {...mergeProps(
          {
            'aria-hidden': true,
            'data-part': 'indicator',
            'data-state': isExpanded ? 'open' : 'closed',
            'data-disabled': isDisabled || undefined,
          },
          rest,
        )}
      >
        {children}
      </span>
    )
  },
)

// ============================================
// Export
// ============================================

const Accordion = {
  Root,
  Item,
  ItemTrigger,
  ItemContent,
  ItemIndicator,
}

export default Accordion
