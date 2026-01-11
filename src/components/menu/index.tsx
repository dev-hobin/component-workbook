import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import {
  arrow,
  computePosition,
  flip,
  offset,
  shift,
  autoUpdate,
  type Placement,
} from '@floating-ui/dom'
import { useEventMachine, type Send } from '../../event-machine'

import {
  menuMachine,
  isMenuOpen,
  type MenuEvents,
  type MenuComputed,
  type MenuId,
  type ItemId,
} from './machine'

import { usePresence } from '../../hooks/use-presence'
import { useLatestRef } from '../../hooks/use-latest-ref'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'

import {
  NodeStoreProvider,
  useNodeStore,
} from '../../primitives/use-node-store'
import { useNode } from '../../primitives/use-node'
import type { NodeStore } from '../../primitives/node-store'

// ============================================
// Types
// ============================================

type MenuRole =
  | 'trigger'
  | 'subtrigger'
  | 'item'
  | 'content'
  | 'positioner'
  | 'arrow'

type MenuMeta = {
  menuId: MenuId
}

type MenuContextValue = {
  openedPath: MenuId[]
  focusedItemId: ItemId | null
  computed: MenuComputed
  send: Send<MenuEvents>
  store: NodeStore<MenuRole, MenuMeta>
}

type MenuIdContextValue = {
  menuId: MenuId
  parentMenuId: MenuId | null
}

// ============================================
// Contexts
// ============================================

const MenuContext = createContext<MenuContextValue | null>(null)
const MenuIdContext = createContext<MenuIdContextValue | null>(null)

function useMenuContext() {
  const context = useContext(MenuContext)
  if (!context) {
    throw new Error('Menu 컴포넌트는 Menu.Root 안에서 사용해야 합니다.')
  }
  return context
}

function useMenuIdContext() {
  const context = useContext(MenuIdContext)
  if (!context) {
    throw new Error('Menu 컴포넌트는 Menu.Root 안에서 사용해야 합니다.')
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  menuId?: string

  // Controlled
  openedPath?: MenuId[]
  defaultOpenedPath?: MenuId[]
  onOpenedPathChange?: (path: MenuId[]) => void
}

export function Root(props: RootProps) {
  return (
    <NodeStoreProvider>
      <RootInner {...props} />
    </NodeStoreProvider>
  )
}

function RootInner({
  children,
  menuId: menuIdProp,
  openedPath: openedPathProp,
  defaultOpenedPath,
  onOpenedPathChange,
}: RootProps) {
  const store = useNodeStore<MenuRole, MenuMeta>()

  const autoId = useId()
  const menuId = menuIdProp ?? autoId

  const [openedPath = [], setOpenedPath] = useControllableState({
    prop: openedPathProp,
    defaultProp: defaultOpenedPath ?? [],
    onChange: onOpenedPathChange,
  })

  const [focusedItemId, setFocusedItemId] = useState<ItemId | null>(null)

  // Event machine
  const { send, computed } = useEventMachine(menuMachine, {
    openedPath,
    focusedItemId,
    onOpenedPathChange: setOpenedPath,
    onFocusedItemIdChange: setFocusedItemId,
    getActiveMenuItems: () => {
      const activeId = openedPath[openedPath.length - 1]
      if (!activeId) return []
      const nodes = store.filterNodesByRolesAndMeta(
        ['item', 'subtrigger'],
        (meta) => meta.menuId === activeId,
      )
      return nodes.map((node) => ({
        id: node.id,
        menuId: node.meta.menuId,
      }))
    },
    isItemSubTrigger: (itemId: ItemId) => openedPath.includes(itemId),
    getItemElement: (itemId: ItemId) =>
      store.getElement(itemId, 'item') ??
      store.getElement(itemId, 'subtrigger'),
    getTriggerElement: (targetMenuId: MenuId) =>
      store.getElement(targetMenuId, 'trigger'),
    getAllElements: () => store.getAllElements(),
  })

  const menuContextValue: MenuContextValue = {
    openedPath,
    focusedItemId,
    computed,
    send,
    store,
  }

  const menuIdContextValue: MenuIdContextValue = {
    menuId,
    parentMenuId: null,
  }

  return (
    <MenuContext.Provider value={menuContextValue}>
      <MenuIdContext.Provider value={menuIdContextValue}>
        {children}
      </MenuIdContext.Provider>
    </MenuContext.Provider>
  )
}

// ============================================
// SubRoot
// ============================================

export type SubRootProps = {
  children: React.ReactNode
  menuId?: string
}

export function SubRoot({ children, menuId: menuIdProp }: SubRootProps) {
  const parentContext = useMenuIdContext()
  const autoId = useId()
  const menuId = menuIdProp ?? autoId

  const menuIdContextValue: MenuIdContextValue = {
    menuId,
    parentMenuId: parentContext.menuId,
  }

  return (
    <MenuIdContext.Provider value={menuIdContextValue}>
      {children}
    </MenuIdContext.Provider>
  )
}

// ============================================
// Trigger
// ============================================

export type TriggerProps = ComponentPropsWithoutRef<'button'>

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { openedPath, send } = useMenuContext()
    const { menuId, parentMenuId } = useMenuIdContext()

    const { ref, domId } = useNode<MenuRole, MenuMeta>({
      role: 'trigger',
      id: menuId,
      meta: { menuId },
    })

    const isOpen = isMenuOpen(openedPath, menuId)

    const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault()

      if (isOpen) {
        send('CLOSE_MENU', { menuId })
      } else {
        send('OPEN_MENU', { menuId, parentMenuId })
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isOpen) return

      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        send('OPEN_MENU', { menuId, parentMenuId })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        send('OPEN_MENU', { menuId, parentMenuId })
      }
    }

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            type: 'button',
            id: domId,
            onPointerDown: handlePointerDown,
            onKeyDown: handleKeyDown,
            'aria-haspopup': 'menu',
            'aria-expanded': isOpen,
            'aria-controls': isOpen ? `menu-content-${menuId}` : undefined,
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
// SubTrigger
// ============================================

