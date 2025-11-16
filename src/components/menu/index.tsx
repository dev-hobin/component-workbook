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
        initialFocus,
      }: {
        initialFocus: 'first-item' | 'last-item'
      }) => void
      initialFocusType: 'first-item' | 'last-item'
      activedescendant?: string
      closeMenu: () => void
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

  const [open, setOpen] = useControllableState({
    prop: openProp,
    onChange: onOpenChange,
    defaultProp: defaultOpen ?? false,
  })
  const initialFocusTypeRef = useRef<'first-item' | 'last-item'>('first-item')
  const [activedescendant, setActivedescendant] = useState<string | undefined>(
    undefined,
  )

  const openMenu = ({
    initialFocus,
  }: {
    initialFocus: 'first-item' | 'last-item'
  }) => {
    initialFocusTypeRef.current = initialFocus
    setOpen(true)
  }

  const closeMenu = () => {
    initialFocusTypeRef.current = 'first-item'
    setOpen(false)
  }

  const { isPresent: isContentPresent } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(contentId),
  })

  const openMenuCallbackRef = useLatestRef(openMenu)
  const closeMenuCallbackRef = useLatestRef(closeMenu)
  const activedescendantRef = useLatestRef(activedescendant)

  // 방향키 핸들링
  useEffect(() => {
    const triggerEl = document.getElementById(triggerId)
    if (!triggerEl) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (document.activeElement !== triggerEl) {
        return
      }

      if (!open) {
        if (event.key === 'ArrowDown') {
          openMenuCallbackRef.current({ initialFocus: 'first-item' })
        } else if (event.key === 'ArrowUp') {
          openMenuCallbackRef.current({ initialFocus: 'last-item' })
        }
        return
      }

      const contentEl = document.getElementById(contentId)
      if (!contentEl) {
        return
      }

      const menuItems = Array.from(
        contentEl.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      )
      const currentIndex = menuItems.findIndex(
        (item) => item.id === activedescendantRef.current,
      )

      if (currentIndex === -1) {
        return
      }

      if (event.key === 'ArrowDown') {
        const nextIndex = currentIndex + 1
        if (nextIndex >= menuItems.length) {
          return
        }

        setActivedescendant(menuItems[nextIndex].id)
      } else if (event.key === 'ArrowUp') {
        const previousIndex = currentIndex - 1
        if (previousIndex < 0) {
          return
        }

        setActivedescendant(menuItems[previousIndex].id)
      }
    }

    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [activedescendantRef, contentId, open, openMenuCallbackRef, triggerId])

  // 메뉴 열렸을 경우 초기 active descendant 설정
  useLayoutEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEl = document.getElementById(contentId)
    if (!contentEl) {
      return
    }

    const menuItems = Array.from(
      contentEl.querySelectorAll('[role="menuitem"]'),
    )

    if (initialFocusTypeRef.current === 'first-item') {
      setActivedescendant(menuItems[0]?.id)
    } else if (initialFocusTypeRef.current === 'last-item') {
      setActivedescendant(menuItems[menuItems.length - 1]?.id)
    }

    return () => {
      initialFocusTypeRef.current = 'first-item'
      setActivedescendant(undefined)
    }
  }, [contentId, isContentPresent])

  // ESC 키 누르면 메뉴 닫기
  useEffect(() => {
    if (!open || !activedescendant) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      closeMenuCallbackRef.current()
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [activedescendant, closeMenuCallbackRef, open])

  // 메뉴 열렸을 경우 탭 이동 방지
  useEffect(() => {
    if (!open) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return
      }
      event.preventDefault()
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [activedescendant, closeMenuCallbackRef, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handler = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLElement)) {
        return
      }

      // Content나 Trigger 내부 클릭은 무시
      if (
        event.target.closest(`#${contentId}`) ||
        event.target.closest(`#${triggerId}`)
      ) {
        return
      }

      closeMenuCallbackRef.current()
    }

    window.addEventListener('click', handler)
    return () => {
      window.removeEventListener('click', handler)
    }
  }, [closeMenuCallbackRef, contentId, open, triggerId])

  return (
    <MenuContext.Provider
      value={{
        open,
        openMenu,
        closeMenu,
        activedescendant,
        idRules: {
          rootId,
          triggerId,
          positionerId,
          positionerArrowId,
          contentId,
          actionItemId,
          linkItemId,
        },
        initialFocusType: initialFocusTypeRef.current,
      }}
    >
      {children}
    </MenuContext.Provider>
  )
}

export type TriggerProps = ComponentPropsWithoutRef<'button'>
export function Trigger({ children, onClick, ...rest }: TriggerProps) {
  const { open, openMenu, closeMenu, idRules } = useMenuContext()

  return (
    <button
      type="button"
      id={idRules.triggerId}
      onClick={(event) => {
        if (open) {
          closeMenu()
        } else {
          openMenu({ initialFocus: 'first-item' })
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

export type ContentProps = ComponentPropsWithoutRef<'div'>
export function Content({ children, ...rest }: ContentProps) {
  const { open, idRules, activedescendant } = useMenuContext()

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
      tabIndex={-1}
      id={idRules.contentId}
      aria-labelledby={idRules.triggerId}
      aria-activedescendant={activedescendant}
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
  const { idRules, closeMenu, activedescendant } = useMenuContext()
  const id = idRules.actionItemId(value)
  const isActive = activedescendant === id

  return (
    <button
      role="menuitem"
      type="button"
      id={id}
      data-active={isActive ? 'true' : undefined}
      onClick={(event) => {
        closeMenu()
        onClick?.(event)
      }}
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
  const { idRules, closeMenu, activedescendant } = useMenuContext()
  const id = idRules.linkItemId(value)
  const isActive = activedescendant === id

  return (
    <a
      role="menuitem"
      id={id}
      data-active={isActive ? 'true' : undefined}
      onClick={(event) => {
        closeMenu()
        onClick?.(event)
      }}
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
  Positioner,
  PositionerArrow,
  Content,
  ActionItem,
  LinkItem,
  Portal,
}

export default Menu
