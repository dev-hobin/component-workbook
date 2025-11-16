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

  return (
    <MenuContext.Provider
      value={{
        open,
        openMenu,
        closeMenu,
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

  return (
    <button
      type="button"
      id={idRules.triggerId}
      onClick={(event) => {
        if (open) {
          closeMenu()
        } else {
          openMenu()
        }
        onClick?.(event)
      }}
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
  const { open, idRules } = useMenuContext()

  const { isPresent } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(idRules.contentId),
  })

  if (!isPresent) {
    return null
  }

  return (
    <div id={idRules.contentId} {...rest}>
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
export function ActionItem({ children, value, ...rest }: ActionItemProps) {
  const { idRules } = useMenuContext()

  return (
    <button type="button" id={idRules.actionItemId(value)} {...rest}>
      {children}
    </button>
  )
}

export type LinkItemProps = Omit<ComponentPropsWithoutRef<'a'>, 'value'> & {
  value: string
}
export function LinkItem({ children, value, ...rest }: LinkItemProps) {
  const { idRules } = useMenuContext()

  return (
    <a id={idRules.linkItemId(value)} {...rest}>
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
