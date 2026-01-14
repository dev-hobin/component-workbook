import {
  createContext,
  forwardRef,
  useContext,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  useEffect,
  type ComponentPropsWithoutRef,
} from 'react'
import { useMachine, type Send } from 'controlled-machine/react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import { tabsMachine, type TabsEvents, type TabValue, type TabsComputed } from './machine'
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

type TabsRole = 'root' | 'list' | 'trigger' | 'content' | 'indicator'
type TabsMeta = {
  disabled?: boolean
}

type TabsSnapshot = TabsComputed & { focusedValue: TabValue | null }

type TabsContextValue = {
  value: TabValue
  send: Send<TabsEvents>
  snapshot: TabsSnapshot
  store: NodeStore<TabsRole, TabsMeta>
  disabled: boolean
  orientation: 'horizontal' | 'vertical'
  activationMode: 'automatic' | 'manual'
  getTriggerElement: (value: TabValue) => HTMLElement | null
  listRef: React.RefObject<HTMLDivElement | null>
}

// ============================================
// Contexts
// ============================================

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within Tabs.Root')
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  value?: TabValue
  defaultValue?: TabValue
  onValueChange?: (value: TabValue) => void
  orientation?: 'horizontal' | 'vertical'
  activationMode?: 'automatic' | 'manual'
  disabled?: boolean
  loop?: boolean
} & Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue'>

export function Root(props: RootProps) {
  return (
    <NodeStoreProvider<TabsRole, TabsMeta>>
      <RootInner {...props} />
    </NodeStoreProvider>
  )
}

const RootInner = forwardRef<HTMLDivElement, RootProps>(
  (
    {
      children,
      value: valueProp,
      defaultValue,
      onValueChange,
      orientation = 'horizontal',
      activationMode = 'automatic',
      disabled = false,
      loop = true,
      ...rest
    },
    forwardedRef,
  ) => {
    const store = useNodeStore<TabsRole, TabsMeta>()
    const listRef = useRef<HTMLDivElement>(null)

    const { ref } = useNode<TabsRole>({
      role: 'root',
    })

    // Controllable state
    const [valueState, setValueState] = useControllableState<string>({
      prop: valueProp,
      defaultProp: defaultValue ?? '',
      onChange: onValueChange,
    })
    const value = valueState ?? ''

    // Helper to get enabled trigger values (for machine)
    const getEnabledValues = useCallback(() => {
      const triggers = store.getNodesByRole('trigger')
      return triggers
        .filter((node) => !node.meta.disabled && !disabled)
        .map((node) => node.id)
    }, [store, disabled])

    // Helper to get trigger element
    const getTriggerElement = useCallback(
      (triggerValue: TabValue) => {
        return store.getElement(triggerValue, 'trigger')
      },
      [store],
    )

    // Machine
    const [snapshot, send] = useMachine(tabsMachine, {
      input: {
        value,
        onValueChange: setValueState,
        activationMode,
        loop,
        getEnabledValues,
      },
    })

    const contextValue: TabsContextValue = {
      value,
      send,
      snapshot,
      store,
      disabled,
      orientation,
      activationMode,
      getTriggerElement,
      listRef,
    }

    return (
      <TabsContext.Provider value={contextValue}>
        <div
          ref={composeRefs(forwardedRef, ref)}
          {...mergeProps(
            {
              'data-part': 'root',
              'data-orientation': orientation,
              'data-disabled': disabled || undefined,
            },
            rest,
          )}
        >
          {children}
        </div>
      </TabsContext.Provider>
    )
  },
)

// ============================================
// List
// ============================================

export type ListProps = ComponentPropsWithoutRef<'div'>