export type SubTriggerProps = ComponentPropsWithoutRef<'button'>

export const SubTrigger = forwardRef<HTMLButtonElement, SubTriggerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { openedPath, focusedItemId, send } = useMenuContext()
    const { menuId, parentMenuId } = useMenuIdContext()

    // subtrigger role로 등록 (부모 메뉴의 menuId를 meta에 저장)
    const { ref, domId } = useNode<MenuRole, MenuMeta>({
      role: 'subtrigger',
      id: menuId,
      meta: { menuId: parentMenuId! },
    })

    const isOpen = isMenuOpen(openedPath, menuId)
    const isActiveInParent = focusedItemId === menuId

    const handleClick = () => {
      if (isOpen) {
        send('CLOSE_MENU', { menuId })
      } else {
        send('OPEN_MENU', { menuId, parentMenuId })
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isOpen) return

      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        send('OPEN_MENU', { menuId, parentMenuId })
      }
    }

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'menuitem',
            type: 'button',
            id: domId,
            onClick: handleClick,
            onKeyDown: handleKeyDown,
            tabIndex: isActiveInParent ? 0 : -1,
            'aria-haspopup': 'menu',
            'aria-expanded': isOpen,
            'data-active': isActiveInParent,
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

export type ContentProps = ComponentPropsWithoutRef<'div'>

