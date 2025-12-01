import { useControllableState } from '@radix-ui/react-use-controllable-state'
import {
  createContext,
  forwardRef,
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
import { composeRefs } from '../../utils/composeRefs'
import { mergeProps } from '../../utils/mergeProps'

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
  openedMenus: string[]
  setOpenedMenus: React.Dispatch<React.SetStateAction<string[]>>
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
  // 트리 전체(openedMenus) 제어용 – TopRoot에서만 의미 있음
  openedMenus?: string[]
  defaultOpenedMenus?: string[]
  onOpenedMenusChange?: (menuIds: string[]) => void
  children: React.ReactNode
}

export function Root(props: RootProps) {
  const tree = useContext(MenuTreeContext)

  // 아직 트리 컨텍스트가 없으면 → 이 Root가 최상위
  if (!tree) {
    return (
      <MenuSystem.Provider>
        <ParentRoot {...props} />
      </MenuSystem.Provider>
    )
  }

  // 이미 트리 안에서 호출된 Root → 서브메뉴용 Root
  return <ChildRoot {...props} />
}

export type SubRootProps = Omit<
  RootProps,
  'openedMenus' | 'onOpenedMenusChange' | 'defaultOpenedMenus'
>

export function SubRoot(props: SubRootProps) {
  const tree = useContext(MenuTreeContext)

  // 아직 트리 컨텍스트가 없으면 → 이 Root가 최상위
  if (!tree) {
    throw new Error('Menu.SubRoot must be used within a Menu.Root')
  }

  return <ChildRoot {...props} />
}

