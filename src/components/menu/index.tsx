import { useControllableState } from '@radix-ui/react-use-controllable-state'
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
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
      openMenu: () => void
      closeMenu: () => void
      idRules: {
        rootId: string
        triggerId: string
        subTriggerId: string
        positionerId: string
        positionerArrowId: string
        contentId: string
        subContentId: string
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
  const subTriggerId = idRules?.subTriggerId ?? `${rootId}-subtrigger`
  const positionerId = idRules?.positionerId ?? `${rootId}-positioner`
  const positionerArrowId =
    idRules?.positionerArrowId ?? `${rootId}-positioner-arrow`
  const contentId = idRules?.contentId ?? `${rootId}-content`
  const subContentId = idRules?.subContentId ?? `${rootId}-subcontent`
  const actionItemId =
    idRules?.actionItemId ?? ((value) => `${rootId}-action-item-${value}`)
  const linkItemId =
    idRules?.linkItemId ?? ((value) => `${rootId}-link-item-${value}`)

  const [open, setOpen] = useControllableState({
    prop: openProp,
    onChange: onOpenChange,
    defaultProp: defaultOpen ?? false,
  })

  const openMenu = () => {
    setOpen(true)
  }

  const closeMenu = () => {
    setOpen(false)
  }

  return (
    <MenuContext.Provider
      value={{
        open,
        openMenu,
        closeMenu,
        idRules: {
          rootId,
          triggerId,
          subTriggerId,
          positionerId,
          positionerArrowId,
          contentId,
          subContentId,
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
          openMenu()
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
          openMenu()
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
  const { idRules, closeMenu } = useMenuContext()
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
  const { idRules, closeMenu } = useMenuContext()
  const id = idRules.linkItemId(value)

  return (
    <a
      role="menuitem"
      id={id}
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