export const Content = forwardRef<HTMLDivElement, ContentProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { openedPath, focusedItemId, send, store } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const { ref, domId, elementRef } = useNode<MenuRole, MenuMeta>({
      role: 'content',
      id: menuId,
      meta: { menuId },
    })

    const isOpen = isMenuOpen(openedPath, menuId)

    const { isPresent, transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => elementRef.current,
    })

    // 메뉴가 열릴 때 첫 아이템으로 포커스
    const hasInitialFocus = useRef(false)
    useLayoutEffect(() => {
      if (!isPresent) {
        hasInitialFocus.current = false
        return
      }

      if (hasInitialFocus.current) return
      hasInitialFocus.current = true

      // 약간의 딜레이 후 첫 아이템으로 포커스
      requestAnimationFrame(() => {
        send('FOCUS_FIRST')
      })
    }, [isPresent, send])

    // 키보드 핸들러
    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          send('FOCUS_NEXT')
          break
        case 'ArrowUp':
          e.preventDefault()
          send('FOCUS_PREV')
          break
        case 'ArrowRight':
          e.preventDefault()
          send('OPEN_SUBMENU')
          break
        case 'ArrowLeft':
          e.preventDefault()
          send('CLOSE_SUBMENU')
          break
        case 'Escape':
          e.preventDefault()
          send('CLOSE_AND_FOCUS_TRIGGER', { menuId })
          break
        case 'Tab':
          if (e.shiftKey) {
            e.preventDefault()
            send('CLOSE_AND_FOCUS_TRIGGER', { menuId })
          } else {
            send('CLOSE_ALL')
          }
          break
        case 'Home':
          e.preventDefault()
          send('FOCUS_FIRST')
          break
        case 'End':
          e.preventDefault()
          send('FOCUS_LAST')
          break
        case 'Enter':
        case ' ': {
          if (focusedItemId) {
            e.preventDefault()
            const el =
              store.getElement(focusedItemId, 'item') ??
              store.getElement(focusedItemId, 'subtrigger')
            el?.click()
          }
          break
        }
      }
    }

    if (!isPresent) {
      return null
    }

    return (
      <div
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'menu',
            id: domId,
            onKeyDown: handleKeyDown,
            'data-transition': transitionState,
          },
          rest,
        )}
      >
        {children}
      </div>
    )
  },
)

// SubContent는 Content와 동일하게 동작
export const SubContent = Content

// ============================================
// ActionItem
// ============================================

export type ActionItemProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'value'
> & {
  value: string
}

export const ActionItem = forwardRef<HTMLButtonElement, ActionItemProps>(
  ({ children, value: itemId, ...rest }, forwardedRef) => {
    const { focusedItemId, computed, send, store } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const { ref, domId } = useNode<MenuRole, MenuMeta>({
      role: 'item',
      id: itemId,
      meta: { menuId },
    })

    const isActive = focusedItemId === itemId

    const handleClick = () => {
      send('CLOSE_ALL')

      if (computed.rootMenuId) {
        const rootTrigger = store.getElement(computed.rootMenuId, 'trigger')
        rootTrigger?.focus()
      }
    }

    const handleFocus = () => {
      if (focusedItemId !== itemId) {
        send('SET_FOCUS', { itemId })
      }
    }

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'menuitem',
            type: 'button',
            id: domId,
            tabIndex: isActive ? 0 : -1,
            onClick: handleClick,
            onFocus: handleFocus,
            'data-active': isActive,
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
// LinkItem
// ============================================

export type LinkItemProps = Omit<ComponentPropsWithoutRef<'a'>, 'value'> & {
  value: string
}

export const LinkItem = forwardRef<HTMLAnchorElement, LinkItemProps>(
  ({ children, value: itemId, ...rest }, forwardedRef) => {
    const { focusedItemId, computed, send, store } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const { ref, domId } = useNode<MenuRole, MenuMeta>({
      role: 'item',
      id: itemId,
      meta: { menuId },
    })

    const isActive = focusedItemId === itemId

    const handleClick = () => {
      send('CLOSE_ALL')

      if (computed.rootMenuId) {
        const rootTrigger = store.getElement(computed.rootMenuId, 'trigger')
        rootTrigger?.focus()
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        ;(e.currentTarget as HTMLAnchorElement).click()
      }
    }

    const handleFocus = () => {
      if (focusedItemId !== itemId) {
        send('SET_FOCUS', { itemId })
      }
    }

    return (
      <a
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'menuitem',
            id: domId,
            tabIndex: isActive ? 0 : -1,
            onClick: handleClick,
            onKeyDown: handleKeyDown,
            onFocus: handleFocus,
            'data-active': isActive,
          },
          rest,
        )}
      >
        {children}
      </a>
    )
  },
)

