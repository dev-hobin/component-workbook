import React, {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useEventMachine, type Send } from '../../event-machine'

import {
  tabsMachine,
  isActive,
  type TabsContext as MachineContext,
  type TabsEvents,
  type TabValue,
  type TabsOrientation,
} from './machine'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'

import {
  ComponentStoreProvider,
  useComponentStore,
} from '../../primitives/use-component-store'
import { useNode } from '../../primitives/use-node'
import { useComponentSubscribe } from '../../primitives/use-component-subscribe'
import type { ComponentStore } from '../../primitives/component-store'

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

    const [focusedValue, setFocusedValue] = useState<TabValue | null>(null)

    // Ref for lazy getter
    const storeRef = useRef(store)
    storeRef.current = store

    // Machine context
    const machineCtx: MachineContext = {
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
    }

    // Event machine
    const { send } = useEventMachine(tabsMachine, machineCtx)

    // 키보드 네비게이션
    const handleKeyDown = (event: React.KeyboardEvent) => {
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
    }

    const contextValue: TabsContextValue = {
      tabsId,
      activeValue: activeValue ?? null,
      focusedValue,
      store,
      send,
      orientation,
    }

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

    const handleClick = () => {
      send('SELECT', { value })
    }

    const handleFocus = () => {
      send('FOCUS', { value })
    }

    const handleBlur = () => {
      send('BLUR')
    }

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