function ParentRoot({
  openedMenus: openedMenusProp,
  defaultOpenedMenus: defaultOpenedMenusProp,
  onOpenedMenusChange: onOpenedMenusChange,
  ...rest
}: RootProps) {
  const [openedMenus, setOpenedMenus] = useControllableState<string[]>({
    prop: openedMenusProp,
    defaultProp: defaultOpenedMenusProp ?? [],
    onChange: onOpenedMenusChange,
  })

  const registry = MenuSystem.useCompositeRegistry()

  //  [ParentRoot] 문서 전체에 pointerdown 리스너를 달아서
  //    - registry에 등록된 어떤 노드에도 포함되지 않는 클릭이면
  //      → "바깥 클릭"으로 간주하고 전체 메뉴 트리를 닫는다.
  useEffect(() => {
    // 열려 있는 메뉴가 없으면 리스너 안 깜
    if (openedMenus.length === 0) {
      return
    }
    if (typeof document === 'undefined') {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return

      // registry에 등록된 모든 노드를 돌면서,
      // 그 어떤 노드에도 포함되지 않는 클릭이면 "바깥 클릭"으로 간주
      for (const entry of registry.entries()) {
        if (entry.node.contains(target)) {
          return
        }
      }

      // 여기까지 왔으면 완전 바깥 -> 전체 트리 닫기
      setOpenedMenus([])
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [openedMenus.length, registry, setOpenedMenus])

  return (
    <MenuTreeContext.Provider
      value={{ openedMenus: openedMenus, setOpenedMenus: setOpenedMenus }}
    >
      {/* TopRoot 자신도 SubRoot를 통해 렌더링하는 게 핵심 */}
      <ChildRoot {...rest} />
    </MenuTreeContext.Provider>
  )
}

export function ChildRoot({ children, menuId }: RootProps) {
  const parentMenuContext = useContext(MenuContext)
  const tree = useMenuTreeContext()
  const registry = MenuSystem.useCompositeRegistry()

  const isTopLevel = !parentMenuContext
  const isSubMenu = !!parentMenuContext

  const autoId = useId()
  const rootId = menuId ?? autoId

  const initialFocusTypeRef = useRef<'first-item' | 'last-item' | null>(null)

  const open = isTopLevel
    ? tree.openedMenus.length > 0 && tree.openedMenus[0] === rootId // 루트는 경로의 첫 요소
    : tree.openedMenus.includes(rootId)

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

    tree.setOpenedMenus((prev) => {
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
    tree.setOpenedMenus((prev) => {
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

  // [ChildRoot] 메뉴가 닫힐 때(open === false) 내부 포커스 상태를 초기화:
  //  - activeItemId를 null로
  //  - initialFocusTypeRef 도 리셋
  useEffect(() => {
    if (!open) {
      setActiveItemId(null)
      initialFocusTypeRef.current = null
    }
  }, [open])

  // [ChildRoot] 메뉴가 열리고, Content DOM이 실제로 존재(isContentPresent)할 때
  //  - initialFocusTypeRef 기준으로 첫/마지막 아이템을 골라 activeItemId로 설정
  useEffect(() => {
    if (!open) {
      return
    }
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
  }, [open, isContentPresent, getMenuItemEntries])

  // [ChildRoot] activeItemId가 바뀔 때 실제 DOM 포커스를 해당 item으로 이동
  //  - 포커스가 한 번 이동하면 initialFocusTypeRef는 더 이상 필요 없으므로 null로 리셋
  useLayoutEffect(() => {
    if (activeItemId === null) {
      return
    }
    const entry = registry.get('item', activeItemId)
    entry?.node.focus()
    initialFocusTypeRef.current = null
  }, [activeItemId, registry])

  // [ChildRoot] trigger 엘리먼트에 키보드 핸들러 등록:
  //   - Top-level trigger:
  //       ArrowDown / ArrowUp 으로 메뉴 열기 + 첫/마지막 아이템 포커스
  //   - SubTrigger (role="menuitem"):
  //       ArrowRight로 서브 메뉴 열기 또는 이미 열린 서브 메뉴의 첫 아이템으로 진입
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

  // [ChildRoot] Content 영역에서 ArrowUp / ArrowDown 으로
  //  - 현재 activeItem 기준으로 위/아래 아이템으로 순환 이동하는 로직
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

  // [ChildRoot] Content 영역에서 Tab / Shift+Tab 처리:
  //  - Shift+Tab:
  //      현재 메뉴만 닫고(trigger로 포커스 복귀), 서브메뉴인 경우 버블링 막기
  //  - Tab:
  //      메뉴 바깥으로 포커스가 나가므로 전체 메뉴 트리 닫기(openedMenus = [])
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
      // (Tab 기본 동작은 그대로 두고, openedMenus 비워줌)
      tree.setOpenedMenus([])
    }

    contentEl.addEventListener('keydown', handleTab)
    return () => {
      contentEl.removeEventListener('keydown', handleTab)
    }
  }, [closeMenuRef, isContentPresent, isSubMenu, registry, rootId, tree])

  // [ChildRoot] Content 영역에서 Escape / ArrowLeft 처리:
  //   - Escape:
  //       언제나 현재 메뉴 닫기
  //   - ArrowLeft:
  //       서브메뉴인 경우에만 부모 방향으로 닫기 허용
  //   - 포커스가 Content 안에 있을 때만 동작
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
export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ children, ...rest }, ref) => {
    const { open, openMenu, closeMenu, rootId } = useMenuContext()

    const registry = MenuSystem.useCompositeRegistry()

    const { domId, ref: triggerRef } = MenuSystem.useCompositeItemRegistration(
      'trigger',
      rootId,
      {
        meta: { rootId }, // 나중에 필요하면 더 추가
      },
    )

    return (
      <button
        ref={composeRefs(triggerRef, ref)}
        {...mergeProps(
          {
            type: 'button',
            id: domId,
            onClick: () => {
              if (open) {
                closeMenu()
              } else {
                openMenu({ initialFocusType: 'first-item' })
              }
            },
            'aria-haspopup': 'menu',
            'aria-expanded': open ? 'true' : 'false',
            'aria-controls': registry.getDomId('content', rootId),
          },
          rest,
        )}
      >
        {children}
      </button>
    )
  },
)

export type ContentProps = ComponentPropsWithoutRef<'div'>
export const Content = forwardRef<HTMLDivElement, ContentProps>(
  ({ children, ...rest }, ref) => {
    const { open, rootId } = useMenuContext()

    const registry = MenuSystem.useCompositeRegistry()

    const { domId, ref: contentRef } = MenuSystem.useCompositeItemRegistration(
      'content',
      rootId,
      { meta: { rootId } },
    )

    const { isPresent, transitionState } = usePresence({
      isVisible: open,
      resolveElement: () => registry.get('content', rootId)?.node ?? null,
    })

    if (!isPresent) {
      return null
    }

    return (
      <div
        ref={composeRefs(contentRef, ref)}
        {...mergeProps(
          {
            role: 'menu',
            id: domId,
            'aria-labelledby': registry.getDomId('trigger', rootId),
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

export type SubTriggerProps = ComponentPropsWithoutRef<'button'>

export const SubTrigger = forwardRef<HTMLButtonElement, SubTriggerProps>(
  ({ children, ...rest }, ref) => {
    const {
      open,
      openMenu,
      closeMenu,
      rootId, // 이 SubTrigger가 여는 서브메뉴의 rootId
      parentMenuContext, // 상위 메뉴의 컨텍스트
    } = useMenuContext()

    if (!parentMenuContext) {
      throw new Error('Menu.SubTrigger must be used within a Menu.Root')
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

    // 부모 메뉴의 activeItemId로 roving tabIndex를 판단
    const isActiveInParent =
      parentMenuContext.activeItemId != null &&
      parentMenuContext.activeItemId === rootId

    return (
      <button
        ref={composeRefs(triggerReg.ref, itemReg.ref, ref)}
        {...mergeProps(
          {
            role: 'menuitem',
            type: 'button',
            id: triggerReg.domId,
            onClick: () => {
              if (open) {
                closeMenu()
              } else {
                openMenu({ initialFocusType: 'first-item' })
              }
            },
            tabIndex: isActiveInParent ? 0 : -1,
            'aria-haspopup': 'menu',
            'aria-expanded': open ? 'true' : 'false',
            'aria-controls': registry.getDomId('content', rootId) ?? undefined,
          },
          rest,
        )}
      >
        {children}
      </button>
    )
  },
)

export type SubContentProps = ComponentPropsWithoutRef<'div'>
export const SubContent = forwardRef<HTMLDivElement, SubContentProps>(
  ({ children, ...rest }, ref) => {
    const { open, rootId } = useMenuContext()
    const registry = MenuSystem.useCompositeRegistry()

    const { domId, ref: subContentRef } =
      MenuSystem.useCompositeItemRegistration('content', rootId, {
        meta: { rootId },
      })

    const { isPresent, transitionState } = usePresence({
      isVisible: open,
      resolveElement: () => registry.get('content', rootId)?.node ?? null,
    })

    if (!isPresent) {
      return null
    }

    return (
      <div
        ref={composeRefs(subContentRef, ref)}
        {...mergeProps(
          {
            role: 'menu',
            id: domId,
            'aria-labelledby': registry.getDomId('trigger', rootId),
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
    const { open, rootId } = useMenuContext()
    const registry = MenuSystem.useCompositeRegistry()

    const { domId, ref: positionerRef } =
      MenuSystem.useCompositeItemRegistration('positioner', rootId, {
        meta: { rootId },
      })

    const { isPresent } = usePresence({
      isVisible: open,
      resolveElement: () => registry.get('positioner', rootId)?.node ?? null,
    })

    const flipOptionsRef = useLatestRef(flipOptions)
    const shiftOptionsRef = useLatestRef(shiftOptions)

    // [Positioner] positioner/arrow 위치 계산 및 autoUpdate:
    //   - 메뉴가 표시(isPresent)될 때 Floating UI의 autoUpdate를 사용해
    //     trigger / positioner / arrow 위치를 지속적으로 업데이트
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
        ref={composeRefs(positionerRef, ref)}
        {...mergeProps(
          {
            id: domId,
            style: {
              width: 'max-content',
              position: 'absolute',
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

export type PositionerArrowProps = ComponentPropsWithoutRef<'div'>
export const PositionerArrow = forwardRef<HTMLDivElement, PositionerArrowProps>(
  ({ children, ...rest }, ref) => {
    const { rootId, open } = useMenuContext()

    const registry = MenuSystem.useCompositeRegistry()

    const { domId, ref: arrowRef } = MenuSystem.useCompositeItemRegistration(
      'arrow',
      rootId,
      { meta: { rootId } },
    )

    const { transitionState } = usePresence({
      isVisible: open,
      resolveElement: () => registry.get('arrow', rootId)?.node ?? null,
    })

    return (
      <div
        ref={composeRefs(arrowRef, ref)}
        {...mergeProps(
          {
            id: domId,
            style: {
              position: 'absolute',
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

export type ActionItemProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'value'
> & {
  value: string
}
export const ActionItem = forwardRef<HTMLButtonElement, ActionItemProps>(
  ({ children, value: itemId, ...rest }, ref) => {
    const { rootId, activeItemId } = useMenuContext()

    const tree = useMenuTreeContext()
    const registry = MenuSystem.useCompositeRegistry()

    const { domId, ref: actionItemRef } =
      MenuSystem.useCompositeItemRegistration('item', itemId, {
        meta: { rootId }, // owner menu id
      })

    return (
      <button
        ref={composeRefs(actionItemRef, ref)}
        {...mergeProps(
          {
            role: 'menuitem',
            type: 'button',
            id: domId,
            onClick: () => {
              // 1) 클릭 직전에 top-level 메뉴 id 기억
              const topMenuId = tree.openedMenus[0]

              // 2) 메뉴 트리 전체 닫기
              tree.setOpenedMenus([])

              // 3) 최상위 trigger로 포커스 복원
              if (topMenuId) {
                const topTrigger = registry.get('trigger', topMenuId)
                topTrigger?.node.focus()
              }
            },
            tabIndex: activeItemId === itemId ? 0 : -1,
          },
          rest,
        )}
      >
        {children}
      </button>
    )
  },
)

export type LinkItemProps = Omit<ComponentPropsWithoutRef<'a'>, 'value'> & {
  value: string
}
export const LinkItem = forwardRef<HTMLAnchorElement, LinkItemProps>(
  ({ children, value: itemId, ...rest }, ref) => {
    const { rootId, activeItemId } = useMenuContext()
    const tree = useMenuTreeContext()
    const registry = MenuSystem.useCompositeRegistry()

    const { domId, ref: linkItemRef } = MenuSystem.useCompositeItemRegistration(
      'item',
      itemId,
      {
        meta: { rootId }, // owner menu id
      },
    )

    return (
      <a
        ref={composeRefs(linkItemRef, ref)}
        {...mergeProps(
          {
            role: 'menuitem',
            id: domId,
            onClick: () => {
              const topMenuId = tree.openedMenus[0]

              tree.setOpenedMenus([])

              if (topMenuId) {
                const topTrigger = registry.get('trigger', topMenuId)
                topTrigger?.node.focus()
              }
            },
            onKeyDown: (event) => {
              // [LinkItem] 스페이스바를 버튼처럼 동작시키기:
              //   - Space 입력 시 기본 스크롤/페이지 이동 막고
              //   - currentTarget.click() 호출로 onClick 흐름 재사용
              if (event.key === ' ' || event.key === 'Spacebar') {
                event.preventDefault()
                // 클릭과 동일한 흐름 태우기 (위 onClick 로직 재사용)
                ;(event.currentTarget as HTMLAnchorElement).click()
              }
            },
            tabIndex: activeItemId === itemId ? 0 : -1,
          },
          rest,
        )}
      >
        {children}
      </a>
    )
  },
)

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
