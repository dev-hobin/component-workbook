import { useControllableState } from '@radix-ui/react-use-controllable-state'
import {
  createContext,
  useCallback,
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
import { MenuSystem } from './system'

type MenuContextValue = {
  rootId: string
  open: boolean
  openMenu: ({
    initialFocusType,
  }: {
    initialFocusType: 'first-item' | 'last-item'
  }) => void
  closeMenu: () => void
  activeItemId: string | null
  setActiveItemId: (itemId: string | null) => void
}

const MenuContext = createContext<
  (MenuContextValue & { parentMenuContext?: MenuContextValue }) | undefined
>(undefined)

type MenuTreeContextValue = {
  openPath: string[]
  setOpenPath: React.Dispatch<React.SetStateAction<string[]>>
}

const MenuTreeContext = createContext<MenuTreeContextValue | undefined>(
  undefined,
)

function useMenuContext() {
  const context = useContext(MenuContext)
  if (!context) {
    throw new Error('useMenuContext must be used within a Menu.Root')
  }
  return context
}

function useMenuTreeContext() {
  const context = useContext(MenuTreeContext)
  if (!context) {
    throw new Error('useMenuTreeContext must be used within a Menu.Root')
  }
  return context
}

export type RootProps = {
  menuId?: string
  // 트리 전체(openPath) 제어용 – TopRoot에서만 의미 있음
  openPath?: string[]
  defaultOpenPath?: string[]
  onOpenPathChange?: (path: string[]) => void
  children: React.ReactNode
}

export function Root(props: RootProps) {
  const tree = useContext(MenuTreeContext)

  // 아직 트리 컨텍스트가 없으면 → 이 Root가 최상위
  if (!tree) {
    return (
      <MenuSystem.Provider>
        <TopRoot {...props} />
      </MenuSystem.Provider>
    )
  }

  // 이미 트리 안에서 호출된 Root → 서브메뉴용 Root
  return <SubRoot {...props} />
}

function TopRoot({
  openPath: openPathProp,
  defaultOpenPath,
  onOpenPathChange,
  ...rest
}: RootProps) {
  const [openPath, setOpenPath] = useControllableState<string[]>({
    prop: openPathProp,
    defaultProp: defaultOpenPath ?? [],
    onChange: onOpenPathChange,
  })

  return (
    <MenuTreeContext.Provider value={{ openPath, setOpenPath }}>
      {/* TopRoot 자신도 SubRoot를 통해 렌더링하는 게 핵심 */}
      <SubRoot {...rest} />
    </MenuTreeContext.Provider>
  )
}

export function SubRoot({ children, menuId }: RootProps) {
  const parentMenuContext = useContext(MenuContext)
  const tree = useMenuTreeContext()
  const registry = MenuSystem.useCompositeRegistry()

  const isTopLevel = !parentMenuContext
  const isSubMenu = !!parentMenuContext

  const autoId = useId()
  const rootId = menuId ?? autoId

  const initialFocusTypeRef = useRef<'first-item' | 'last-item' | null>(null)

  const open = isTopLevel
    ? tree.openPath.length > 0 && tree.openPath[0] === rootId // 루트는 경로의 첫 요소
    : tree.openPath.includes(rootId)

  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  const getMenuItemEntries = useCallback(() => {
    return Array.from(registry.entriesByRole('item')).filter(
      (entry) => entry.meta.rootId === rootId,
    )
  }, [registry, rootId])

  const openMenu = ({
    initialFocusType,
  }: {
    initialFocusType: 'first-item' | 'last-item' | null
  }) => {
    initialFocusTypeRef.current = initialFocusType

    const parentRootId = parentMenuContext?.rootId
    const selfId = rootId

    tree.setOpenPath((prev) => {
      if (!parentRootId) {
        return [selfId]
      }

      const parentIndex = prev.indexOf(parentRootId)
      if (parentIndex === -1) {
        return [parentRootId, selfId]
      }

      const base = prev.slice(0, parentIndex + 1)
      return [...base, selfId]
    })
  }

  const closeMenu = () => {
    initialFocusTypeRef.current = null
    setActiveItemId(null)

    const selfId = rootId
    tree.setOpenPath((prev) => {
      const index = prev.indexOf(selfId)
      if (index === -1) {
        return prev
      }
      return prev.slice(0, index)
    })

    const triggerEntry = registry.get('trigger', rootId)
    triggerEntry?.node.focus()
  }

  const openMenuRef = useLatestRef(openMenu)

  const { isPresent: isContentPresent } = usePresence({
    isVisible: open,
    resolveElement: () => registry.get('content', rootId)?.node ?? null,
  })

  useLayoutEffect(() => {
    if (!isContentPresent) {
      return
    }
    if (initialFocusTypeRef.current === null) {
      return
    }

    const items = getMenuItemEntries()
    if (items.length === 0) {
      return
    }

    const targetEntry =
      initialFocusTypeRef.current === 'last-item'
        ? items[items.length - 1]
        : items[0]

    setActiveItemId(targetEntry.itemId)
  }, [getMenuItemEntries, isContentPresent])

  useLayoutEffect(() => {
    if (activeItemId === null) {
      return
    }
    const entry = registry.get('item', activeItemId)
    entry?.node.focus()
    initialFocusTypeRef.current = null
  }, [activeItemId, registry])

  useEffect(() => {
    const triggerEntry = registry.get('trigger', rootId)
    const triggerEl = triggerEntry?.node
    if (!triggerEl) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isArrowDown = event.key === 'ArrowDown'
      const isArrowUp = event.key === 'ArrowUp'
      const isArrowRight = event.key === 'ArrowRight'

      const isSubTrigger = triggerEl.getAttribute('role') === 'menuitem'

      // 서브 트리거 (menuitem 역할)
      if (isSubTrigger) {
        if (!isArrowRight) return

        event.preventDefault()

        if (!isContentPresent) {
          // 서브메뉴가 닫혀 있을 때: 열고 첫 아이템 포커스
          openMenuRef.current({ initialFocusType: 'first-item' })
        } else {
          // 서브메뉴가 이미 열려 있을 때: 첫 아이템으로 진입
          const items = getMenuItemEntries()
          if (items.length === 0) {
            return
          }
          const target = items[0]
          setActiveItemId(target.itemId)
        }

        return
      }

      // Top-level Trigger (button 역할)
      if (!isArrowDown && !isArrowUp) {
        return
      }

      event.preventDefault()

      if (!isContentPresent) {
        // 닫혀 있을 때: ARIA 패턴대로 열면서 포커스 위치 결정
        openMenuRef.current({
          initialFocusType: isArrowUp ? 'last-item' : 'first-item',
        })
      } else {
        const items = getMenuItemEntries()
        if (items.length === 0) {
          return
        }

        const target = isArrowUp ? items[items.length - 1] : items[0]
        setActiveItemId(target.itemId)
      }
    }

    triggerEl.addEventListener('keydown', handleKeyDown)
    return () => {
      triggerEl.removeEventListener('keydown', handleKeyDown)
    }
  }, [getMenuItemEntries, isContentPresent, openMenuRef, registry, rootId])

  const activeItemIdRef = useLatestRef(activeItemId)
  useEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEntry = registry.get('content', rootId)
    const contentEl = contentEntry?.node
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
      event.stopPropagation()

      const items = getMenuItemEntries()
      if (items.length === 0) return

      const currentIndex = items.findIndex(
        (entry) => entry.itemId === activeItemIdRef.current,
      )
      if (currentIndex === -1) return

      const nextIndex = isArrowDown
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length

      const nextEntry = items[nextIndex]
      setActiveItemId(nextEntry.itemId)
    }

    contentEl.addEventListener('keydown', handleKeyDown)
    return () => {
      contentEl.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeItemIdRef, getMenuItemEntries, isContentPresent, registry, rootId])

  const closeMenuRef = useLatestRef(closeMenu)
  useEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEntry = registry.get('content', rootId)
    const contentEl = contentEntry?.node
    if (!contentEl) {
      return
    }

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return
      }
      if (!isFocusWithin(contentEl)) {
        return
      }

      // Shift+Tab: 현재 메뉴만 닫고, 포커스는 trigger 로
      if (event.shiftKey) {
        event.preventDefault()
        closeMenuRef.current()

        // 서브메뉴면 상위 메뉴까지 닫히지 않도록 버블링도 막기
        if (isSubMenu) {
          event.stopPropagation()
        }
        return
      }

      // Tab 으로 메뉴를 벗어날 때 전체 메뉴 트리 닫기
      // (Tab 기본 동작은 그대로 두고, openPath만 비워줌)
      tree.setOpenPath([])
    }

    contentEl.addEventListener('keydown', handleTab)
    return () => {
      contentEl.removeEventListener('keydown', handleTab)
    }
  }, [closeMenuRef, isContentPresent, isSubMenu, registry, rootId, tree])

  useEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEntry = registry.get('content', rootId)
    const contentEl = contentEntry?.node
    if (!contentEl) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isEscape = event.key === 'Escape'
      const isArrowLeft = event.key === 'ArrowLeft'

      if (!isEscape && !isArrowLeft) {
        return
      }

      if (!isFocusWithin(contentEl)) {
        return
      }

      if (isArrowLeft && !isSubMenu) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      closeMenuRef.current()
    }

    contentEl.addEventListener('keydown', handleKeyDown)
    return () => {
      contentEl.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeMenuRef, isContentPresent, isSubMenu, registry, rootId])

  return (
    <MenuContext.Provider
      value={{
        rootId,

        open,
        openMenu,
        closeMenu,

        activeItemId,
        setActiveItemId,

        parentMenuContext,
      }}
    >
      {children}
    </MenuContext.Provider>
  )
}

