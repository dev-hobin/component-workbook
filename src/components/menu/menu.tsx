import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
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

import {
  type MenuState,
  type MenuStatus,
  type MenuEffect,
  type MenuItem,
  type MenuId,
  type ItemId,
  deriveStatus,
  getEffectsOnStatusChange,
  getEffectsOnFocusChange,
  openMenu,
  closeMenu,
  closeAll,
  isMenuOpen,
  getRootMenuId,
  getActiveMenuId,
  isSubMenu,
  setFocus,
  moveFocusDown,
  moveFocusUp,
  moveFocusFirst,
  moveFocusLast,
  closeMenuAndFocusTrigger,
} from './core'

import { usePresence } from '../../hooks/usePresence'
import { useLatestRef } from '../../hooks/useLatestRef'
import { composeRefs } from '../../utils/composeRefs'
import { mergeProps } from '../../utils/mergeProps'

import {
  ComponentStoreProvider,
  useComponentStore,
} from '../../shell/use-component-store'
import { useNode } from '../../shell/use-node'
import type { ComponentStore } from '../../core/component-store'

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
  state: MenuState
  setState: React.Dispatch<React.SetStateAction<MenuState>>
  getMenuItems: (menuId: MenuId) => MenuItem[]
  store: ComponentStore<MenuRole, MenuMeta>
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
    <ComponentStoreProvider>
      <RootInner {...props} />
    </ComponentStoreProvider>
  )
}

