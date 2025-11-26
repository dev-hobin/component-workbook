import { useControllableState } from '@radix-ui/react-use-controllable-state'
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { usePresence } from '../../hooks/usePresence'
import {
  arrow,
  computePosition,
  flip,
  offset,
  shift,
  autoUpdate,
  type Placement,
} from '@floating-ui/dom'
import { useLatestRef } from '../../hooks/useLatestRef'

// [role^="menuitem"][data-ownedby=${ownerId}]:not([data-disabled])

const dom = {
  getTriggerElement: ({ triggerId }: { triggerId: string }) =>
    document.getElementById(triggerId),
  getContentElement: ({ contentId }: { contentId: string }) =>
    document.getElementById(contentId),
  getMenuItems: ({ rootId }: { rootId: string }) =>
    Array.from(
      document?.querySelectorAll<HTMLElement>(
        `[role^="menuitem"][data-ownedby=${rootId}]:not([data-disabled])`,
      ) ?? [],
    ),
  getMenuItemElement: ({ itemId }: { itemId: string }) =>
    document.getElementById(itemId),
}

type MenuContextType = {
  open: boolean

  openMenu: ({
    initialFocusType,
  }: {
    initialFocusType: 'first-item' | 'last-item'
  }) => void
  closeMenu: () => void

  activeItemId: string | null
  setActiveItemId: (itemId: string | null) => void

  idRules: {
    rootId: string
    triggerId: string
    positionerId: string
    positionerArrowId: string
    contentId: string
    actionItemId: (value: string) => string
    linkItemId: (value: string) => string
  }
}

const MenuContext = createContext<
  (MenuContextType & { parentMenuContext?: MenuContextType }) | undefined
>(undefined)

function useMenuContext() {
  const context = useContext(MenuContext)
  if (!context) {
    throw new Error('useMenuContext must be used within a Menu.Root')
  }
  return context
}

export type RootProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  idRules?: {
    rootId?: string
    triggerId?: string
    subTriggerId?: string
    positionerId?: string
    positionerArrowId?: string
    contentId?: string
    actionItemId?: (value: string) => string
    linkItemId?: (value: string) => string
  }
  children: React.ReactNode
}