// ============================================
// Positioner
// ============================================

export type PositionerProps = {
  placement?: Placement
  flipOptions?: Parameters<typeof flip>[0]
  shiftOptions?: Parameters<typeof shift>[0]
  offset?: number
  arrowOffset?: number
} & ComponentPropsWithoutRef<'div'>

export const Positioner = forwardRef<HTMLDivElement, PositionerProps>(
  (
    {
      children,
      placement = 'bottom',
      flipOptions,
      shiftOptions,
      offset: offsetOption = 0,
      arrowOffset: arrowOffsetOption = 4,
      ...rest
    },
    forwardedRef,
  ) => {
    const { openedPath, store } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const { ref, domId, elementRef } = useNode<MenuRole, MenuMeta>({
      role: 'positioner',
      id: menuId,
      meta: { menuId },
    })

    const isOpen = isMenuOpen(openedPath, menuId)

    const { isPresent } = usePresence({
      isVisible: isOpen,
      resolveElement: () => elementRef.current,
    })

    const flipOptionsRef = useLatestRef(flipOptions)
    const shiftOptionsRef = useLatestRef(shiftOptions)

    // 위치 계산
    useLayoutEffect(() => {
      if (!isPresent) return

      const triggerEl =
        store.getElement(menuId, 'trigger') ??
        store.getElement(menuId, 'subtrigger')
      const positionerEl = store.getElement(menuId, 'positioner')
      if (!triggerEl || !positionerEl) return

      const arrowEl = store.getElement(menuId, 'arrow')

      function positionUpdate() {
        computePosition(triggerEl!, positionerEl!, {
          placement,
          middleware: [
            offset(offsetOption),
            flip(flipOptionsRef.current),
            shift(shiftOptionsRef.current),
            ...(arrowEl ? [arrow({ element: arrowEl })] : []),
          ],
        }).then(({ x, y, middlewareData }) => {
          Object.assign(positionerEl!.style, {
            left: `${x}px`,
            top: `${y}px`,
          })

          const arrowData = middlewareData.arrow
          if (!arrowData || !arrowEl) return

          const { x: arrowX, y: arrowY } = arrowData
          const staticSide = {
            top: 'bottom',
            right: 'left',
            bottom: 'top',
            left: 'right',
          }[placement.split('-')[0]]

          Object.assign(arrowEl.style, {
            left: arrowX != null ? `${arrowX}px` : '',
            top: arrowY != null ? `${arrowY}px` : '',
            right: '',
            bottom: '',
            [staticSide as keyof CSSProperties]: `-${arrowOffsetOption}px`,
          })
        })
      }

      const cleanup = autoUpdate(triggerEl, positionerEl, positionUpdate)
      return () => cleanup()
    }, [
      isPresent,
      store,
      menuId,
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
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            id: domId,
            style: {
              width: 'max-content',
              position: 'absolute' as const,
              top: 0,
              left: 0,
            },
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
// PositionerArrow
// ============================================

export type PositionerArrowProps = ComponentPropsWithoutRef<'div'>

export const PositionerArrow = forwardRef<HTMLDivElement, PositionerArrowProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { openedPath } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const { ref, domId, elementRef } = useNode<MenuRole, MenuMeta>({
      role: 'arrow',
      id: menuId,
      meta: { menuId },
    })

    const isOpen = isMenuOpen(openedPath, menuId)

    const { transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => elementRef.current,
    })

    return (
      <div
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            id: domId,
            style: {
              position: 'absolute' as const,
              width: 8,
              height: 8,
              transform: 'rotate(45deg)',
            },
            'data-transition': transitionState,
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
// Portal
// ============================================

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

// ============================================
// Export
// ============================================

const Menu = {
  Root,
  SubRoot,
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
