import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useEventMachine, type Send } from '../../../lib/event-machine'

import {
  tabsMachine,
  isActive,
  type TabsContext as MachineContext,
  type TabsEvents,
  type TabValue,
  type TabsOrientation,
} from './machine'
import { composeRefs } from '../../utils/composeRefs'
import { mergeProps } from '../../utils/mergeProps'

import {
  ComponentStoreProvider,
  useComponentStore,
} from '../../shell/use-component-store'
import { useNode } from '../../shell/use-node'
import { useComponentSubscribe } from '../../shell/use-component-subscribe'
import type { ComponentStore } from '../../core/component-store'

// ============================================
// Types
// ============================================

type TabsRole = 'list' | 'tab' | 'panel'

type TabsMeta = {
  value?: TabValue
  disabled?: boolean
}

type TabsContextValue = {
  tabsId: string
  activeValue: TabValue | null
  focusedValue: TabValue | null
  store: ComponentStore<TabsRole, TabsMeta>
  send: Send<TabsEvents>
  orientation: TabsOrientation
}

// ============================================
// Contexts
// ============================================

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs 컴포넌트는 Tabs.Root 안에서 사용해야 합니다.')
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  value?: TabValue
  onValueChange?: (value: TabValue) => void
  defaultValue?: TabValue
  orientation?: TabsOrientation
} & Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue'>

export function Root(props: RootProps) {
  return (
    <ComponentStoreProvider<TabsRole, TabsMeta>>
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
      orientation = 'horizontal',
      ...rest
    },
    forwardedRef,
  ) => {
    const { store } = useComponentStore<TabsRole, TabsMeta>()
    const tabsId = useId()

    const [activeValue, setActiveValue] = useControllableState({
      prop: valueProp,
      onChange: (value) => (value ? onValueChange?.(value) : undefined),
      defaultProp: defaultValue,
    })

    const [focusedValue, setFocusedValue] = React.useState<TabValue | null>(null)

    // Ref for lazy getter
    const storeRef = useRef(store)
    storeRef.current = store

    // Machine context
    const machineCtx: MachineContext = useMemo(
      () => ({
        activeValue: activeValue ?? null,
        focusedValue,
        setActiveValue: (value) => setActiveValue(value ?? undefined),
        setFocusedValue,
        getEnabledTabs: () => {
          const tabs = storeRef.current.getNodesByRole('tab')
          return tabs
            .filter((tab) => !tab.meta.disabled)
            .map((tab) => ({ value: tab.meta.value! }))
        },
        getTabElement: (value) =>
          storeRef.current.getElement(String(value), 'tab'),
      }),
      [activeValue, focusedValue, setActiveValue],
    )

    // Event machine
    const send = useEventMachine(tabsMachine, machineCtx)

    // 키보드 네비게이션
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (focusedValue === null) return

        const isNext =
          orientation === 'horizontal'
            ? event.key === 'ArrowRight'
            : event.key === 'ArrowDown'

        const isPrev =
          orientation === 'horizontal'
            ? event.key === 'ArrowLeft'
            : event.key === 'ArrowUp'

        if (isNext) {
          event.preventDefault()
          send('FOCUS_NEXT')
        } else if (isPrev) {
          event.preventDefault()
          send('FOCUS_PREV')
        } else if (event.key === 'Home') {
          event.preventDefault()
          send('FOCUS_FIRST')
        } else if (event.key === 'End') {
          event.preventDefault()
          send('FOCUS_LAST')
        }
      },
      [focusedValue, orientation, send],
    )

    const contextValue = useMemo<TabsContextValue>(
      () => ({
        tabsId,
        activeValue: activeValue ?? null,
        focusedValue,
        store,
        send,
        orientation,
      }),
      [tabsId, activeValue, focusedValue, store, send, orientation],
    )

    return (
      <TabsContext.Provider value={contextValue}>
        <div
          ref={forwardedRef}
          {...mergeProps(
            {
              'data-orientation': orientation,
              onKeyDown: handleKeyDown,
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
    const { tabsId, orientation } = useTabsContext()

    const { ref, domId } = useNode<TabsRole>({
      role: 'list',
      id: tabsId,
    })

    return (
      <div
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'tablist',
            id: domId,
            'aria-orientation': orientation,
            'data-orientation': orientation,
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
// Tab
// ============================================

export type TabProps = {
  value: TabValue
} & Omit<ComponentPropsWithoutRef<'button'>, 'value'>

export const Tab = forwardRef<HTMLButtonElement, TabProps>(
  ({ children, value, disabled, ...rest }, forwardedRef) => {
    const { activeValue, store, send, orientation } = useTabsContext()

    const valueStr = String(value)

    const { ref, domId } = useNode<TabsRole, TabsMeta>({
      role: 'tab',
      id: valueStr,
      meta: { value, disabled },
    })

    // store에서 panel element의 id 구독
    const panelId = useComponentSubscribe(
      store,
      (s) => s.getElement(valueStr, 'panel')?.id || null,
    )

    const isTabActive = isActive(activeValue, value)

    const handleClick = useCallback(() => {
      send('SELECT', { value })
    }, [send, value])

    const handleFocus = useCallback(() => {
      send('FOCUS', { value })
    }, [send, value])

    const handleBlur = useCallback(() => {
      send('BLUR')
    }, [send])

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'tab',
            type: 'button',
            id: domId,
            disabled,
            tabIndex: activeValue ? (isTabActive ? 0 : -1) : undefined,
            onClick: handleClick,
            onFocus: handleFocus,
            onBlur: handleBlur,
            'aria-selected': isTabActive,
            'aria-controls': panelId ?? undefined,
            'data-orientation': orientation,
            'data-active': isTabActive || undefined,
            'data-disabled': disabled || undefined,
            'data-value': value,
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
// Panel
// ============================================

export type PanelProps = {
  value: TabValue
} & ComponentPropsWithoutRef<'div'>

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ children, value, ...rest }, forwardedRef) => {
    const { activeValue, store, orientation } = useTabsContext()

    const valueStr = String(value)

    const { ref, domId } = useNode<TabsRole, TabsMeta>({
      role: 'panel',
      id: valueStr,
      meta: { value },
    })

    // store에서 tab element의 id 구독
    const tabId = useComponentSubscribe(
      store,
      (s) => s.getElement(valueStr, 'tab')?.id || null,
    )

    const isTabActive = isActive(activeValue, value)

    if (!isTabActive) {
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
            'aria-labelledby': tabId ?? undefined,
            'data-orientation': orientation,
            'data-active': isTabActive || undefined,
            'data-value': value,
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

const Tabs = {
  Root,
  List,
  Tab,
  Panel,
}

export default Tabs