export function Root({
  open: openProp,
  onOpenChange,
  defaultOpen,
  idRules: idRulesProp,
  children,
}: RootProps) {
  const parentMenuContext = useContext(MenuContext)

  const defaultId = useId()

  const rootId = idRulesProp?.rootId ?? defaultId
  const triggerId = idRulesProp?.triggerId ?? `${rootId}-trigger`
  const positionerId = idRulesProp?.positionerId ?? `${rootId}-positioner`
  const positionerArrowId =
    idRulesProp?.positionerArrowId ?? `${rootId}-positioner-arrow`
  const contentId = idRulesProp?.contentId ?? `${rootId}-content`
  const actionItemId =
    idRulesProp?.actionItemId ?? ((value) => `${rootId}-action-item-${value}`)
  const linkItemId =
    idRulesProp?.linkItemId ?? ((value) => `${rootId}-link-item-${value}`)

  const initialFocusTypeRef = useRef<'first-item' | 'last-item'>('first-item')

  const [open, setOpen] = useControllableState({
    prop: openProp,
    onChange: onOpenChange,
    defaultProp: defaultOpen ?? false,
  })

  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  const openMenu = ({
    initialFocusType,
  }: {
    initialFocusType: 'first-item' | 'last-item'
  }) => {
    setOpen(true)
    initialFocusTypeRef.current = initialFocusType
  }

  const closeMenu = () => {
    setOpen(false)
    setActiveItemId(null)
    const triggerEl = dom.getTriggerElement({ triggerId })
    if (!triggerEl) {
      return
    }
    triggerEl.focus()
  }

  const openMenuRef = useLatestRef(openMenu)

  const { isPresent: isContentPresent } = usePresence({
    isVisible: open,
    resolveElement: () => dom.getContentElement({ contentId }),
  })

  useLayoutEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEl = dom.getContentElement({ contentId })
    if (!contentEl) {
      return
    }

    const menuItemEls = dom.getMenuItems({ rootId })
    if (menuItemEls.length === 0) {
      return
    }

    if (initialFocusTypeRef.current === 'last-item') {
      setActiveItemId(menuItemEls[menuItemEls.length - 1]?.id ?? null)
    } else {
      setActiveItemId(menuItemEls[0]?.id ?? null)
    }
  }, [contentId, isContentPresent, rootId, triggerId])

  useLayoutEffect(() => {
    if (activeItemId === null) {
      return
    }
    dom.getMenuItemElement({ itemId: activeItemId })?.focus()
  }, [activeItemId])

  useEffect(() => {
    const triggerEl = dom.getTriggerElement({ triggerId })
    if (!triggerEl) {
      return
    }

    if (isContentPresent) {
      return
    }

    const handleOpenMenu = (event: KeyboardEvent) => {
      if (triggerEl.getAttribute('role') === 'menuitem') {
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          openMenuRef.current({ initialFocusType: 'first-item' })
        }
      } else {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          openMenuRef.current({ initialFocusType: 'first-item' })
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          openMenuRef.current({ initialFocusType: 'last-item' })
        }
      }
    }

    triggerEl.addEventListener('keydown', handleOpenMenu)
    return () => {
      triggerEl.removeEventListener('keydown', handleOpenMenu)
    }
  }, [isContentPresent, openMenuRef, triggerId])

  const activeItemIdRef = useLatestRef(activeItemId)
  useEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEl = dom.getContentElement({ contentId })
    if (!contentEl) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeItemIdRef.current === null) {
        return
      }

      const isArrowDown = event.key === 'ArrowDown'
      const isArrowUp = event.key === 'ArrowUp'

      if (!isArrowDown && !isArrowUp) {
        return
      }

      event.preventDefault()

      const menuItems = dom.getMenuItems({ rootId })

      if (menuItems.length === 0) {
        return
      }

      const currentIndex = menuItems.findIndex(
        (item) => item.id === activeItemIdRef.current,
      )

      if (currentIndex === -1) {
        return
      }

      const nextIndex = isArrowDown
        ? (currentIndex + 1) % menuItems.length // 순환
        : (currentIndex - 1 + menuItems.length) % menuItems.length // 순환

      const nextItem = menuItems[nextIndex]
      setActiveItemId(nextItem.id)
    }

    contentEl.addEventListener('keydown', handleKeyDown)
    return () => {
      contentEl.removeEventListener('keydown', handleKeyDown)
    }
  }, [contentId, activeItemIdRef, isContentPresent, rootId])

  const closeMenuRef = useLatestRef(closeMenu)
  useEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEl = dom.getContentElement({ contentId })
    if (!contentEl) {
      return
    }

    const handleTab = (event: KeyboardEvent) => {
      if (!isFocusWithin(contentEl)) {
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      if (!event.shiftKey) {
        return
      }

      event.preventDefault()
      closeMenuRef.current()
    }

    contentEl.addEventListener('keydown', handleTab)
    return () => {
      contentEl.removeEventListener('keydown', handleTab)
    }
  }, [closeMenuRef, contentId, isContentPresent])

  const isSubMenu = parentMenuContext !== undefined
  useEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEl = dom.getContentElement({ contentId })
    if (!contentEl) {
      return
    }

    const handleArrowLeft = (event: KeyboardEvent) => {
      if (!isSubMenu) {
        return
      }

      if (event.key !== 'ArrowLeft') {
        return
      }

      if (!isFocusWithin(contentEl)) {
        return
      }

      event.preventDefault()
      closeMenuRef.current()
    }

    contentEl.addEventListener('keydown', handleArrowLeft)
    return () => {
      contentEl.removeEventListener('keydown', handleArrowLeft)
    }
  }, [closeMenuRef, contentId, isContentPresent, isSubMenu])

  return (
    <MenuContext.Provider
      value={{
        open,
        openMenu,
        closeMenu,

        activeItemId,
        setActiveItemId,

        idRules: {
          rootId,
          triggerId,
          positionerId,
          positionerArrowId,
          contentId,
          actionItemId,
          linkItemId,
        },

        parentMenuContext,
      }}
    >
      {children}
    </MenuContext.Provider>
  )
}

