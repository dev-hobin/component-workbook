import { useControllableState } from '@radix-ui/react-use-controllable-state'
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'

export type TabValue = string | number
export type TabsOrientation = 'horizontal' | 'vertical'

const createDomUtils = (options: {
  rootId: string
  ids?: {
    listId?: string
    tabId?: (value: TabValue) => string
    panelId?: (value: TabValue) => string
  }
}) => {
  const { rootId, ids } = options

  const listId = ids?.listId ?? `tabs::${rootId}::list`

  return {
    createListId: () => {
      return listId
    },
    createTabId: ({ value }: { value: TabValue }) => {
      return ids?.tabId?.(value) ?? `tabs::${rootId}::tab::${value}`
    },
    createPanelId: ({ value }: { value: TabValue }) => {
      return ids?.panelId?.(value) ?? `tabs::${rootId}::panel::${value}`
    },

    findNextTab: function ({ currentValue }: { currentValue: TabValue }) {
      const tabs = Array.from(
        document
          .getElementById(this.createListId())
          ?.querySelectorAll<HTMLElement>(
            `[role="tab"]:not([data-disabled])`,
          ) ?? [],
      )

      const currentIndex = tabs.findIndex(
        (tab) => tab.getAttribute('data-value') === currentValue,
      )

      const targetIndex = tabs.length - 1 > currentIndex ? currentIndex + 1 : 0

      return tabs[targetIndex]
    },
    findPreviousTab: function ({ currentValue }: { currentValue: TabValue }) {
      const tabs = Array.from(
        document
          .getElementById(this.createListId())
          ?.querySelectorAll<HTMLElement>(
            `[role="tab"]:not([data-disabled])`,
          ) ?? [],
      )

      const currentIndex = tabs.findIndex(
        (tab) => tab.getAttribute('data-value') === currentValue,
      )
      const targetIndex =
        currentIndex === 0 ? tabs.length - 1 : currentIndex - 1

      return tabs[targetIndex]
    },
  }
}

const TabsContext = createContext<
  | {
      activeTabValue: TabValue | null
      focusedTabValue: TabValue | null
      orientation: TabsOrientation
      selectTab: (tabValue: TabValue) => void
      focusTab: (tabValue: TabValue) => void
      blurTab: () => void
      dom: ReturnType<typeof createDomUtils>
    }
  | undefined
>(undefined)

export type RootProps = {
  value?: TabValue
  onValueChange?: (value: TabValue) => void
  defaultValue?: TabValue
  orientation?: TabsOrientation
  ids?: {
    listId?: string
    tabId?: (value: TabValue) => string
    panelId?: (value: TabValue) => string
  }
} & Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue'>

