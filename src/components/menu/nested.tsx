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

type MenuContextValue = {
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
  // 트리 전체(openPath) 제어용 – TopRoot에서만 의미 있음
  openPath?: string[]
  defaultOpenPath?: string[]
  onOpenPathChange?: (path: string[]) => void

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

export function Root(props: RootProps) {
  const tree = useContext(MenuTreeContext)

  // 아직 트리 컨텍스트가 없으면 → 이 Root가 최상위
  if (!tree) {
    return <TopRoot {...props} />
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

export function SubRoot({ idRules: idRulesProp, children }: RootProps) {
  const parentMenuContext = useContext(MenuContext)
  const tree = useMenuTreeContext()

  const isTopLevel = !parentMenuContext
  const isSubMenu = !!parentMenuContext

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

  const initialFocusTypeRef = useRef<'first-item' | 'last-item' | null>(null)

  const open = isTopLevel
    ? tree.openPath.length > 0 && tree.openPath[0] === rootId // 루트는 경로의 첫 요소
    : tree.openPath.includes(rootId)

  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  const openMenu = ({
    initialFocusType,
  }: {
    initialFocusType: 'first-item' | 'last-item' | null
  }) => {
    initialFocusTypeRef.current = initialFocusType

    const parentRootId = parentMenuContext?.idRules.rootId
    const selfId = rootId

    tree.setOpenPath((prev) => {
      // 부모가 없으면 이 메뉴부터 시작하는 경로
      if (!parentRootId) {
        return [selfId]
      }

      const parentIndex = prev.indexOf(parentRootId)

      // 이전 경로에 부모가 없으면, 부모 + 나로 새 경로 생성
      if (parentIndex === -1) {
        return [parentRootId, selfId]
      }

      // 부모까지의 경로 + 나
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
      if (index === -1) return prev
      // 나 이후의 경로는 잘라낸다 (나 포함 이전까지만 유지)
      return prev.slice(0, index)
    })

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

    if (initialFocusTypeRef.current === null) {
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
          const items = dom.getMenuItems({ rootId })
          if (items.length === 0) return
          setActiveItemId(items[0].id)
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
        // 이미 열려 있을 때: 메뉴 안으로 진입
        const items = dom.getMenuItems({ rootId })
        if (items.length === 0) return

        const target = isArrowUp ? items[items.length - 1] : items[0]

        setActiveItemId(target.id)
      }
    }

    triggerEl.addEventListener('keydown', handleKeyDown)
    return () => {
      triggerEl.removeEventListener('keydown', handleKeyDown)
    }
  }, [isContentPresent, openMenuRef, triggerId, rootId, setActiveItemId])

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
      event.stopPropagation()

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

    console.log('1')
    contentEl.addEventListener('keydown', handleTab)
    return () => {
      contentEl.removeEventListener('keydown', handleTab)
    }
  }, [closeMenuRef, contentId, isContentPresent, isSubMenu, tree])

  useEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEl = dom.getContentElement({ contentId })
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