export type TriggerProps = ComponentPropsWithoutRef<'button'>
export function Trigger({ children, onClick, ...rest }: TriggerProps) {
  const { open, openMenu, closeMenu, idRules } = useMenuContext()

  const id = idRules.triggerId

  return (
    <button
      type="button"
      id={id}
      onClick={(event) => {
        if (open) {
          closeMenu()
        } else {
          openMenu({ initialFocusType: 'first-item' })
        }
        onClick?.(event)
      }}
      aria-haspopup="menu"
      aria-expanded={open ? 'true' : 'false'}
      aria-controls={idRules.contentId}
      {...rest}
    >
      {children}
    </button>
  )
}

export type ContentProps = ComponentPropsWithoutRef<'div'>
export function Content({ children, ...rest }: ContentProps) {
  const { open, idRules } = useMenuContext()

  const { isPresent } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(idRules.contentId),
  })

  if (!isPresent) {
    return null
  }

  return (
    <div
      role="menu"
      id={idRules.contentId}
      aria-labelledby={idRules.triggerId}
      {...rest}
    >
      {children}
    </div>
  )
}

export type SubTriggerProps = ComponentPropsWithoutRef<'button'>
export function SubTrigger({ children, onClick, ...rest }: SubTriggerProps) {
  const {
    open,
    openMenu,
    closeMenu,
    idRules,
    activeItemId,
    parentMenuContext,
  } = useMenuContext()

  const id = idRules.triggerId

  return (
    <button
      role="menuitem"
      type="button"
      id={id}
      onClick={(event) => {
        if (open) {
          closeMenu()
        } else {
          openMenu({ initialFocusType: 'first-item' })
        }
        onClick?.(event)
      }}
      tabIndex={activeItemId === id ? 0 : -1}
      aria-haspopup="menu"
      aria-expanded={open ? 'true' : 'false'}
      aria-controls={idRules.contentId}
      data-ownedby={
        parentMenuContext ? parentMenuContext.idRules.rootId : undefined
      }
      {...rest}
    >
      {children}
    </button>
  )
}

export type SubContentProps = ComponentPropsWithoutRef<'div'>
export function SubContent({ children, ...rest }: SubContentProps) {
  const { open, idRules } = useMenuContext()

  const { isPresent } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(idRules.contentId),
  })

  if (!isPresent) {
    return null
  }

  return (
    <div
      role="menu"
      id={idRules.contentId}
      aria-labelledby={idRules.triggerId}
      {...rest}
    >
      {children}
    </div>
  )
}

