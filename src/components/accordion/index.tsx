import React, {
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
  isExpanded,
  type AccordionEvents,
} from './machine'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'

import {
  NodeStoreProvider,
  useNodeStore,
} from '../../primitives/use-node-store'
import { ParentProvider } from '../../primitives/use-parent-context'
import { useNode } from '../../primitives/use-node'
import { useStoreSubscribe } from '../../primitives/use-store-subscribe'
import type { NodeStore } from '../../primitives/node-store'

// ============================================
// Types
// ============================================

type AccordionRole = 'item' | 'trigger' | 'panel'

type AccordionMeta = {
  disabled?: boolean
}

type AccordionContextValue = {
  expandedIds: Set<string>
  focusedId: string | null
  store: NodeStore<AccordionRole, AccordionMeta>
  send: Send<AccordionEvents>
  disabled: boolean
  animationDuration: string
}

type ItemContextValue = {
  itemId: string
  isDisabled: boolean
}

// ============================================
// Contexts
// ============================================

const AccordionContext = createContext<AccordionContextValue | null>(null)
const ItemContext = createContext<ItemContextValue | null>(null)

function useAccordionContext() {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error('Accordion 컴포넌트는 Accordion.Root 안에서 사용해야 합니다.')
  }
  return context
}

function useItemContext() {
  const context = useContext(ItemContext)
  if (!context) {
    throw new Error(
      'Accordion.Trigger/Panel은 Accordion.Item 안에서 사용해야 합니다.',
    )
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  value?: string[]
  onValueChange?: (value: string[]) => void
  defaultValue?: string[]
  multiple?: boolean
  collapsible?: boolean
  disabled?: boolean
  animationDuration?: `${number}ms`
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
      onValueChange,
      defaultValue,
      multiple = false,
      collapsible = true,
      disabled = false,
      animationDuration = '300ms',
      ...rest
    },
    forwardedRef,
  ) => {
    const store = useNodeStore<AccordionRole, AccordionMeta>()

    // Controllable expanded state
    const [expandedArray, setExpandedArray] = useControllableState({
      prop: valueProp,
      onChange: onValueChange,
      defaultProp: defaultValue ?? [],
    })

    const expandedIds = new Set(expandedArray)
    const setExpandedIds = (ids: Set<string>) => {
      setExpandedArray(Array.from(ids))
    }

    // Internal focused state
    const [focusedId, setFocusedId] = useState<string | null>(null)

    // Event machine
    const { send } = useMachine(accordionMachine, {
      expandedIds,
      focusedId,
      onExpandedIdsChange: setExpandedIds,
      onFocusedIdChange: setFocusedId,
      multiple,
      collapsible,
      disabled,
      getEnabledItemIds: () => {
        const items = store.getNodesByRole('item')
        return items
          .filter((item) => !item.meta.disabled)
          .map((item) => item.id)
      },
      getTriggerElement: (itemId: string) => store.getElement(itemId, 'trigger'),
    })

    // Keyboard handler
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
        case 'Home':
          e.preventDefault()
          send('FOCUS_FIRST')
          break
        case 'End':
          e.preventDefault()
          send('FOCUS_LAST')
          break
      }
    }

    const contextValue: AccordionContextValue = {
      expandedIds,
      focusedId,
      store,
      send,
      disabled,
      animationDuration,
    }

    return (
      <AccordionContext.Provider value={contextValue}>
        <div
          ref={forwardedRef}
          {...mergeProps(
            {
              onKeyDown: handleKeyDown,
              'data-disabled': disabled || undefined,
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
  value: string
  disabled?: boolean
} & ComponentPropsWithoutRef<'section'>

export const Item = forwardRef<HTMLElement, ItemProps>(
  ({ children, value: itemId, disabled = false, ...rest }, forwardedRef) => {
    const { expandedIds, disabled: rootDisabled } = useAccordionContext()

    const { ref } = useNode<AccordionRole, AccordionMeta>({
      role: 'item',
      id: itemId,
      meta: { disabled: rootDisabled || disabled },
    })

    const isItemDisabled = rootDisabled || disabled
    const isItemExpanded = isExpanded(expandedIds, itemId)

    const itemContextValue: ItemContextValue = {
      itemId,
      isDisabled: isItemDisabled,
    }

    return (
      <ItemContext.Provider value={itemContextValue}>
        <ParentProvider id={itemId}>
          <section
            ref={composeRefs(forwardedRef, ref)}
            {...mergeProps(
              {
                'data-disabled': isItemDisabled || undefined,
                'data-expanded': isItemExpanded || undefined,
              },
              rest,
            )}
          >
            {children}
          </section>
        </ParentProvider>
      </ItemContext.Provider>
    )
  },
)

// ============================================
// Trigger
// ============================================

export type TriggerProps = ComponentPropsWithoutRef<'button'>

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { expandedIds, focusedId, store, send, animationDuration } =
      useAccordionContext()
    const { itemId, isDisabled } = useItemContext()

    const { ref, domId } = useNode<AccordionRole, AccordionMeta>({
      role: 'trigger',
      id: itemId,
    })

    // store에서 panel element의 id 구독
    const panelId = useStoreSubscribe(
      store,
      (s) => s.getElement(itemId, 'panel')?.id || null,
    )

    const isItemExpanded = isExpanded(expandedIds, itemId)
    const isFocused = focusedId === itemId

    const handleClick = () => {
      send('TOGGLE', { itemId })
    }

    return (
      <h3
        data-expanded={isItemExpanded || undefined}
        data-disabled={isDisabled || undefined}
      >
        <button
          ref={composeRefs(forwardedRef, ref)}
          {...mergeProps(
            {
              type: 'button',
              id: domId,
              disabled: isDisabled,
              onClick: handleClick,
              tabIndex: isFocused ? 0 : -1,
              'aria-expanded': isItemExpanded,
              'aria-controls': panelId ?? undefined,
              'data-expanded': isItemExpanded || undefined,
              'data-disabled': isDisabled || undefined,
              style: {
                '--tw-duration': animationDuration,
              } as React.CSSProperties,
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
// Panel
// ============================================

export type PanelProps = ComponentPropsWithoutRef<'div'>

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { expandedIds, store, animationDuration } = useAccordionContext()
    const { itemId, isDisabled } = useItemContext()

    const { ref, domId } = useNode<AccordionRole, AccordionMeta>({
      role: 'panel',
      id: itemId,
    })

    // store에서 trigger element의 id 구독
    const triggerId = useStoreSubscribe(
      store,
      (s) => s.getElement(itemId, 'trigger')?.id || null,
    )

    const isItemExpanded = isExpanded(expandedIds, itemId)

    return (
      <div
        className="grid overflow-hidden transition-[grid-template-rows] ease-in-out"
        style={{
          gridTemplateRows: isItemExpanded ? '1fr' : '0fr',
          '--tw-duration': animationDuration,
        } as React.CSSProperties}
      >
        <div className="overflow-hidden">
          <div
            ref={composeRefs(forwardedRef, ref)}
            {...mergeProps(
              {
                id: domId,
                role: 'region',
                'aria-labelledby': triggerId ?? undefined,
                'data-expanded': isItemExpanded || undefined,
                'data-disabled': isDisabled || undefined,
              },
              rest,
            )}
          >
            {children}
          </div>
        </div>
      </div>
    )
  },
)

// ============================================
// Export
// ============================================

const Accordion = {
  Root,
  Item,
  Trigger,
  Panel,
}

export default Accordion
