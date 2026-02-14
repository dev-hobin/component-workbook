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
import { useControllableState } from '@radix-ui/react-use-controllable-state'

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

export type TabValue = string

type TabsRole = 'root' | 'list' | 'trigger' | 'content' | 'indicator'
type TabsMeta = {
  disabled?: boolean
}

type TabsContextValue = {
  value: TabValue
  setValue: (value: TabValue) => void
  focusedValue: TabValue | null
  setFocusedValue: (value: TabValue | null) => void
  store: NodeStore<TabsRole, TabsMeta>
  disabled: boolean
  orientation: 'horizontal' | 'vertical'
  activationMode: 'automatic' | 'manual'
  loop: boolean
  getEnabledValues: () => TabValue[]
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

    // Internal state: focus tracking for keyboard navigation
    const [focusedValue, setFocusedValue] = useState<TabValue | null>(null)

    // Helper to get enabled trigger values
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

    const contextValue: TabsContextValue = {
      value,
      setValue: setValueState,
      focusedValue,
      setFocusedValue,
      store,
      disabled,
      orientation,
      activationMode,
      loop,
      getEnabledValues,
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
      value,
      setValue,
      focusedValue,
      setFocusedValue,
      orientation,
      disabled,
      activationMode,
      loop,
      getEnabledValues,
      getTriggerElement,
      listRef,
    } = useTabsContext()

    const { ref } = useNode<TabsRole>({
      role: 'list',
    })

    // Focus DOM element when focusedValue changes
    useEffect(() => {
      if (focusedValue) {
        const element = getTriggerElement(focusedValue)
        element?.focus()
      }
    }, [focusedValue, getTriggerElement])

    // Navigate and optionally activate (automatic mode)
    const navigateTo = (targetValue: TabValue) => {
      setFocusedValue(targetValue)
      if (activationMode === 'automatic' && targetValue !== value) {
        setValue(targetValue)
      }
    }

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      const isHorizontal = orientation === 'horizontal'
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

      switch (e.key) {
        case nextKey: {
          e.preventDefault()
          const enabledValues = getEnabledValues()
          if (enabledValues.length === 0) return

          const currentIndex = enabledValues.indexOf(focusedValue ?? value)
          let nextIndex: number

          if (currentIndex === -1) {
            nextIndex = 0
          } else if (loop) {
            nextIndex = (currentIndex + 1) % enabledValues.length
          } else {
            nextIndex = Math.min(currentIndex + 1, enabledValues.length - 1)
          }

          navigateTo(enabledValues[nextIndex])
          break
        }
        case prevKey: {
          e.preventDefault()
          const enabledValues = getEnabledValues()
          if (enabledValues.length === 0) return

          const currentIndex = enabledValues.indexOf(focusedValue ?? value)
          let prevIndex: number

          if (currentIndex === -1) {
            prevIndex = enabledValues.length - 1
          } else if (loop) {
            prevIndex = (currentIndex - 1 + enabledValues.length) % enabledValues.length
          } else {
            prevIndex = Math.max(currentIndex - 1, 0)
          }

          navigateTo(enabledValues[prevIndex])
          break
        }
        case 'Home': {
          e.preventDefault()
          const enabledValues = getEnabledValues()
          if (enabledValues.length === 0) return
          navigateTo(enabledValues[0])
          break
        }
        case 'End': {
          e.preventDefault()
          const enabledValues = getEnabledValues()
          if (enabledValues.length === 0) return
          navigateTo(enabledValues[enabledValues.length - 1])
          break
        }
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedValue && focusedValue !== value) {
            setValue(focusedValue)
          }
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
      setValue,
      setFocusedValue,
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
            onClick: () => {
              if (!isDisabled && triggerValue !== value) setValue(triggerValue)
            },
            onFocus: () => setFocusedValue(triggerValue),
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

    const wasEverActiveRef = useRef(isActive)
    if (isActive) wasEverActiveRef.current = true

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
      if (lazyMount && !wasEverActiveRef.current) {
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
