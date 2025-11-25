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

const MenuContext = createContext<
  | {
      open: boolean

      openMenu: ({
        initialFocusType,
      }: {
        initialFocusType: 'first-item' | 'last-item'
      }) => void
      closeMenu: () => void

      focusedItemId: string | null
      setFocusedItemId: (itemId: string | null) => void

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
  | undefined
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
    subContentId?: string
    actionItemId?: (value: string) => string
    linkItemId?: (value: string) => string
  }
  children: React.ReactNode
}

export function Root({
  open: openProp,
  onOpenChange,
  defaultOpen,
  idRules,
  children,
}: RootProps) {
  const defaultId = useId()
  const rootId = idRules?.rootId ?? defaultId
  const triggerId = idRules?.triggerId ?? `${rootId}-trigger`
  const positionerId = idRules?.positionerId ?? `${rootId}-positioner`
  const positionerArrowId =
    idRules?.positionerArrowId ?? `${rootId}-positioner-arrow`
  const contentId = idRules?.contentId ?? `${rootId}-content`
  const actionItemId =
    idRules?.actionItemId ?? ((value) => `${rootId}-action-item-${value}`)
  const linkItemId =
    idRules?.linkItemId ?? ((value) => `${rootId}-link-item-${value}`)

  const initialFocusTypeRef = useRef<'first-item' | 'last-item'>('first-item')

  const [open, setOpen] = useControllableState({
    prop: openProp,
    onChange: onOpenChange,
    defaultProp: defaultOpen ?? false,
  })

  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)

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
    const triggerEl = document.getElementById(triggerId)
    if (!triggerEl) {
      return
    }

    triggerEl.focus()
  }

  const openMenuRef = useLatestRef(openMenu)

  const { isPresent: isContentPresent } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(contentId),
  })

  useEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEl = document.getElementById(contentId)
    if (!contentEl) {
      return
    }

    const menuItems = Array.from(
      contentEl.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    )

    if (menuItems.length === 0) {
      return
    }

    if (initialFocusTypeRef.current === 'last-item') {
      menuItems[menuItems.length - 1]?.focus()
      setFocusedItemId(menuItems[menuItems.length - 1]?.id)
    } else {
      menuItems[0]?.focus()
      setFocusedItemId(menuItems[0]?.id)
    }
  }, [isContentPresent, contentId, triggerId])

  useEffect(() => {
    const triggerEl = document.getElementById(triggerId)
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

  const focusedItemIdRef = useLatestRef(focusedItemId)
  useEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEl = document.getElementById(contentId)
    if (!contentEl) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (focusedItemIdRef.current === null) {
        return
      }

      const isArrowDown = event.key === 'ArrowDown'
      const isArrowUp = event.key === 'ArrowUp'

      if (!isArrowDown && !isArrowUp) {
        return
      }

      event.preventDefault()

      const menuItems = Array.from(
        contentEl.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      )

      if (menuItems.length === 0) {
        return
      }

      const currentIndex = menuItems.findIndex(
        (item) => item.id === focusedItemIdRef.current,
      )

      if (currentIndex === -1) {
        return
      }

      const nextIndex = isArrowDown
        ? (currentIndex + 1) % menuItems.length // 순환
        : (currentIndex - 1 + menuItems.length) % menuItems.length // 순환

      const nextItem = menuItems[nextIndex]
      setFocusedItemId(nextItem.id)
      nextItem.focus()
    }

    contentEl.addEventListener('keydown', handleKeyDown)
    return () => {
      contentEl.removeEventListener('keydown', handleKeyDown)
    }
  }, [contentId, focusedItemIdRef, isContentPresent])

  return (
    <MenuContext.Provider
      value={{
        open,
        openMenu,
        closeMenu,

        focusedItemId,
        setFocusedItemId,

        idRules: {
          rootId,
          triggerId,
          positionerId,
          positionerArrowId,
          contentId,
          actionItemId,
          linkItemId,
        },
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
  const { open, openMenu, closeMenu, idRules, focusedItemId } = useMenuContext()

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
      tabIndex={focusedItemId === id ? 0 : -1}
      aria-haspopup="menu"
      aria-expanded={open ? 'true' : 'false'}
      aria-controls={idRules.contentId}
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
  const { idRules, closeMenu, focusedItemId } = useMenuContext()
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
      tabIndex={focusedItemId === id ? 0 : -1}
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
  const { idRules, closeMenu, focusedItemId } = useMenuContext()
  const id = idRules.linkItemId(value)

  return (
    <a
      role="menuitem"
      id={id}
      onClick={(event) => {
        closeMenu()
        onClick?.(event)
      }}
      tabIndex={focusedItemId === id ? 0 : -1}
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
