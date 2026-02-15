import {
  createContext,
  forwardRef,
  useContext,
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
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

export type TabValue = string

type TabsMeta = {
  disabled?: boolean
}

type TabsContextValue = {
  idMap: IdMap
  registry: ElementRegistry<TabsMeta>
  value: TabValue
  setValue: (value: TabValue) => void
  focusedValue: TabValue | null
  setFocusedValue: (value: TabValue | null) => void
  disabled: boolean
  orientation: 'horizontal' | 'vertical'
  activationMode: 'automatic' | 'manual'
  loop: boolean
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

export const Root = forwardRef<HTMLDivElement, RootProps>(
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
    const [idMap, idActions] = useIdMap()

    const registryRef = useRef<ElementRegistry<TabsMeta>>(null!)
    if (!registryRef.current) {
      registryRef.current = createElementRegistry<TabsMeta>()
    }
    const registry = registryRef.current

    const listRef = useRef<HTMLDivElement>(null)

    const [valueState, setValueState] = useControllableState<string>({
      prop: valueProp,
      defaultProp: defaultValue ?? '',
      onChange: onValueChange,
    })
    const value = valueState ?? ''

    const [focusedValue, setFocusedValue] = useState<TabValue | null>(null)

    const contextValue: TabsContextValue = {
      idMap,
      registry,
      value,
      setValue: setValueState,
      focusedValue,
      setFocusedValue,
      disabled,
      orientation,
      activationMode,
      loop,
      listRef,
    }

    return (
      <RegistrationProvider idActions={idActions} registry={registry}>
        <TabsContext.Provider value={contextValue}>
          <div
            ref={forwardedRef}
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
      </RegistrationProvider>
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
      registry,
      orientation,
      disabled,
      activationMode,
      loop,
      listRef,
    } = useTabsContext()

    useEffect(() => {
      if (focusedValue) {
        registry.getElement(focusedValue, 'trigger')?.focus()
      }
    }, [focusedValue, registry])

    const navigateTo = (targetValue: TabValue) => {
      setFocusedValue(targetValue)
      if (activationMode === 'automatic' && targetValue !== value) {
        setValue(targetValue)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      const isHorizontal = orientation === 'horizontal'
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

      switch (e.key) {
        case nextKey: {
          e.preventDefault()
          const triggers = registry.getEntriesByRoleInDomOrder('trigger')
          const enabledValues = triggers
            .filter((entry) => !entry.meta.disabled && !disabled)
            .map((entry) => entry.value)
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
          const triggers = registry.getEntriesByRoleInDomOrder('trigger')
          const enabledValues = triggers
            .filter((entry) => !entry.meta.disabled && !disabled)
            .map((entry) => entry.value)
          if (enabledValues.length === 0) return

          const currentIndex = enabledValues.indexOf(focusedValue ?? value)
          let prevIndex: number

          if (currentIndex === -1) {
            prevIndex = enabledValues.length - 1
          } else if (loop) {
            prevIndex =
              (currentIndex - 1 + enabledValues.length) % enabledValues.length
          } else {
            prevIndex = Math.max(currentIndex - 1, 0)
          }

          navigateTo(enabledValues[prevIndex])
          break
        }
        case 'Home': {
          e.preventDefault()
          const triggers = registry.getEntriesByRoleInDomOrder('trigger')
          const enabledValues = triggers
            .filter((entry) => !entry.meta.disabled && !disabled)
            .map((entry) => entry.value)
          if (enabledValues.length === 0) return
          navigateTo(enabledValues[0])
          break
        }
        case 'End': {
          e.preventDefault()
          const triggers = registry.getEntriesByRoleInDomOrder('trigger')
          const enabledValues = triggers
            .filter((entry) => !entry.meta.disabled && !disabled)
            .map((entry) => entry.value)
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
        ref={composeRefs(forwardedRef, listRef)}
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
  (
    { children, value: triggerValue, id: userDomId, disabled = false, ...rest },
    forwardedRef,
  ) => {
    const {
      idMap,
      value,
      setValue,
      setFocusedValue,
      disabled: rootDisabled,
    } = useTabsContext()

    const isDisabled = rootDisabled || disabled
    const isActive = value === triggerValue

    const { ref, domId } = useRegister<TabsMeta>({
      value: triggerValue,
      role: 'trigger',
      id: userDomId,
      meta: { disabled: isDisabled },
    })

    const contentDomId = idMap.get(createIdMapKey(triggerValue, 'content'))

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
            'aria-controls': contentDomId ?? undefined,
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
    {
      children,
      value: contentValue,
      id: userDomId,
      lazyMount = false,
      unmountOnExit = false,
      ...rest
    },
    forwardedRef,
  ) => {
    const { idMap, value } = useTabsContext()

    const isActive = value === contentValue

    const { ref, domId } = useRegister({
      value: contentValue,
      role: 'content',
      id: userDomId,
    })

    const elementRef = useRef<HTMLDivElement>(null)

    const wasEverActiveRef = useRef(isActive)
    if (isActive) wasEverActiveRef.current = true

    const { isPresent, transitionState } = usePresence({
      isVisible: isActive,
      resolveElement: () => elementRef.current,
    })

    const triggerDomId = idMap.get(createIdMapKey(contentValue, 'trigger'))

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
        ref={composeRefs(forwardedRef, ref, elementRef)}
        {...mergeProps(
          {
            role: 'tabpanel',
            id: domId,
            tabIndex: 0,
            'aria-labelledby': triggerDomId ?? undefined,
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
    const { value, registry, orientation, listRef } = useTabsContext()

    const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>(
      {},
    )

    useLayoutEffect(() => {
      const triggerElement = registry.getElement(value, 'trigger')
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
    }, [value, orientation, registry, listRef])

    return (
      <div
        ref={forwardedRef}
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
