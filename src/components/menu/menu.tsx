import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
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
  type MenuItem,
  type MenuId,
  type ItemId,
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

import {
  RegistryContext,
  useRegistryProvider,
  type RegistryContextValue,
} from '../../shell/use-registry'
import { createIdGenerator } from '../../core/id-core'
import { IdProvider, useDomId } from '../../shell/use-dom-id'
import { usePresence } from '../../hooks/usePresence'
import { useLatestRef } from '../../hooks/useLatestRef'
import { composeRefs } from '../../utils/composeRefs'
import { mergeProps } from '../../utils/mergeProps'

// ============================================
// Types
// ============================================

/**
 * Menu의 Part → Meta 매핑
 */
export type MenuPartMetaMap = {
  trigger: { menuId: MenuId }
  item: { menuId: MenuId }
  content: { menuId: MenuId }
  positioner: { menuId: MenuId }
  arrow: { menuId: MenuId }
}

export type MenuPart = keyof MenuPartMetaMap

type MenuContextValue = {
  state: MenuState
  setState: React.Dispatch<React.SetStateAction<MenuState>>
  getMenuItems: (menuId: MenuId) => MenuItem[]
  registry: RegistryContextValue<MenuPartMetaMap>
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

export function Root({
  children,
  menuId: menuIdProp,
  openedPath: openedPathProp,
  defaultOpenedPath,
  onOpenedPathChange,
}: RootProps) {
  // PartMetaMap 타입 전달로 타입 추론 활성화
  const registry = useRegistryProvider<MenuPartMetaMap>()

  const autoId = useId()
  const menuId = menuIdProp ?? autoId
  const getId = useMemo(() => createIdGenerator(`menu-${menuId}`), [menuId])

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

  // 이제 meta.menuId가 자동으로 타입 추론됨!
  const getMenuItems = useCallback(
    (targetMenuId: MenuId): MenuItem[] => {
      const nodes = registry.filterNodesByMeta('item', (meta) => {
        return meta.menuId === targetMenuId
      })
      return nodes.map((node) => ({
        id: node.id,
        menuId: node.meta.menuId,
      }))
    },
    [registry],
  )

  // 바깥 클릭 감지
  useEffect(() => {
    if (state.openedPath.length === 0) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return

      const elements = registry.getElements()
      for (const element of elements.values()) {
        if (element.contains(target)) {
          return
        }
      }

      setState(closeAll(state))
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [state, setState, registry])

  // 중앙 집중식 키보드 핸들러
  useEffect(() => {
    if (state.openedPath.length === 0) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeMenuId = getActiveMenuId(state)
      if (!activeMenuId) return

      const target = event.target as HTMLElement

      // 메뉴 콘텐츠 안에서 발생한 이벤트만 처리
      const contentElement = registry.getElement(activeMenuId, 'content')
      if (!contentElement?.contains(target)) {
        return
      }

      const items = getMenuItems(activeMenuId)
      const isSubMenuActive = isSubMenu(state, activeMenuId)
      const focusedId = state.focusedItemId

      // 현재 포커스된 아이템이 서브트리거인지 확인
      const isCurrentItemSubTrigger = focusedId
        ? state.openedPath.includes(focusedId)
        : false

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          const next = moveFocusDown(state, items)
          setState(next)
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          const next = moveFocusUp(state, items)
          setState(next)
          break
        }
        case 'ArrowRight': {
          if (isCurrentItemSubTrigger && focusedId) {
            event.preventDefault()
            setState(openMenu(state, focusedId, activeMenuId))
          }
          break
        }
        case 'ArrowLeft': {
          if (isSubMenuActive) {
            event.preventDefault()
            setState(closeMenuAndFocusTrigger(state, activeMenuId))
          }
          break
        }
        case 'Escape': {
          event.preventDefault()
          setState(closeMenuAndFocusTrigger(state, activeMenuId))
          break
        }
        case 'Tab': {
          if (event.shiftKey) {
            event.preventDefault()
            setState(closeMenuAndFocusTrigger(state, activeMenuId))
          } else {
            setState(closeAll(state))
          }
          break
        }
        case 'Home': {
          event.preventDefault()
          const next = moveFocusFirst(state, items)
          setState(next)
          break
        }
        case 'End': {
          event.preventDefault()
          const next = moveFocusLast(state, items)
          setState(next)
          break
        }
        case 'Enter':
        case ' ': {
          if (focusedId) {
            event.preventDefault()
            const el = registry.getElement(focusedId, 'item')
            el?.click()
          }
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [state, setState, getMenuItems, registry])

  // 포커스 동기화 (Tree 패턴)
  useEffect(() => {
    if (state.focusedItemId) {
      const element = registry.getElement(state.focusedItemId, 'item')
      element?.focus()
    }
  }, [state.focusedItemId, registry])

  const menuContextValue = useMemo<MenuContextValue>(
    () => ({ state, setState, getMenuItems, registry }),
    [state, setState, getMenuItems, registry],
  )

  const menuIdContextValue = useMemo<MenuIdContextValue>(
    () => ({ menuId, parentMenuId: null }),
    [menuId],
  )

  return (
    <IdProvider value={getId}>
      <RegistryContext.Provider value={registry}>
        <MenuContext.Provider value={menuContextValue}>
          <MenuIdContext.Provider value={menuIdContextValue}>
            {children}
          </MenuIdContext.Provider>
        </MenuContext.Provider>
      </RegistryContext.Provider>
    </IdProvider>
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
  ({ children, ...rest }, ref) => {
    const { state, setState, registry } = useMenuContext()
    const { menuId, parentMenuId } = useMenuIdContext()
    const domId = useDomId('trigger', menuId)

    const isOpen = isMenuOpen(state, menuId)

    // 마우스/터치 클릭: 토글
    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        // 키보드 포커스 후 마우스 클릭 시 기본 동작 방지
        e.preventDefault()

        if (isOpen) {
          setState(closeMenu(state, menuId))
        } else {
          setState(openMenu(state, menuId, parentMenuId))
        }
      },
      [isOpen, state, setState, menuId, parentMenuId],
    )

    // 키보드: 메뉴가 닫혀있을 때만 열기
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

    const refCallback = useCallback(
      (el: HTMLButtonElement | null) => {
        if (el)
          registry.register({
            id: menuId,
            part: 'trigger',
            element: el,
            meta: { menuId },
          })
        else registry.unregister(menuId, 'trigger')
      },
      [menuId, registry],
    )

    return (
      <button
        ref={composeRefs(ref, refCallback)}
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
  ({ children, ...rest }, ref) => {
    const { state, setState, registry } = useMenuContext()
    const { menuId, parentMenuId } = useMenuIdContext()
    const domId = useDomId('trigger', menuId)

    const isOpen = isMenuOpen(state, menuId)
    const isActiveInParent = state.focusedItemId === menuId

    const handleClick = useCallback(() => {
      if (isOpen) {
        setState(closeMenu(state, menuId))
      } else {
        setState(openMenu(state, menuId, parentMenuId))
      }
    }, [isOpen, state, setState, menuId, parentMenuId])

    // 서브트리거: 서브메뉴가 닫혀있을 때만 처리
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

    // SubTrigger는 trigger + item 둘 다 등록
    const refCallback = useCallback(
      (el: HTMLButtonElement | null) => {
        if (el) {
          registry.register({
            id: menuId,
            part: 'trigger',
            element: el,
            meta: { menuId },
          })
          if (parentMenuId) {
            registry.register({
              id: menuId,
              part: 'item',
              element: el,
              meta: { menuId: parentMenuId },
            })
          }
        } else {
          registry.unregister(menuId, 'trigger')
          if (parentMenuId) {
            registry.unregister(menuId, 'item')
          }
        }
      },
      [menuId, parentMenuId, registry],
    )

    return (
      <button
        ref={composeRefs(ref, refCallback)}
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
  ({ children, ...rest }, ref) => {
    const { state, setState, getMenuItems, registry } = useMenuContext()
    const { menuId } = useMenuIdContext()
    const domId = useDomId('content', menuId)

    const isOpen = isMenuOpen(state, menuId)

    const { isPresent, transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => registry.getElement(menuId, 'content'),
    })

    // 메뉴가 열릴 때 첫 아이템으로 포커스
    const hasInitialFocus = React.useRef(false)
    useLayoutEffect(() => {
      if (!isPresent) {
        hasInitialFocus.current = false
        return
      }

      if (hasInitialFocus.current) return
      hasInitialFocus.current = true

      // useLayoutEffect 시점에 아이템들이 이미 등록되어 있음 (React 렌더링 순서)
      const items = getMenuItems(menuId)
      if (items.length > 0) {
        setState((prev) => setFocus(prev, items[0].id))
      }
    }, [isPresent, menuId, setState, getMenuItems])

    const refCallback = useCallback(
      (el: HTMLDivElement | null) => {
        if (el)
          registry.register({
            id: menuId,
            part: 'content',
            element: el,
            meta: { menuId },
          })
        else registry.unregister(menuId, 'content')
      },
      [menuId, registry],
    )

    if (!isPresent) {
      return null
    }

    return (
      <div
        ref={composeRefs(ref, refCallback)}
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
  ({ children, value: itemId, ...rest }, ref) => {
    const { state, setState, registry } = useMenuContext()
    const { menuId } = useMenuIdContext()
    const domId = useDomId('item', itemId)

    const isActive = state.focusedItemId === itemId

    const handleClick = useCallback(() => {
      const rootMenuId = getRootMenuId(state)
      setState(closeAll(state))

      if (rootMenuId) {
        const rootTrigger = registry.getElement(rootMenuId, 'trigger')
        rootTrigger?.focus()
      }
    }, [state, setState, registry])

    const handleFocus = useCallback(() => {
      if (state.focusedItemId !== itemId) {
        setState(setFocus(state, itemId))
      }
    }, [state, setState, itemId])

    const refCallback = useCallback(
      (el: HTMLButtonElement | null) => {
        if (el)
          registry.register({
            id: itemId,
            part: 'item',
            element: el,
            meta: { menuId },
          })
        else registry.unregister(itemId, 'item')
      },
      [itemId, menuId, registry],
    )

    return (
      <button
        ref={composeRefs(ref, refCallback)}
        {...mergeProps(
          {
            role: 'menuitem',
            type: 'button',
            id: domId,
            tabIndex: isActive ? 0 : -1,
            onClick: handleClick,
            onFocus: handleFocus,
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
  ({ children, value: itemId, ...rest }, ref) => {
    const { state, setState, registry } = useMenuContext()
    const { menuId } = useMenuIdContext()
    const domId = useDomId('item', itemId)

    const isActive = state.focusedItemId === itemId

    const handleClick = useCallback(() => {
      const rootMenuId = getRootMenuId(state)
      setState(closeAll(state))

      if (rootMenuId) {
        const rootTrigger = registry.getElement(rootMenuId, 'trigger')
        rootTrigger?.focus()
      }
    }, [state, setState, registry])

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

    const refCallback = useCallback(
      (el: HTMLAnchorElement | null) => {
        if (el)
          registry.register({
            id: itemId,
            part: 'item',
            element: el,
            meta: { menuId },
          })
        else registry.unregister(itemId, 'item')
      },
      [itemId, menuId, registry],
    )

    return (
      <a
        ref={composeRefs(ref, refCallback)}
        {...mergeProps(
          {
            role: 'menuitem',
            id: domId,
            tabIndex: isActive ? 0 : -1,
            onClick: handleClick,
            onKeyDown: handleKeyDown,
            onFocus: handleFocus,
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
    ref,
  ) => {
    const { state, registry } = useMenuContext()
    const { menuId } = useMenuIdContext()
    const domId = useDomId('positioner', menuId)

    const isOpen = isMenuOpen(state, menuId)

    const { isPresent } = usePresence({
      isVisible: isOpen,
      resolveElement: () => registry.getElement(menuId, 'positioner'),
    })

    const flipOptionsRef = useLatestRef(flipOptions)
    const shiftOptionsRef = useLatestRef(shiftOptions)

    // 위치 계산
    useLayoutEffect(() => {
      if (!isPresent) return

      const triggerEl = registry.getElement(menuId, 'trigger')
      const positionerEl = registry.getElement(menuId, 'positioner')
      if (!triggerEl || !positionerEl) return

      const arrowEl = registry.getElement(menuId, 'arrow')

      function positionUpdate() {
        if (!triggerEl || !positionerEl) return

        computePosition(triggerEl, positionerEl, {
          placement,
          middleware: [
            offset(offsetOption),
            flip(flipOptionsRef.current),
            shift(shiftOptionsRef.current),
            ...(arrowEl ? [arrow({ element: arrowEl })] : []),
          ],
        }).then(({ x, y, middlewareData }) => {
          Object.assign(positionerEl.style, {
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
      registry,
      menuId,
      placement,
      flipOptionsRef,
      shiftOptionsRef,
      offsetOption,
      arrowOffsetOption,
    ])

    const refCallback = useCallback(
      (el: HTMLDivElement | null) => {
        if (el)
          registry.register({
            id: menuId,
            part: 'positioner',
            element: el,
            meta: { menuId },
          })
        else registry.unregister(menuId, 'positioner')
      },
      [menuId, registry],
    )

    if (!isPresent) {
      return null
    }

    return (
      <div
        ref={composeRefs(ref, refCallback)}
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
  ({ children, ...rest }, ref) => {
    const { state, registry } = useMenuContext()
    const { menuId } = useMenuIdContext()
    const domId = useDomId('arrow', menuId)

    const isOpen = isMenuOpen(state, menuId)

    const { transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => registry.getElement(menuId, 'arrow'),
    })

    const refCallback = useCallback(
      (el: HTMLDivElement | null) => {
        if (el)
          registry.register({
            id: menuId,
            part: 'arrow',
            element: el,
            meta: { menuId },
          })
        else registry.unregister(menuId, 'arrow')
      },
      [menuId, registry],
    )

    return (
      <div
        ref={composeRefs(ref, refCallback)}
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