export type TriggerProps = ComponentPropsWithoutRef<'button'>
export function Trigger({ children, onClick, ...rest }: TriggerProps) {
  const { open, openMenu, closeMenu, rootId } = useMenuContext()

  const registry = MenuSystem.useCompositeRegistry()

  const { domId, ref } = MenuSystem.useCompositeItemRegistration(
    'trigger',
    rootId,
    {
      meta: { rootId }, // 나중에 필요하면 더 추가
    },
  )

  return (
    <button
      ref={ref}
      type="button"
      id={domId}
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
      aria-controls={registry.getDomId('content', rootId)}
      {...rest}
    >
      {children}
    </button>
  )
}

export type ContentProps = ComponentPropsWithoutRef<'div'>
export function Content({ children, ...rest }: ContentProps) {
  const { open, rootId } = useMenuContext()

  const registry = MenuSystem.useCompositeRegistry()

  const { domId, ref } = MenuSystem.useCompositeItemRegistration(
    'content',
    rootId,
    { meta: { rootId } },
  )

  const { isPresent } = usePresence({
    isVisible: open,
    resolveElement: () => registry.get('content', rootId)?.node ?? null,
  })

  if (!isPresent) {
    return null
  }

  return (
    <div
      ref={ref}
      role="menu"
      id={domId}
      aria-labelledby={registry.getDomId('trigger', rootId)}
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
    rootId, // 이 SubTrigger가 여는 서브메뉴의 rootId
    parentMenuContext, // 상위 메뉴의 컨텍스트
  } = useMenuContext()

  if (!parentMenuContext) {
    throw new Error('SubTrigger는 서브메뉴 내부에서만 사용 가능합니다.')
  }

  const ownerRootId = parentMenuContext.rootId // 부모 메뉴의 rootId

  const registry = MenuSystem.useCompositeRegistry()

  // 1) 서브메뉴 입장에서의 trigger 등록
  const triggerReg = MenuSystem.useCompositeItemRegistration(
    'trigger',
    rootId,
    {
      meta: { rootId }, // 트리거는 자기 서브메뉴(rootId)에 속함
    },
  )

  // 2) 부모 메뉴 입장에서의 item 등록
  //    itemId도 child rootId를 쓰면, 부모 메뉴의 activeItemId랑 맞춰 쓰기 좋음
  const itemReg = MenuSystem.useCompositeItemRegistration('item', rootId, {
    id: triggerReg.domId, // DOM id는 trigger 쪽 id랑 동일하게 맞추기
    meta: { rootId: ownerRootId }, // 이 item의 "owner 메뉴"는 부모 메뉴
  })

  // 두 registry ref를 하나의 ref로 합쳐서 button에 달아준다
  const ref = useCallback(
    (node: HTMLElement | null) => {
      triggerReg.ref(node)
      itemReg.ref(node)
    },
    [triggerReg, itemReg],
  )

  // 부모 메뉴의 activeItemId로 roving tabIndex를 판단
  const isActiveInParent =
    parentMenuContext.activeItemId != null &&
    parentMenuContext.activeItemId === rootId

  return (
    <button
      ref={ref}
      role="menuitem"
      type="button"
      id={triggerReg.domId}
      onClick={(event) => {
        if (open) {
          // 서브메뉴가 열려 있다면 닫기
          closeMenu()
        } else {
          // 서브메뉴가 닫혀 있다면 열고, 처음 아이템에 포커스
          openMenu({ initialFocusType: 'first-item' })
        }
        onClick?.(event)
      }}
      tabIndex={isActiveInParent ? 0 : -1}
      aria-haspopup="menu"
      aria-expanded={open ? 'true' : 'false'}
      aria-controls={registry.getDomId('content', rootId) ?? undefined}
      data-ownedby={ownerRootId}
      {...rest}
    >
      {children}
    </button>
  )
}

