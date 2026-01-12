import {
  createContext,
  forwardRef,
  useContext,
  useState,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useMachine, type Send } from 'controlled-machine/react'

import {
  accordionMachine,
  type AccordionEvents,
  type AccordionComputed,
  type ItemId,
} from './machine'
import { usePresence } from '../../hooks/use-presence'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'

import {
  NodeStoreProvider,
  useNodeStore,
} from '../../primitives/use-node-store'
import { useNode } from '../../primitives/use-node'
import { useStoreSubscribe } from '../../primitives/use-store-subscribe'
import type { NodeStore } from '../../primitives/node-store'

// ============================================
// Types
// ============================================

type AccordionRole = 'root' | 'item' | 'trigger' | 'content' | 'indicator'
type AccordionMeta = {
  disabled?: boolean
}

type AccordionContextValue = {
  value: ItemId[]
  computed: AccordionComputed
  store: NodeStore<AccordionRole, AccordionMeta>
  send: Send<AccordionEvents>
  disabled: boolean
  orientation: 'vertical' | 'horizontal'
  getEnabledTriggerIds: () => ItemId[]
  getTriggerElement: (itemId: ItemId) => HTMLElement | null
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

export function Root(props: RootProps) {
  return (
    <NodeStoreProvider<AccordionRole, AccordionMeta>>
      <RootInner {...props} />
    </NodeStoreProvider>
  )
}

const RootInner = forwardRef<HTMLDivElement, RootProps>(
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
    const store = useNodeStore<AccordionRole, AccordionMeta>()

    const { ref } = useNode<AccordionRole>({
      role: 'root',
    })

    // Controllable value state
    const [value = [], setValue] = useControllableState({
      prop: valueProp,
      defaultProp: defaultValue,
      onChange: onValueChange,
    })

    // Machine
    const { send, computed } = useMachine(accordionMachine, {
      input: {
        value,
        multiple,
        collapsible,
        onValueChange: setValue,
      },
    })

    // Helpers
    const getEnabledTriggerIds = () => {
      const items = store.getNodesByRole('item')
      return items
        .filter((node) => !node.meta.disabled && !disabled)
        .map((node) => node.id)
    }

    const getTriggerElement = (itemId: ItemId) => {
      return store.getElement(itemId, 'trigger')
    }

    // Keyboard handler
    const handleKeyDown = (e: React.KeyboardEvent) => {
      const enabledIds = getEnabledTriggerIds()
      if (enabledIds.length === 0) return

      const isVertical = orientation === 'vertical'
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight'
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft'

      const currentElement = document.activeElement
      const currentIndex = enabledIds.findIndex(
        (id) => getTriggerElement(id) === currentElement,
      )

      let targetIndex: number | null = null

      switch (e.key) {
        case nextKey:
          e.preventDefault()
          targetIndex =
            currentIndex === -1 ? 0 : (currentIndex + 1) % enabledIds.length
          break
        case prevKey:
          e.preventDefault()
          targetIndex =
            currentIndex === -1
              ? enabledIds.length - 1
              : (currentIndex - 1 + enabledIds.length) % enabledIds.length
          break
        case 'Home':
          e.preventDefault()
          targetIndex = 0
          break
        case 'End':
          e.preventDefault()
          targetIndex = enabledIds.length - 1
          break
      }

      if (targetIndex !== null) {
        getTriggerElement(enabledIds[targetIndex])?.focus()
      }
    }

    const contextValue: AccordionContextValue = {
      value,
      computed,
      store,
      send,
      disabled,
      orientation,
      getEnabledTriggerIds,
      getTriggerElement,
    }

    return (
      <AccordionContext.Provider value={contextValue}>
        <div
          ref={composeRefs(forwardedRef, ref)}
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
    const { computed, disabled: rootDisabled } = useAccordionContext()

    const isDisabled = rootDisabled || disabled

    const { ref } = useNode<AccordionRole, AccordionMeta>({
      role: 'item',
      id: itemId,
      meta: { disabled: isDisabled },
    })
    const isExpanded = computed.expandedSet.has(itemId)

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
  ({ children, ...rest }, forwardedRef) => {
    const { store, send } = useAccordionContext()
    const { itemId, isDisabled, isExpanded } = useItemContext()

    const { ref, domId } = useNode<AccordionRole>({
      role: 'trigger',
      id: itemId,
    })

    // Subscribe to content element id
    const contentId = useStoreSubscribe(
      store,
      (s) => s.getElement(itemId, 'content')?.id ?? null,
    )

    const handleClick = () => {
      if (!isDisabled) {
        send('TOGGLE', { itemId })
      }
    }

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
              'aria-controls': contentId ?? undefined,
              'aria-disabled': isDisabled || undefined,
              'data-part': 'trigger',
              'data-state': isExpanded ? 'open' : 'closed',
              'data-disabled': isDisabled || undefined,
              onClick: handleClick,
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
    { children, lazyMount = false, unmountOnExit = false, ...rest },
    forwardedRef,
  ) => {
    const { store } = useAccordionContext()
    const { itemId, isDisabled, isExpanded } = useItemContext()

    const { ref, domId, elementRef } = useNode<AccordionRole>({
      role: 'content',
      id: itemId,
    })

    // Track if content was ever expanded (for lazyMount)
    const [wasEverExpanded, setWasEverExpanded] = useState(isExpanded)
    if (isExpanded && !wasEverExpanded) {
      setWasEverExpanded(true)
    }

    // Animation state
    const { isPresent, transitionState } = usePresence({
      isVisible: isExpanded,
      resolveElement: () => elementRef.current,
    })

    // Subscribe to trigger element id
    const triggerId = useStoreSubscribe(
      store,
      (s) => s.getElement(itemId, 'trigger')?.id ?? null,
    )

    // Determine if we should render
    const shouldRender = (() => {
      if (lazyMount && !wasEverExpanded) {
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
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            id: domId,
            role: 'region',
            'aria-labelledby': triggerId ?? undefined,
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
    const { itemId, isExpanded, isDisabled } = useItemContext()

    const { ref } = useNode<AccordionRole>({
      role: 'indicator',
      id: itemId,
    })

    return (
      <span
        ref={composeRefs(forwardedRef, ref)}
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