function RootInner({
  children,
  menuId: menuIdProp,
  openedPath: openedPathProp,
  defaultOpenedPath,
  onOpenedPathChange,
}: RootProps) {
  const { store } = useComponentStore<MenuRole, MenuMeta>()

  const autoId = useId()
  const menuId = menuIdProp ?? autoId

  const [openedPath, setOpenedPath] = useControllableState({
    prop: openedPathProp,
    defaultProp: defaultOpenedPath ?? [],
    onChange: onOpenedPathChange,
  })

  const [focusedItemId, setFocusedItemId] = React.useState<ItemId | null>(null)

  const state: MenuState = useMemo(
    () => ({ openedPath, focusedItemId }),
    [openedPath, focusedItemId],
  )

  const setState: React.Dispatch<React.SetStateAction<MenuState>> = useCallback(
    (action) => {
      const nextState = typeof action === 'function' ? action(state) : action
      if (nextState.openedPath !== state.openedPath) {
        setOpenedPath(nextState.openedPath)
      }
      if (nextState.focusedItemId !== state.focusedItemId) {
        setFocusedItemId(nextState.focusedItemId)
      }
    },
    [state, setOpenedPath],
  )

  const getMenuItems = useCallback(
    (targetMenuId: MenuId): MenuItem[] => {
      const nodes = store.filterNodesByRolesAndMeta(
        ['item', 'subtrigger'],
        (meta) => meta.menuId === targetMenuId,
      )
      return nodes.map((node) => ({
        id: node.id,
        menuId: node.meta.menuId,
      }))
    },
    [store],
  )

  // Status 파생
  const status: MenuStatus = deriveStatus(state)
  const prevStatusRef = useRef<MenuStatus>('idle')
  const prevFocusedItemIdRef = useRef<ItemId | null>(null)

  // 최신 값 refs
  const stateRef = useLatestRef(state)
  const setStateRef = useLatestRef(setState)
  const getMenuItemsRef = useLatestRef(getMenuItems)

  // 안정적인 이벤트 핸들러 refs (한 번만 생성, 내부에서 최신 ref 참조)
  const handlersRef = useRef({
    outsideClick: (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return

      const elements = store.getAllElements()
      for (const element of elements.values()) {
        if (element.contains(target)) return
      }

      setStateRef.current(closeAll(stateRef.current))
    },
    keyDown: (event: KeyboardEvent) => {
      const currentState = stateRef.current
      const activeMenuId = getActiveMenuId(currentState)
      if (!activeMenuId) return

      const target = event.target as HTMLElement
      const contentElement = store.getElement(activeMenuId, 'content')
      if (!contentElement?.contains(target)) return

      const items = getMenuItemsRef.current(activeMenuId)
      const isSubMenuActive = isSubMenu(currentState, activeMenuId)
      const focusedId = currentState.focusedItemId
      const isCurrentItemSubTrigger = focusedId
        ? currentState.openedPath.includes(focusedId)
        : false

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          setStateRef.current(moveFocusDown(currentState, items))
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          setStateRef.current(moveFocusUp(currentState, items))
          break
        }
        case 'ArrowRight': {
          if (isCurrentItemSubTrigger && focusedId) {
            event.preventDefault()
            setStateRef.current(openMenu(currentState, focusedId, activeMenuId))
          }
          break
        }
        case 'ArrowLeft': {
          if (isSubMenuActive) {
            event.preventDefault()
            setStateRef.current(
              closeMenuAndFocusTrigger(currentState, activeMenuId),
            )
          }
          break
        }
        case 'Escape': {
          event.preventDefault()
          setStateRef.current(
            closeMenuAndFocusTrigger(currentState, activeMenuId),
          )
          break
        }
        case 'Tab': {
          if (event.shiftKey) {
            event.preventDefault()
            setStateRef.current(
              closeMenuAndFocusTrigger(currentState, activeMenuId),
            )
          } else {
            setStateRef.current(closeAll(currentState))
          }
          break
        }
        case 'Home': {
          event.preventDefault()
          setStateRef.current(moveFocusFirst(currentState, items))
          break
        }
        case 'End': {
          event.preventDefault()
          setStateRef.current(moveFocusLast(currentState, items))
          break
        }
        case 'Enter':
        case ' ': {
          if (focusedId) {
            event.preventDefault()
            const el =
              store.getElement(focusedId, 'item') ??
              store.getElement(focusedId, 'subtrigger')
            el?.click()
          }
          break
        }
      }
    },
  })

  // Effect 실행 함수
  const runEffect = useCallback(
    (effect: MenuEffect) => {
      const handlers = handlersRef.current
      switch (effect.type) {
        case 'ADD_OUTSIDE_CLICK_LISTENER':
          document.addEventListener('pointerdown', handlers.outsideClick, true)
          break
        case 'REMOVE_OUTSIDE_CLICK_LISTENER':
          document.removeEventListener(
            'pointerdown',
            handlers.outsideClick,
            true,
          )
          break
        case 'ADD_KEYBOARD_LISTENER':
          document.addEventListener('keydown', handlers.keyDown)
          break
        case 'REMOVE_KEYBOARD_LISTENER':
          document.removeEventListener('keydown', handlers.keyDown)
          break
        case 'FOCUS_ITEM': {
          const element =
            store.getElement(effect.itemId, 'item') ??
            store.getElement(effect.itemId, 'subtrigger')
          element?.focus()
          break
        }
      }
    },
    [store],
  )

  // Status 전환 시 효과 실행
  useLayoutEffect(() => {
    const effects = getEffectsOnStatusChange(prevStatusRef.current, status)
    effects.forEach(runEffect)
    prevStatusRef.current = status
  }, [status, runEffect])

  // Focus 변경 시 효과 실행
  useLayoutEffect(() => {
    const effects = getEffectsOnFocusChange(
      prevFocusedItemIdRef.current,
      state.focusedItemId,
    )
    effects.forEach(runEffect)
    prevFocusedItemIdRef.current = state.focusedItemId
  }, [state.focusedItemId, runEffect])

  // 언마운트 시 리소스 정리
  useEffect(() => {
    const handlers = handlersRef.current
    return () => {
      document.removeEventListener('pointerdown', handlers.outsideClick, true)
      document.removeEventListener('keydown', handlers.keyDown)
      prevStatusRef.current = 'idle'
      prevFocusedItemIdRef.current = null
    }
  }, [])

  const menuContextValue = useMemo<MenuContextValue>(
    () => ({ state, setState, getMenuItems, store }),
    [state, setState, getMenuItems, store],
  )

  const menuIdContextValue = useMemo<MenuIdContextValue>(
    () => ({ menuId, parentMenuId: null }),
    [menuId],
  )

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

  const menuIdContextValue = useMemo<MenuIdContextValue>(
    () => ({ menuId, parentMenuId: parentContext.menuId }),
    [menuId, parentContext.menuId],
  )

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
    const { state, setState } = useMenuContext()
    const { menuId, parentMenuId } = useMenuIdContext()

    const { ref, domId } = useNode<MenuRole, MenuMeta>({
      role: 'trigger',
      id: menuId,
      meta: { menuId },
    })

    const isOpen = isMenuOpen(state, menuId)

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        e.preventDefault()

        if (isOpen) {
          setState(closeMenu(state, menuId))
        } else {
          setState(openMenu(state, menuId, parentMenuId))
        }
      },
      [isOpen, state, setState, menuId, parentMenuId],
    )

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (isOpen) return

        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setState(openMenu(state, menuId, parentMenuId))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setState(openMenu(state, menuId, parentMenuId))
        }
      },
      [isOpen, state, setState, menuId, parentMenuId],
    )

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
    const { state, setState } = useMenuContext()
    const { menuId, parentMenuId } = useMenuIdContext()

    // subtrigger role로 등록 (부모 메뉴의 menuId를 meta에 저장)
    const { ref, domId } = useNode<MenuRole, MenuMeta>({
      role: 'subtrigger',
      id: menuId,
      meta: { menuId: parentMenuId! },
    })

    const isOpen = isMenuOpen(state, menuId)
    const isActiveInParent = state.focusedItemId === menuId

    const handleClick = useCallback(() => {
      if (isOpen) {
        setState(closeMenu(state, menuId))
      } else {
        setState(openMenu(state, menuId, parentMenuId))
      }
    }, [isOpen, state, setState, menuId, parentMenuId])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (isOpen) return

        if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setState(openMenu(state, menuId, parentMenuId))
        }
      },
      [isOpen, state, setState, menuId, parentMenuId],
    )

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
    const { state, setState, getMenuItems } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const { ref, domId, elementRef } = useNode<MenuRole, MenuMeta>({
      role: 'content',
      id: menuId,
      meta: { menuId },
    })

    const isOpen = isMenuOpen(state, menuId)

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

      const items = getMenuItems(menuId)
      if (items.length > 0) {
        setState((prev) => setFocus(prev, items[0].id))
      }
    }, [isPresent, menuId, setState, getMenuItems])

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
    const { state, setState, store } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const { ref, domId } = useNode<MenuRole, MenuMeta>({
      role: 'item',
      id: itemId,
      meta: { menuId },
    })

    const isActive = state.focusedItemId === itemId

    const handleClick = useCallback(() => {
      const rootMenuId = getRootMenuId(state)
      setState(closeAll(state))

      if (rootMenuId) {
        const rootTrigger = store.getElement(rootMenuId, 'trigger')
        rootTrigger?.focus()
      }
    }, [state, setState, store])

    const handleFocus = useCallback(() => {
      if (state.focusedItemId !== itemId) {
        setState(setFocus(state, itemId))
      }
    }, [state, setState, itemId])

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
    const { state, setState, store } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const { ref, domId } = useNode<MenuRole, MenuMeta>({
      role: 'item',
      id: itemId,
      meta: { menuId },
    })

    const isActive = state.focusedItemId === itemId

    const handleClick = useCallback(() => {
      const rootMenuId = getRootMenuId(state)
      setState(closeAll(state))

      if (rootMenuId) {
        const rootTrigger = store.getElement(rootMenuId, 'trigger')
        rootTrigger?.focus()
      }
    }, [state, setState, store])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        ;(e.currentTarget as HTMLAnchorElement).click()
      }
    }, [])

    const handleFocus = useCallback(() => {
      if (state.focusedItemId !== itemId) {
        setState(setFocus(state, itemId))
      }
    }, [state, setState, itemId])

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
    const { state, store } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const { ref, domId, elementRef } = useNode<MenuRole, MenuMeta>({
      role: 'positioner',
      id: menuId,
      meta: { menuId },
    })

    const isOpen = isMenuOpen(state, menuId)

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
    const { state } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const { ref, domId, elementRef } = useNode<MenuRole, MenuMeta>({
      role: 'arrow',
      id: menuId,
      meta: { menuId },
    })

    const isOpen = isMenuOpen(state, menuId)

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
