import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import {
  selectTab,
  focusTab,
  blurTab,
  isActive,
  type TabsState,
  type TabValue,
  type TabsOrientation,
} from './core'
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
  state: TabsState
  setState: React.Dispatch<React.SetStateAction<TabsState>>
  store: ComponentStore<TabsRole, TabsMeta>
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

    const state: TabsState = useMemo(
      () => ({
        activeValue: activeValue ?? null,
        focusedValue,
      }),
      [activeValue, focusedValue],
    )

    const setState: React.Dispatch<React.SetStateAction<TabsState>> = useCallback(
      (action) => {
        const nextState = typeof action === 'function' ? action(state) : action
        if (nextState.activeValue !== state.activeValue) {
          setActiveValue(nextState.activeValue ?? undefined)
        }
        if (nextState.focusedValue !== state.focusedValue) {
          setFocusedValue(nextState.focusedValue)
        }
      },
      [state, setActiveValue],
    )

    // 키보드 네비게이션
    useEffect(() => {
      if (state.focusedValue === null) return

      const handleKeyDown = (event: KeyboardEvent) => {
        const tabs = store.getNodesByRole('tab')
        const enabledTabs = tabs.filter((tab) => !tab.meta.disabled)
        if (enabledTabs.length === 0) return

        const currentIndex = enabledTabs.findIndex(
          (tab) => tab.meta.value === state.focusedValue,
        )

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
          const nextIndex = (currentIndex + 1) % enabledTabs.length
          const nextTab = enabledTabs[nextIndex]
          if (nextTab.meta.value !== undefined) {
            setState(focusTab(state, nextTab.meta.value))
            store.getElement(nextTab.id, 'tab')?.focus()
          }
        } else if (isPrev) {
          event.preventDefault()
          const prevIndex =
            (currentIndex - 1 + enabledTabs.length) % enabledTabs.length
          const prevTab = enabledTabs[prevIndex]
          if (prevTab.meta.value !== undefined) {
            setState(focusTab(state, prevTab.meta.value))
            store.getElement(prevTab.id, 'tab')?.focus()
          }
        } else if (event.key === 'Home') {
          event.preventDefault()
          const firstTab = enabledTabs[0]
          if (firstTab.meta.value !== undefined) {
            setState(focusTab(state, firstTab.meta.value))
            store.getElement(firstTab.id, 'tab')?.focus()
          }
        } else if (event.key === 'End') {
          event.preventDefault()
          const lastTab = enabledTabs[enabledTabs.length - 1]
          if (lastTab.meta.value !== undefined) {
            setState(focusTab(state, lastTab.meta.value))
            store.getElement(lastTab.id, 'tab')?.focus()
          }
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [state, setState, store, orientation])

    const contextValue = useMemo<TabsContextValue>(
      () => ({
        tabsId,
        state,
        setState,
        store,
        orientation,
      }),
      [tabsId, state, setState, store, orientation],
    )

    return (
      <TabsContext.Provider value={contextValue}>
        <div
          ref={forwardedRef}
          {...mergeProps(
            {
              'data-orientation': orientation,
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
    const { state, setState, store, orientation } = useTabsContext()

    const { ref, domId } = useNode<TabsRole, TabsMeta>({
      role: 'tab',
      id: value,
      meta: { value, disabled },
    })

    // store에서 panel element의 id 구독
    const panelId = useComponentSubscribe(
      store,
      (s) => s.getElement(value, 'panel')?.id || null,
    )

    const isTabActive = isActive(state, value)

    const handleClick = useCallback(() => {
      setState(selectTab(state, value))
    }, [state, setState, value])

    const handleFocus = useCallback(() => {
      setState(focusTab(state, value))
    }, [state, setState, value])

    const handleBlur = useCallback(() => {
      setState(blurTab(state))
    }, [state, setState])

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'tab',
            type: 'button',
            id: domId,
            disabled,
            tabIndex: state.activeValue
              ? isTabActive
                ? 0
                : -1
              : undefined,
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
    const { state, store, orientation } = useTabsContext()

    const { ref, domId } = useNode<TabsRole, TabsMeta>({
      role: 'panel',
      id: value,
      meta: { value },
    })

    // store에서 tab element의 id 구독
    const tabId = useComponentSubscribe(
      store,
      (s) => s.getElement(value, 'tab')?.id || null,
    )

    const isTabActive = isActive(state, value)

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