export type SubContentProps = ComponentPropsWithoutRef<'div'>
export function SubContent({ children, ...rest }: SubContentProps) {
  const { open, rootId } = useMenuContext()
  const registry = MenuSystem.useCompositeRegistry()

  const { domId, ref } = MenuSystem.useCompositeItemRegistration(
    'content',
    rootId,
    { meta: { rootId } },
  )

  const { isPresent } = usePresence({
    isVisible: open,
    resolveElement: () => registry.get('content', rootId)?.node ?? null,
  })

  if (!isPresent) {
    return null
  }

  return (
    <div
      ref={ref}
      role="menu"
      id={domId}
      aria-labelledby={registry.getDomId('trigger', rootId)}
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
  const { open, rootId } = useMenuContext()
  const registry = MenuSystem.useCompositeRegistry()

  const { domId, ref } = MenuSystem.useCompositeItemRegistration(
    'positioner',
    rootId,
    { meta: { rootId } },
  )

  const { isPresent } = usePresence({
    isVisible: open,
    resolveElement: () => registry.get('positioner', rootId)?.node ?? null,
  })

  const flipOptionsRef = useLatestRef(flipOptions)
  const shiftOptionsRef = useLatestRef(shiftOptions)

  useLayoutEffect(() => {
    if (!isPresent) return

    const triggerEl = registry.get('trigger', rootId)?.node
    const positionerEl = registry.get('positioner', rootId)?.node
    if (!triggerEl || !positionerEl) return

    function positionUpdate() {
      const triggerEl = registry.get('trigger', rootId)?.node
      const positionerEl = registry.get('positioner', rootId)?.node
      if (!triggerEl || !positionerEl) return

      const arrowEl = registry.get('arrow', rootId)?.node

      computePosition(triggerEl, positionerEl, {
        placement,
        middleware: [
          offset(offsetOption),
          flip(flipOptionsRef.current),
          shift(shiftOptionsRef.current),
          ...(arrowEl
            ? [
                arrow({
                  element: arrowEl,
                }),
              ]
            : []),
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
    rootId,
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
      ref={ref}
      id={domId}
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
  const { rootId } = useMenuContext()

  const { domId, ref } = MenuSystem.useCompositeItemRegistration(
    'arrow',
    rootId,
    { meta: { rootId } },
  )

  return (
    <div
      ref={ref}
      id={domId}
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
  value: itemId,
  ...rest
}: ActionItemProps) {
  const { rootId, closeMenu, activeItemId } = useMenuContext()

  const { domId, ref } = MenuSystem.useCompositeItemRegistration(
    'item',
    itemId,
    {
      meta: { rootId }, // owner menu id
    },
  )

  return (
    <button
      ref={ref}
      role="menuitem"
      type="button"
      id={domId}
      onClick={(event) => {
        closeMenu()
        onClick?.(event)
      }}
      tabIndex={activeItemId === itemId ? 0 : -1}
      data-ownedby={rootId}
      {...rest}
    >
      {children}
    </button>
  )
}

export type LinkItemProps = Omit<ComponentPropsWithoutRef<'a'>, 'value'> & {
  value: string
}
export function LinkItem({
  children,
  onClick,
  value: itemId,
  ...rest
}: LinkItemProps) {
  const { rootId, closeMenu, activeItemId } = useMenuContext()

  const { domId, ref } = MenuSystem.useCompositeItemRegistration(
    'item',
    itemId,
    {
      meta: { rootId }, // owner menu id
    },
  )

  return (
    <a
      ref={ref}
      role="menuitem"
      id={domId}
      onClick={(event) => {
        closeMenu()
        onClick?.(event)
      }}
      tabIndex={activeItemId === itemId ? 0 : -1}
      data-ownedby={rootId}
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

const NestedMenu = {
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

export default NestedMenu