export type PositionerProps = {
  placement?: Placement
  flipOptions?: Parameters<typeof flip>[0]
  shiftOptions?: Parameters<typeof shift>[0]
  offset?: number
  arrowOffset?: number
} & ComponentPropsWithoutRef<'div'>
export function Positioner({
  children,
  placement = 'bottom',
  flipOptions,
  shiftOptions,
  offset: offsetOption = 0,
  arrowOffset: arrowOffsetOption = 4,
}: PositionerProps) {
  const { open, idRules } = useMenuContext()

  const { isPresent } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(idRules.positionerId),
  })

  const flipOptionsRef = useLatestRef(flipOptions)
  const shiftOptionsRef = useLatestRef(shiftOptions)
  useLayoutEffect(() => {
    if (!isPresent) {
      return
    }

    const triggerEl = document.getElementById(idRules.triggerId)
    const positionerEl = document.getElementById(idRules.positionerId)
    if (!triggerEl || !positionerEl) {
      return
    }

    function positionUpdate() {
      const triggerEl = document.getElementById(idRules.triggerId)
      const positionerEl = document.getElementById(idRules.positionerId)
      if (!triggerEl || !positionerEl) {
        return
      }

      const positionerArrowEl = document.getElementById(
        idRules.positionerArrowId,
      )

      computePosition(triggerEl, positionerEl, {
        placement,
        middleware: [
          offset(offsetOption),
          flip(flipOptionsRef.current),
          shift(shiftOptionsRef.current),
          ...(positionerArrowEl
            ? [
                arrow({
                  element: positionerArrowEl,
                }),
              ]
            : []),
        ],
      }).then(({ x, y, middlewareData }) => {
        Object.assign(positionerEl.style, {
          left: `${x}px`,
          top: `${y}px`,
        })

        // Accessing the data
        const arrow = middlewareData.arrow
        if (!arrow || !positionerArrowEl) {
          return
        }
        const { x: arrowX, y: arrowY } = arrow

        const staticSide = {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right',
        }[placement.split('-')[0]]

        Object.assign(positionerArrowEl.style, {
          left: arrowX != null ? `${arrowX}px` : '',
          top: arrowY != null ? `${arrowY}px` : '',
          right: '',
          bottom: '',
          [staticSide as keyof CSSProperties]: `-${arrowOffsetOption}px`,
        })
      })
    }

    const autoUpdateCleanup = autoUpdate(
      triggerEl,
      positionerEl,
      positionUpdate,
    )

    return () => {
      autoUpdateCleanup()
    }
  }, [
    isPresent,
    idRules.positionerId,
    idRules.triggerId,
    idRules.positionerArrowId,
    placement,
    flipOptionsRef,
    shiftOptionsRef,
    offsetOption,
    arrowOffsetOption,
  ])

  if (!isPresent) {
    return null
  }

  return (
    <div
      id={idRules.positionerId}
      style={{
        width: 'max-content',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      {children}
    </div>
  )
}

export type PositionerArrowProps = ComponentPropsWithoutRef<'div'>
export function PositionerArrow({
  children,
  style,
  ...rest
}: PositionerArrowProps) {
  const { idRules } = useMenuContext()

  return (
    <div
      id={idRules.positionerArrowId}
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        transform: 'rotate(45deg)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

export type ActionItemProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'value'
> & {
  value: string
}
export function ActionItem({
  children,
  onClick,
  value,
  ...rest
}: ActionItemProps) {
  const { idRules, closeMenu, activeItemId } = useMenuContext()
  const id = idRules.actionItemId(value)

  return (
    <button
      role="menuitem"
      type="button"
      id={id}
      onClick={(event) => {
        closeMenu()
        onClick?.(event)
      }}
      tabIndex={activeItemId === id ? 0 : -1}
      data-ownedby={idRules.rootId}
      {...rest}
    >
      {children}
    </button>
  )
}

export type LinkItemProps = Omit<ComponentPropsWithoutRef<'a'>, 'value'> & {
  value: string
}
export function LinkItem({ children, onClick, value, ...rest }: LinkItemProps) {
  const { idRules, closeMenu, activeItemId } = useMenuContext()
  const id = idRules.linkItemId(value)

  return (
    <a
      role="menuitem"
      id={id}
      onClick={(event) => {
        closeMenu()
        onClick?.(event)
      }}
      tabIndex={activeItemId === id ? 0 : -1}
      data-ownedby={idRules.rootId}
      {...rest}
    >
      {children}
    </a>
  )
}

export type PortalProps = {
  children: React.ReactNode
  container?: Element | DocumentFragment
  key?: React.Key | null
}
export function Portal({
  children,
  container = document.body,
  key,
}: PortalProps) {
  return createPortal(children, container, key)
}

function isFocusWithin(root: HTMLElement): boolean {
  if (typeof document === 'undefined') {
    return false
  }

  return root.contains(document.activeElement)
}

const Menu = {
  Root,
  Trigger,
  SubTrigger,
  Positioner,
  PositionerArrow,
  Content,
  SubContent,
  ActionItem,
  LinkItem,
  Portal,
}

export default Menu
