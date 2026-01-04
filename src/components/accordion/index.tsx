import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import {
  expand,
  collapse,
  expandOnly,
  setFocus,
  isExpanded,
  type AccordionState,
  type ItemId,
} from './core'
import { composeRefs } from '../../utils/composeRefs'
import { mergeProps } from '../../utils/mergeProps'

import {
  ComponentStoreProvider,
  useComponentStore,
} from '../../shell/use-component-store'
import { ParentProvider, useParentId } from '../../shell/use-parent-context'
import { useNode } from '../../shell/use-node'
import { useComponentSubscribe } from '../../shell/use-component-subscribe'
import type { ComponentStore } from '../../core/component-store'

// ============================================
// Types
// ============================================

type AccordionRole = 'item' | 'trigger' | 'panel'

type AccordionMeta = {
  disabled?: boolean
}

type AccordionContextValue = {
  state: AccordionState
  setState: React.Dispatch<React.SetStateAction<AccordionState>>
  store: ComponentStore<AccordionRole, AccordionMeta>
  multiple: boolean
  collapsible: boolean
  disabled: boolean
  animationDuration: string
}

type ItemContextValue = {
  itemId: ItemId
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
    throw new Error('Accordion.Trigger/Panel은 Accordion.Item 안에서 사용해야 합니다.')
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
    <ComponentStoreProvider<AccordionRole, AccordionMeta>>
      <RootInner {...props} />
    </ComponentStoreProvider>
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
    const { store } = useComponentStore<AccordionRole, AccordionMeta>()

    const [expandedArray, setExpandedArray] = useControllableState({
      prop: valueProp,
      onChange: onValueChange,
      defaultProp: defaultValue ?? [],
    })

    const [focusedId, setFocusedId] = React.useState<ItemId | null>(null)

    const state: AccordionState = useMemo(
      () => ({
        expandedIds: new Set(expandedArray),
        focusedId,
      }),
      [expandedArray, focusedId],
    )

    const setState: React.Dispatch<React.SetStateAction<AccordionState>> =
      useCallback(
        (action) => {
          const nextState = typeof action === 'function' ? action(state) : action
          if (nextState.expandedIds !== state.expandedIds) {
            setExpandedArray(Array.from(nextState.expandedIds))
          }
          if (nextState.focusedId !== state.focusedId) {
            setFocusedId(nextState.focusedId)
          }
        },
        [state, setExpandedArray],
      )

    // 키보드 네비게이션
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const items = store.getNodesByRole('item')
        const enabledItems = items.filter((item) => !item.meta.disabled)
        if (enabledItems.length === 0) return

        const currentIndex = enabledItems.findIndex(
          (item) => item.id === state.focusedId,
        )

        switch (e.key) {
          case 'ArrowDown': {
            e.preventDefault()
            const nextIndex =
              currentIndex === -1 ? 0 : (currentIndex + 1) % enabledItems.length
            const nextItem = enabledItems[nextIndex]
            setState(setFocus(state, nextItem.id))
            break
          }
          case 'ArrowUp': {
            e.preventDefault()
            const prevIndex =
              currentIndex === -1
                ? enabledItems.length - 1
                : (currentIndex - 1 + enabledItems.length) % enabledItems.length
            const prevItem = enabledItems[prevIndex]
            setState(setFocus(state, prevItem.id))
            break
          }
          case 'Home': {
            e.preventDefault()
            setState(setFocus(state, enabledItems[0].id))
            break
          }
          case 'End': {
            e.preventDefault()
            setState(setFocus(state, enabledItems[enabledItems.length - 1].id))
            break
          }
        }
      },
      [store, state, setState],
    )

    // 포커스 동기화
    useEffect(() => {
      if (state.focusedId) {
        const triggerEl = store.getElement(state.focusedId, 'trigger')
        triggerEl?.focus()
      }
    }, [state.focusedId, store])

    const contextValue = useMemo<AccordionContextValue>(
      () => ({
        state,
        setState,
        store,
        multiple,
        collapsible,
        disabled,
        animationDuration,
      }),
      [state, setState, store, multiple, collapsible, disabled, animationDuration],
    )

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
    const { state, disabled: rootDisabled } = useAccordionContext()

    const { ref } = useNode<AccordionRole, AccordionMeta>({
      role: 'item',
      id: itemId,
      meta: { disabled: rootDisabled || disabled },
    })

    const isItemDisabled = rootDisabled || disabled
    const isItemExpanded = isExpanded(state, itemId)

    const itemContextValue = useMemo<ItemContextValue>(
      () => ({
        itemId,
        isDisabled: isItemDisabled,
      }),
      [itemId, isItemDisabled],
    )

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
    const { state, setState, store, multiple, collapsible, animationDuration } =
      useAccordionContext()
    const { itemId, isDisabled } = useItemContext()

    const { ref, domId } = useNode<AccordionRole, AccordionMeta>({
      role: 'trigger',
      id: itemId,
    })

    // store에서 panel element의 id 구독
    const panelId = useComponentSubscribe(
      store,
      (s) => s.getElement(itemId, 'panel')?.id || null,
    )

    const isItemExpanded = isExpanded(state, itemId)
    const isFocused = state.focusedId === itemId

    const handleClick = useCallback(() => {
      if (isDisabled) return

      if (isItemExpanded) {
        if (!collapsible && !multiple) {
          return
        }
        setState(collapse(state, itemId))
      } else {
        if (multiple) {
          setState(expand(state, itemId))
        } else {
          setState(expandOnly(state, itemId))
        }
      }
    }, [
      isDisabled,
      isItemExpanded,
      collapsible,
      multiple,
      state,
      setState,
      itemId,
    ])

    const handleFocus = useCallback(() => {
      if (state.focusedId !== itemId) {
        setState(setFocus(state, itemId))
      }
    }, [state, setState, itemId])

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
              onFocus: handleFocus,
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
    const { state, store, animationDuration } = useAccordionContext()
    const { itemId, isDisabled } = useItemContext()

    const { ref, domId } = useNode<AccordionRole, AccordionMeta>({
      role: 'panel',
      id: itemId,
    })

    // store에서 trigger element의 id 구독
    const triggerId = useComponentSubscribe(
      store,
      (s) => s.getElement(itemId, 'trigger')?.id || null,
    )

    const isItemExpanded = isExpanded(state, itemId)

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