export const List = forwardRef<HTMLDivElement, ListProps>(
  ({ children, ...rest }, forwardedRef) => {
    const {
      send,
      snapshot,
      orientation,
      disabled,
      getTriggerElement,
      listRef,
    } = useTabsContext()

    const { ref } = useNode<TabsRole>({
      role: 'list',
    })

    // Focus DOM element when focusedValue changes
    useEffect(() => {
      if (snapshot.focusedValue) {
        const element = getTriggerElement(snapshot.focusedValue)
        element?.focus()
      }
    }, [snapshot.focusedValue, getTriggerElement])

    // Keyboard navigation - just send events, machine handles logic
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      const isHorizontal = orientation === 'horizontal'
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

      switch (e.key) {
        case nextKey:
          e.preventDefault()
          send('FOCUS_NEXT')
          break
        case prevKey:
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
        case 'Enter':
        case ' ':
          e.preventDefault()
          send('ACTIVATE_FOCUSED')
          break
      }
    }

    return (
      <div
        ref={composeRefs(forwardedRef, ref, listRef)}
        {...mergeProps(
          {
            role: 'tablist',
            'aria-orientation': orientation,
            'data-part': 'list',
            'data-orientation': orientation,
            onKeyDown: handleKeyDown,
            style: { position: 'relative' } as React.CSSProperties,
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
// Trigger
// ============================================

export type TriggerProps = {
  value: TabValue
  disabled?: boolean
} & Omit<ComponentPropsWithoutRef<'button'>, 'value'>

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ children, value: triggerValue, disabled = false, ...rest }, forwardedRef) => {
    const {
      value,
      send,
      store,
      disabled: rootDisabled,
    } = useTabsContext()

    const isDisabled = rootDisabled || disabled
    const isActive = value === triggerValue

    const { ref, domId } = useNode<TabsRole, TabsMeta>({
      role: 'trigger',
      id: triggerValue,
      meta: { disabled: isDisabled },
    })

    // Subscribe to content element id
    const contentId = useStoreSubscribe(
      store,
      (s) => s.getElement(triggerValue, 'content')?.id ?? null,
    )

    const handleClick = () => {
      if (!isDisabled && triggerValue !== value) {
        send('SELECT', { value: triggerValue })
      }
    }

    const handleFocus = () => {
      // Sync focusedValue when trigger receives focus
      send('FOCUS', { value: triggerValue })
    }

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            type: 'button',
            role: 'tab',
            id: domId,
            disabled: isDisabled,
            tabIndex: isActive ? 0 : -1,
            'aria-selected': isActive,
            'aria-controls': contentId ?? undefined,
            'aria-disabled': isDisabled || undefined,
            'data-part': 'trigger',
            'data-state': isActive ? 'active' : 'inactive',
            'data-disabled': isDisabled || undefined,
            onClick: handleClick,
            onFocus: handleFocus,
          },
          rest,
        )}
      >
        {children}
      </button>
    )
  },
)

// ============================================
// Content
// ============================================

export type ContentProps = {
  value: TabValue
  lazyMount?: boolean
  unmountOnExit?: boolean
} & ComponentPropsWithoutRef<'div'>

export const Content = forwardRef<HTMLDivElement, ContentProps>(
  (
    { children, value: contentValue, lazyMount = false, unmountOnExit = false, ...rest },
    forwardedRef,
  ) => {
    const { value, store } = useTabsContext()

    const isActive = value === contentValue

    const { ref, domId, elementRef } = useNode<TabsRole>({
      role: 'content',
      id: contentValue,
    })

    // Track if content was ever active (for lazyMount)
    const [wasEverActive, setWasEverActive] = useState(isActive)
    if (isActive && !wasEverActive) {
      setWasEverActive(true)
    }

    // Animation state
    const { isPresent, transitionState } = usePresence({
      isVisible: isActive,
      resolveElement: () => elementRef.current,
    })

    // Subscribe to trigger element id
    const triggerId = useStoreSubscribe(
      store,
      (s) => s.getElement(contentValue, 'trigger')?.id ?? null,
    )

    // Determine if we should render
    const shouldRender = (() => {
      if (lazyMount && !wasEverActive) {
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
            role: 'tabpanel',
            id: domId,
            tabIndex: 0,
            'aria-labelledby': triggerId ?? undefined,
            'data-part': 'content',
            'data-state': isActive ? 'active' : 'inactive',
            'data-transition': transitionState,
            hidden: !isActive && !isPresent,
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
// Indicator
// ============================================

export type IndicatorProps = ComponentPropsWithoutRef<'div'>

export const Indicator = forwardRef<HTMLDivElement, IndicatorProps>(
  ({ style, ...rest }, forwardedRef) => {
    const { value, orientation, getTriggerElement, listRef } = useTabsContext()

    const { ref } = useNode<TabsRole>({
      role: 'indicator',
    })

    const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({})

    // Update indicator position when value changes
    useLayoutEffect(() => {
      const triggerElement = getTriggerElement(value)
      const listElement = listRef.current

      if (!triggerElement || !listElement) {
        return
      }

      const triggerRect = triggerElement.getBoundingClientRect()
      const listRect = listElement.getBoundingClientRect()

      if (orientation === 'horizontal') {
        setIndicatorStyle({
          left: triggerRect.left - listRect.left,
          width: triggerRect.width,
        })
      } else {
        setIndicatorStyle({
          top: triggerRect.top - listRect.top,
          height: triggerRect.height,
        })
      }
    }, [value, orientation, getTriggerElement, listRef])

    return (
      <div
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            'aria-hidden': true,
            'data-part': 'indicator',
            'data-orientation': orientation,
            style: {
              position: 'absolute' as const,
              ...indicatorStyle,
              ...style,
            },
          },
          rest,
        )}
      />
    )
  },
)

// ============================================
// Export
// ============================================

const Tabs = {
  Root,
  List,
  Trigger,
  Content,
  Indicator,
}

export default Tabs