export function Root({
  id,
  children,
  value,
  onValueChange,
  defaultValue,
  orientation = 'horizontal',
  ids,
  ...rest
}: RootProps) {
  const defaultId = useId()
  const rootId = id ?? defaultId

  const [activeTabValue, setActiveTabValue] = useControllableState({
    prop: value,
    onChange: (value) => (value ? onValueChange?.(value) : undefined),
    defaultProp: defaultValue,
  })

  const [focusedTabValue, setFocusedTabValue] = useState<TabValue | null>(null)

  const dom = useMemo(() => createDomUtils({ rootId, ids }), [ids, rootId])

  const focusTab = (tabValue: TabValue) => {
    setFocusedTabValue(tabValue)
  }
  const blurTab = () => {
    setFocusedTabValue(null)
  }

  const selectTab = (tabValue: TabValue) => {
    if (!!activeTabValue && activeTabValue === tabValue) {
      return
    }

    setActiveTabValue(tabValue)
    setFocusedTabValue(tabValue)
  }

  useEffect(() => {
    if (focusedTabValue === null) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      function focusNextTab({ currentValue }: { currentValue: TabValue }) {
        const nextTab = dom.findNextTab({ currentValue })
        if (!nextTab) {
          return
        }

        nextTab.focus()
      }

      function focusPreviousTab({ currentValue }: { currentValue: TabValue }) {
        const previousTab = dom.findPreviousTab({ currentValue })

        if (!previousTab) {
          return
        }

        previousTab.focus()
      }

      if (orientation === 'horizontal') {
        if (event.key === 'ArrowRight') {
          focusNextTab({ currentValue: focusedTabValue })
        } else if (event.key === 'ArrowLeft') {
          focusPreviousTab({ currentValue: focusedTabValue })
        }
      } else {
        if (event.key === 'ArrowDown') {
          focusNextTab({ currentValue: focusedTabValue })
        } else if (event.key === 'ArrowUp') {
          focusPreviousTab({ currentValue: focusedTabValue })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeTabValue, dom, focusedTabValue, orientation, rootId])

  const dataProps = {
    'data-orientation': orientation,
    'data-active-value': activeTabValue ?? undefined,
    'data-focused-value': focusedTabValue ?? undefined,
  }

  return (
    <TabsContext.Provider
      value={{
        activeTabValue: activeTabValue ?? null,
        focusedTabValue,
        orientation,
        selectTab,
        focusTab,
        blurTab,
        dom,
      }}
    >
      <div id={rootId} {...dataProps} {...rest}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('useTabsContext must be used within a Tabs.Root')
  }
  return context
}

export type ListProps = ComponentPropsWithoutRef<'div'>

export function List({ children, ...rest }: ListProps) {
  const { activeTabValue, focusedTabValue, dom, orientation } = useTabsContext()

  const ariaProps = {
    'aria-orientation': orientation,
  }

  const dataProps = {
    'data-orientation': orientation,
    'data-active-value': activeTabValue ?? undefined,
    'data-focused-value': focusedTabValue ?? undefined,
  }

  return (
    <div
      role="tablist"
      id={dom.createListId()}
      {...ariaProps}
      {...dataProps}
      {...rest}
    >
      {children}
    </div>
  )
}

export type TabProps = {
  children: ReactNode
  value: TabValue
} & Omit<ComponentPropsWithoutRef<'button'>, 'value'>

export function Tab({
  children,
  value,
  onClick,
  onFocus,
  onBlur,
  disabled,
  ...rest
}: TabProps) {
  const {
    orientation,
    activeTabValue,
    focusedTabValue,
    selectTab,
    focusTab,
    blurTab,
    dom,
  } = useTabsContext()

  const dataProps = {
    'data-orientation': orientation,
    'data-focused-value': focusedTabValue ?? undefined,
    'data-value': value ?? undefined,
    'data-active': activeTabValue === value ? 'true' : undefined,
    'data-disabled': disabled ?? undefined,
  }

  return (
    <button
      role="tab"
      id={dom.createTabId({ value })}
      disabled={disabled}
      tabIndex={
        activeTabValue ? (activeTabValue === value ? 0 : -1) : undefined
      }
      onClick={(event) => {
        selectTab(value)
        onClick?.(event)
      }}
      onFocus={(event) => {
        focusTab(value)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        blurTab()
        onBlur?.(event)
      }}
      {...dataProps}
      {...rest}
    >
      {children}
    </button>
  )
}

export type PanelProps = {
  children: ReactNode
  value: TabValue
} & ComponentPropsWithoutRef<'div'>

export function Panel({ children, value, ...rest }: PanelProps) {
  const { orientation, activeTabValue, focusedTabValue, dom } = useTabsContext()

  const dataProps = {
    'data-orientation': orientation,
    'data-focused-value': focusedTabValue ?? undefined,
    'data-value': value,
    'data-active': activeTabValue === value ? 'true' : undefined,
  }

  if (activeTabValue !== value) {
    return null
  }

  return (
    <div
      role="tabpanel"
      id={dom.createPanelId({ value })}
      tabIndex={activeTabValue === value ? 0 : -1}
      {...dataProps}
      {...rest}
    >
      {children}
    </div>
  )
}

const Tabs = {
  Root,
  List,
  Tab,
  Panel,
}

export default Tabs
