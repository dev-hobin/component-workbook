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
} from 'react'
import { createPortal } from 'react-dom'
import {
  computePosition,
  flip,
  shift,
  offset,
  autoUpdate,
  type Placement,
} from '@floating-ui/dom'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import { useHighlight, type UseHighlightReturn } from '../../hooks/use-highlight'
import { useCharacterSearch } from '../../hooks/use-character-search'
import { usePresence } from '../../hooks/use-presence'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'
import { DismissableLayer } from '../../primitives/dismissable-layer'
import {
  NodeStoreProvider,
  useNodeStore,
} from '../../primitives/use-node-store'
import { useNode } from '../../primitives/use-node'
import { useStoreSubscribe } from '../../primitives/use-store-subscribe'
import { ParentProvider } from '../../primitives/use-parent-context'
import type { NodeStore } from '../../primitives/node-store'

// ============================================
// Types
// ============================================

export type MenuId = string
export type ItemId = string

type MenuRole = 'trigger' | 'content' | 'item' | 'sub-trigger' | 'sub-content'

type MenuItemMeta = {
  menuId: MenuId
  disabled: boolean
  textValue: string
  isSubTrigger: boolean
  subMenuId?: MenuId
  onSelect?: () => void
}

type MenuContentMeta = {
  menuId: MenuId
}

type MenuMeta = MenuItemMeta | MenuContentMeta | object

export function isMenuOpen(openedPath: MenuId[], menuId: MenuId): boolean {
  return openedPath.includes(menuId)
}

type MenuContextValue = {
  // State
  openedPath: MenuId[]
  highlightedId: ItemId | null
  activeMenuId: MenuId | null

  // NodeStore
  store: NodeStore<MenuRole, MenuMeta>

  // Options
  loop: boolean

  // Callbacks
  onItemSelect?: (id: ItemId) => void

  // Highlight
  highlight: UseHighlightReturn

  // Actions (행동 단위)
  setHighlightedId: (id: ItemId | null) => void
  openMenu: (menuId: MenuId, parentMenuId: MenuId | null, highlightFirst?: boolean) => void
  closeMenu: (menuId: MenuId) => void
  closeAll: () => void
  highlightFirst: () => void
  highlightLast: () => void
  openSubmenu: () => void
  closeSubmenu: () => void
  typeahead: (char: string) => void
  getEnabledItemIds: (menuId: MenuId) => ItemId[]
  handleMenuKeyDown: (e: React.KeyboardEvent) => void
  handlePointerDownOutside: (event: PointerEvent) => void
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
    throw new Error('Menu components must be used within Menu.Root')
  }
  return context
}

function useMenuIdContext() {
  const context = useContext(MenuIdContext)
  if (!context) {
    throw new Error('Menu components must be used within Menu.Root')
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  loop?: boolean
  onItemSelect?: (id: ItemId) => void
}

export function Root({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  loop = true,
  onItemSelect,
}: RootProps) {
  return (
    <NodeStoreProvider<MenuRole, MenuMeta>>
      <RootImpl
        open={openProp}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        loop={loop}
        onItemSelect={onItemSelect}
      >
        {children}
      </RootImpl>
    </NodeStoreProvider>
  )
}

function RootImpl({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  loop = true,
  onItemSelect,
}: RootProps) {
  const rootMenuId = useId()
  const store = useNodeStore<MenuRole, MenuMeta>()

  // Controllable state
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  // Internal states
  const [openedPath, setOpenedPath] = useState<MenuId[]>([])

  // Derived
  const activeMenuId = openedPath[openedPath.length - 1] ?? null

  // Sync external open → internal openedPath (always bridge replacement)
  useLayoutEffect(() => {
    if (open) {
      setOpenedPath((prev) => (prev.length === 0 ? [rootMenuId] : prev))
    } else {
      setOpenedPath([])
      highlight.clear()
    }
  }, [open, rootMenuId])

  // NodeStore-based helpers
  const getEnabledItemIds = useCallback(
    (menuId: MenuId) => {
      const items = store.filterNodesByRolesAndMeta(
        ['item', 'sub-trigger'],
        (meta) => {
          if (!('menuId' in meta)) return false
          const itemMeta = meta as MenuItemMeta
          return itemMeta.menuId === menuId && !itemMeta.disabled
        },
      )

      items.sort((a, b) => {
        if (!a.element || !b.element) return 0
        const position = a.element.compareDocumentPosition(b.element)
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
        return 0
      })

      return items.map((node) => node.id)
    },
    [store],
  )

  const getItemTextValue = useCallback(
    (itemId: ItemId) => {
      const node =
        store.getNode(itemId, 'item') ?? store.getNode(itemId, 'sub-trigger')
      if (node && 'textValue' in node.meta) {
        return (node.meta as MenuItemMeta).textValue
      }
      return ''
    },
    [store],
  )

  const isSubTriggerCheck = useCallback(
    (itemId: ItemId): MenuId | null => {
      const node = store.getNode(itemId, 'sub-trigger')
      if (node && 'subMenuId' in node.meta) {
        return (node.meta as MenuItemMeta).subMenuId ?? null
      }
      return null
    },
    [store],
  )

  // useHighlight: index 기반
  // count는 action 시점에 lazy 계산하므로 0으로 시작 — 실제 items는 action 내에서 조회
  // 하지만 count가 필요한 건 safe 보정뿐이므로, activeMenuId 기반 현재 items를 전달
  const currentItems = activeMenuId ? getEnabledItemIds(activeMenuId) : []
  const highlight = useHighlight(currentItems.length, { loop })

  // index → ID 파생
  const highlightedId =
    highlight.index >= 0 ? (currentItems[highlight.index] ?? null) : null

  // character search
  const typeahead = useCharacterSearch(
    () => {
      if (!activeMenuId) return []
      const items = getEnabledItemIds(activeMenuId)
      return items.map((id) => getItemTextValue(id))
    },
    (index) => highlight.set(index),
    highlight.index >= 0 ? highlight.index : undefined,
  )

  // setHighlightedId: ID로 직접 설정 (pointer enter 등)
  const setHighlightedId = useCallback(
    (id: ItemId | null) => {
      if (id === null) {
        highlight.clear()
        return
      }
      if (!activeMenuId) return
      const items = getEnabledItemIds(activeMenuId)
      const idx = items.indexOf(id)
      if (idx >= 0) {
        highlight.set(idx)
      }
    },
    [activeMenuId, getEnabledItemIds, highlight],
  )

  // DOM focus helpers
  const focusContent = useCallback(() => {
    requestAnimationFrame(() => {
      const currentPath = openedPath
      const activeId = currentPath[currentPath.length - 1]
      if (!activeId) return

      const contentNodes = store.filterNodesByRolesAndMeta(
        ['content', 'sub-content'],
        (meta) => 'menuId' in meta && meta.menuId === activeId,
      )
      contentNodes[0]?.element?.focus()
    })
  }, [openedPath, store])

  const focusTrigger = useCallback(() => {
    requestAnimationFrame(() => {
      const triggerNode = store.getNodesByRole('trigger')[0]
      triggerNode?.element?.focus()
    })
  }, [store])

  const focusItemById = useCallback(
    (itemId: ItemId) => {
      requestAnimationFrame(() => {
        const itemNode =
          store.getNode(itemId, 'item') ?? store.getNode(itemId, 'sub-trigger')
        itemNode?.element?.focus()
      })
    },
    [store],
  )

  // Focus content when menu opens, trigger when it closes
  const wasOpenRef = useRef(false)
  useEffect(() => {
    const isOpen = openedPath.length > 0
    if (isOpen && !wasOpenRef.current) {
      focusContent()
    } else if (!isOpen && wasOpenRef.current) {
      focusTrigger()
    }
    wasOpenRef.current = isOpen
  }, [openedPath.length > 0, focusContent, focusTrigger])

  // Focus highlighted item when it changes
  useEffect(() => {
    if (highlightedId) {
      focusItemById(highlightedId)
    }
  }, [highlightedId, focusItemById])

  // ── 행동 단위 액션 ──

  const highlightFirstFn = useCallback(() => {
    if (!activeMenuId) return
    highlight.first()
  }, [activeMenuId, highlight])

  const highlightLastFn = useCallback(() => {
    if (!activeMenuId) return
    highlight.last()
  }, [activeMenuId, highlight])

  // Action: open a menu
  const openMenu = useCallback(
    (menuId: MenuId, parentMenuId: MenuId | null, highlightFirst = true) => {
      if (parentMenuId === null) {
        setOpenedPath([menuId])
      } else {
        setOpenedPath((prev) => {
          const parentIndex = prev.indexOf(parentMenuId)
          if (parentIndex === -1) {
            return [parentMenuId, menuId]
          }
          return [...prev.slice(0, parentIndex + 1), menuId]
        })
      }

      // Highlight first/last after open
      // Note: items may not be available yet if submenu hasn't rendered
      // So we use requestAnimationFrame to let the DOM settle
      requestAnimationFrame(() => {
        if (highlightFirst) {
          highlight.first()
        } else {
          highlight.last()
        }
      })

      if (!open) {
        setOpen(true)
      }
    },
    [open, setOpen, highlight],
  )

  // Action: close a specific menu
  const closeMenu = useCallback(
    (menuId: MenuId) => {
      setOpenedPath((prev) => {
        const index = prev.indexOf(menuId)
        if (index === -1) return prev
        const newPath = prev.slice(0, index)
        if (newPath.length === 0 && open) {
          setOpen(false)
        }
        return newPath
      })
      highlight.clear()
    },
    [open, setOpen, highlight],
  )

  // Action: close all menus
  const closeAll = useCallback(() => {
    setOpenedPath([])
    highlight.clear()
    if (open) {
      setOpen(false)
    }
  }, [open, setOpen, highlight])

  // Submenu actions
  const openSubmenu = useCallback(() => {
    if (highlight.index < 0 || !activeMenuId) return
    const items = getEnabledItemIds(activeMenuId)
    const itemId = items[highlight.index]
    if (!itemId) return

    const subMenuId = isSubTriggerCheck(itemId)
    if (!subMenuId) return

    setOpenedPath((prev) => [...prev, subMenuId])
    // activeMenuId changes → currentItems changes → highlight resets via safe bound
    requestAnimationFrame(() => {
      highlight.first()
    })
  }, [highlight, activeMenuId, getEnabledItemIds, isSubTriggerCheck])

  const closeSubmenu = useCallback(() => {
    if (openedPath.length <= 1) return
    const closingMenuId = openedPath[openedPath.length - 1]
    setOpenedPath((prev) => prev.slice(0, -1))
    // Highlight the SubTrigger of the closing menu in parent
    // closingMenuId is also the sub-trigger's id
    const parentMenuId = openedPath[openedPath.length - 2]
    if (parentMenuId) {
      requestAnimationFrame(() => {
        const items = getEnabledItemIds(parentMenuId)
        const idx = items.indexOf(closingMenuId)
        if (idx >= 0) {
          highlight.set(idx)
        }
      })
    }
  }, [openedPath, getEnabledItemIds, highlight])

  // 메뉴 키보드 핸들러 (Content/SubContent 공통)
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        highlight.next()
        break
      case 'ArrowUp':
        e.preventDefault()
        highlight.prev()
        break
      case 'ArrowRight':
        e.preventDefault()
        openSubmenu()
        break
      case 'ArrowLeft':
        e.preventDefault()
        closeSubmenu()
        break
      case 'Home':
        e.preventDefault()
        highlightFirstFn()
        break
      case 'End':
        e.preventDefault()
        highlightLastFn()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (highlightedId) {
          const subMenuId = isSubTriggerCheck(highlightedId)
          if (subMenuId) {
            openSubmenu()
          } else {
            const node = store.getNode(highlightedId, 'item')
            const meta = node?.meta as MenuItemMeta | undefined
            meta?.onSelect?.()
            onItemSelect?.(highlightedId)
            closeAll()
          }
        }
        break
      case 'Tab':
        e.preventDefault()
        closeAll()
        break
      default:
        if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
          typeahead(e.key)
        }
        break
    }
  }

  // 외부 클릭 핸들러 (Content/SubContent 공통)
  const handlePointerDownOutside = useCallback(
    (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) {
        closeAll()
        return
      }

      const roles: MenuRole[] = ['trigger', 'sub-trigger', 'content', 'sub-content']
      for (const role of roles) {
        const nodes = store.getNodesByRole(role)
        for (const node of nodes) {
          if (node.element?.contains(target)) return
        }
      }

      closeAll()
    },
    [closeAll, store],
  )

  const contextValue: MenuContextValue = {
    openedPath,
    highlightedId,
    activeMenuId,
    store,
    loop,
    onItemSelect,
    highlight,
    setHighlightedId,
    openMenu,
    closeMenu,
    closeAll,
    highlightFirst: highlightFirstFn,
    highlightLast: highlightLastFn,
    openSubmenu,
    closeSubmenu,
    typeahead,
    getEnabledItemIds,
    handleMenuKeyDown,
    handlePointerDownOutside,
  }

  const menuIdContextValue: MenuIdContextValue = {
    menuId: rootMenuId,
    parentMenuId: null,
  }

  return (
    <MenuContext.Provider value={contextValue}>
      <MenuIdContext.Provider value={menuIdContextValue}>
        <ParentProvider id={rootMenuId}>{children}</ParentProvider>
      </MenuIdContext.Provider>
    </MenuContext.Provider>
  )
}

// ============================================
// Trigger
// ============================================

export type TriggerProps = ComponentPropsWithoutRef<'button'>

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { openedPath, openMenu, closeMenu, store } = useMenuContext()
    const { menuId, parentMenuId } = useMenuIdContext()

    const { domId, ref } = useNode<MenuRole>({
      role: 'trigger',
      id: menuId,
    })

    const isOpen = isMenuOpen(openedPath, menuId)

    const contentDomId = useStoreSubscribe(
      store,
      (s) => s.getNode(menuId, 'content')?.domId ?? null,
    )

    const handleClick = () => {
      if (isOpen) {
        closeMenu(menuId)
      } else {
        openMenu(menuId, parentMenuId)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isOpen) return

      switch (e.key) {
        case 'Enter':
        case ' ':
        case 'ArrowDown':
          e.preventDefault()
          openMenu(menuId, parentMenuId, true)
          break
        case 'ArrowUp':
          e.preventDefault()
          openMenu(menuId, parentMenuId, false)
          break
      }
    }

    return (
      <button
        ref={composeRefs(forwardedRef, ref as React.Ref<HTMLButtonElement>)}
        {...mergeProps(
          {
            type: 'button',
            id: domId,
            'aria-haspopup': 'menu' as const,
            'aria-expanded': isOpen,
            'aria-controls': isOpen ? contentDomId ?? undefined : undefined,
            'data-part': 'trigger',
            'data-state': isOpen ? 'open' : 'closed',
            onClick: handleClick,
            onKeyDown: handleKeyDown,
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
// Portal
// ============================================

export type PortalProps = {
  children: React.ReactNode
  container?: Element | DocumentFragment
}

export function Portal({ children, container = document.body }: PortalProps) {
  return createPortal(children, container)
}

// ============================================
// Content
// ============================================

export type ContentProps = {
  placement?: Placement
  sideOffset?: number
  onCloseAutoFocus?: (event: Event) => void
} & ComponentPropsWithoutRef<'div'>

export const Content = forwardRef<HTMLDivElement, ContentProps>(
  (
    { children, placement = 'bottom-start', sideOffset = 4, ...rest },
    forwardedRef,
  ) => {
    const {
      openedPath,
      store,
      closeMenu,
      handleMenuKeyDown,
      handlePointerDownOutside,
    } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const positionerRef = useRef<HTMLDivElement>(null)

    const { domId, ref, elementRef } = useNode<MenuRole, MenuContentMeta>({
      role: 'content',
      id: menuId,
      meta: { menuId },
    })

    const triggerDomId = useStoreSubscribe(
      store,
      (s) => s.getNode(menuId, 'trigger')?.domId ?? null,
    )
    const isOpen = isMenuOpen(openedPath, menuId)

    const { isPresent, transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => elementRef.current,
    })

    // Auto-focus content when it becomes present
    useLayoutEffect(() => {
      if (!isPresent) return
      requestAnimationFrame(() => {
        elementRef.current?.focus()
      })
    }, [isPresent, elementRef])

    // Positioning with floating-ui
    useLayoutEffect(() => {
      const triggerNode = store.getNode(menuId, 'trigger')
      const trigger = triggerNode?.element
      const positioner = positionerRef.current
      if (!trigger || !positioner) return

      const updatePosition = () => {
        computePosition(trigger, positioner, {
          placement,
          middleware: [offset(sideOffset), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          Object.assign(positioner.style, {
            left: `${x}px`,
            top: `${y}px`,
          })
        })
      }

      const cleanup = autoUpdate(trigger, positioner, updatePosition)
      return cleanup
    }, [placement, sideOffset, menuId, store])

    const handleEscapeKeyDown = useCallback(() => {
      closeMenu(menuId)
    }, [closeMenu, menuId])

    return (
      <div
        ref={positionerRef}
        data-part="positioner"
        style={{
          position: 'absolute' as const,
          top: 0,
          left: 0,
          minWidth: 'max-content',
        }}
      >
        {isPresent && (
          <DismissableLayer
            isActive={isOpen}
            dismissOnEscape={true}
            onEscapeKeyDown={handleEscapeKeyDown}
            onPointerDownOutside={handlePointerDownOutside}
            contentRef={elementRef}
          >
            <div
              ref={composeRefs(forwardedRef, ref as React.Ref<HTMLDivElement>)}
              {...mergeProps(
                {
                  role: 'menu',
                  id: domId,
                  'aria-labelledby': triggerDomId ?? undefined,
                  tabIndex: -1,
                  'data-part': 'content',
                  'data-state': isOpen ? 'open' : 'closed',
                  'data-transition': transitionState,
                  onKeyDown: handleMenuKeyDown,
                },
                rest,
              )}
            >
              <ParentProvider id={menuId}>{children}</ParentProvider>
            </div>
          </DismissableLayer>
        )}
      </div>
    )
  },
)

// ============================================
// Item
// ============================================

export type ItemProps = {
  disabled?: boolean
  textValue?: string
  onSelect?: () => void
} & ComponentPropsWithoutRef<'div'>

export const Item = forwardRef<HTMLDivElement, ItemProps>(
  (
    { children, disabled = false, textValue, onSelect, ...rest },
    forwardedRef,
  ) => {
    const { highlightedId, setHighlightedId, closeAll, onItemSelect } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const derivedTextValue =
      textValue ?? (typeof children === 'string' ? children : '')

    const { id: itemId, ref } = useNode<MenuRole, MenuItemMeta>({
      role: 'item',
      meta: {
        menuId,
        disabled,
        textValue: derivedTextValue,
        isSubTrigger: false,
        onSelect,
      },
    })

    const isHighlighted = highlightedId === itemId

    return (
      <div
        ref={composeRefs(forwardedRef, ref as React.Ref<HTMLDivElement>)}
        {...mergeProps(
          {
            role: 'menuitem',
            tabIndex: isHighlighted ? 0 : -1,
            'aria-disabled': disabled || undefined,
            'data-part': 'item',
            'data-disabled': disabled || undefined,
            'data-highlighted': isHighlighted || undefined,
            onClick: () => {
              if (disabled) return
              onSelect?.()
              onItemSelect?.(itemId)
              closeAll()
            },
            onPointerEnter: () => {
              if (disabled) return
              setHighlightedId(itemId)
            },
            onPointerLeave: () => setHighlightedId(null),
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
// Separator
// ============================================

export type SeparatorProps = ComponentPropsWithoutRef<'div'>

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  (props, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        {...mergeProps(
          {
            role: 'separator',
            'data-part': 'separator',
          },
          props,
        )}
      />
    )
  },
)

// ============================================
// Sub (Submenu wrapper)
// ============================================

export type SubProps = {
  children: React.ReactNode
}

export function Sub({ children }: SubProps) {
  const parentContext = useMenuIdContext()
  const subMenuId = useId()

  const menuIdContextValue: MenuIdContextValue = {
    menuId: subMenuId,
    parentMenuId: parentContext.menuId,
  }

  return (
    <MenuIdContext.Provider value={menuIdContextValue}>
      {children}
    </MenuIdContext.Provider>
  )
}

// ============================================
// SubTrigger
// ============================================

export type SubTriggerProps = {
  disabled?: boolean
  textValue?: string
} & ComponentPropsWithoutRef<'div'>

export const SubTrigger = forwardRef<HTMLDivElement, SubTriggerProps>(
  ({ children, disabled = false, textValue, ...rest }, forwardedRef) => {
    const { openedPath, highlightedId, setHighlightedId, openMenu, closeMenu } = useMenuContext()
    const { menuId: subMenuId, parentMenuId } = useMenuIdContext()

    const derivedTextValue =
      textValue ?? (typeof children === 'string' ? children : '')

    const { ref } = useNode<MenuRole, MenuItemMeta>({
      role: 'sub-trigger',
      id: subMenuId,
      meta: {
        menuId: parentMenuId ?? '',
        disabled,
        textValue: derivedTextValue,
        isSubTrigger: true,
        subMenuId,
      },
    })

    const itemId = subMenuId
    const isHighlighted = highlightedId === itemId
    const isOpen = isMenuOpen(openedPath, subMenuId)

    return (
      <div
        ref={composeRefs(forwardedRef, ref as React.Ref<HTMLDivElement>)}
        {...mergeProps(
          {
            role: 'menuitem',
            tabIndex: isHighlighted ? 0 : -1,
            'aria-haspopup': 'menu' as const,
            'aria-expanded': isOpen,
            'aria-disabled': disabled || undefined,
            'data-part': 'sub-trigger',
            'data-state': isOpen ? 'open' : 'closed',
            'data-disabled': disabled || undefined,
            'data-highlighted': isHighlighted || undefined,
            onClick: () => {
              if (disabled) return
              if (isOpen) {
                closeMenu(subMenuId)
              } else if (parentMenuId) {
                openMenu(subMenuId, parentMenuId)
              }
            },
            onPointerEnter: () => {
              if (disabled) return
              setHighlightedId(itemId)
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
// SubContent
// ============================================

export type SubContentProps = {
  placement?: Placement
  sideOffset?: number
} & ComponentPropsWithoutRef<'div'>

export const SubContent = forwardRef<HTMLDivElement, SubContentProps>(
  (
    { children, placement = 'right-start', sideOffset = 4, ...rest },
    forwardedRef,
  ) => {
    const {
      openedPath,
      activeMenuId,
      store,
      closeMenu,
      highlightFirst,
      handleMenuKeyDown,
      handlePointerDownOutside,
    } = useMenuContext()
    const { menuId: subMenuId } = useMenuIdContext()

    const positionerRef = useRef<HTMLDivElement>(null)

    const { domId, ref, elementRef } = useNode<MenuRole, MenuContentMeta>({
      role: 'sub-content',
      id: subMenuId,
      meta: { menuId: subMenuId },
    })

    const subTriggerDomId = useStoreSubscribe(
      store,
      (s) => s.getNode(subMenuId, 'sub-trigger')?.domId ?? null,
    )

    const isOpen = isMenuOpen(openedPath, subMenuId)

    const { isPresent, transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => elementRef.current,
    })

    // Auto-focus content and highlight first item when submenu becomes present
    useLayoutEffect(() => {
      if (!isPresent) return
      requestAnimationFrame(() => {
        elementRef.current?.focus()
        if (activeMenuId === subMenuId) {
          highlightFirst()
        }
      })
    }, [isPresent, elementRef, activeMenuId, subMenuId, highlightFirst])

    // Positioning with floating-ui
    useLayoutEffect(() => {
      const subTriggerNode = store.getNode(subMenuId, 'sub-trigger')
      const trigger = subTriggerNode?.element
      const positioner = positionerRef.current
      if (!trigger || !positioner) return

      const updatePosition = () => {
        computePosition(trigger, positioner, {
          placement,
          middleware: [offset(sideOffset), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          Object.assign(positioner.style, {
            left: `${x}px`,
            top: `${y}px`,
          })
        })
      }

      const cleanup = autoUpdate(trigger, positioner, updatePosition)
      return cleanup
    }, [placement, sideOffset, subMenuId, store])

    const handleEscapeKeyDown = useCallback(() => {
      closeMenu(subMenuId)
    }, [closeMenu, subMenuId])

    return (
      <div
        ref={positionerRef}
        data-part="positioner"
        style={{
          position: 'absolute' as const,
          top: 0,
          left: 0,
          minWidth: 'max-content',
        }}
      >
        {isPresent && (
          <DismissableLayer
            isActive={isOpen}
            dismissOnEscape={true}
            onEscapeKeyDown={handleEscapeKeyDown}
            onPointerDownOutside={handlePointerDownOutside}
            contentRef={elementRef}
          >
            <div
              ref={composeRefs(forwardedRef, ref as React.Ref<HTMLDivElement>)}
              {...mergeProps(
                {
                  role: 'menu',
                  id: domId,
                  'aria-labelledby': subTriggerDomId ?? undefined,
                  tabIndex: -1,
                  'data-part': 'sub-content',
                  'data-state': isOpen ? 'open' : 'closed',
                  'data-transition': transitionState,
                  onKeyDown: handleMenuKeyDown,
                },
                rest,
              )}
            >
              <ParentProvider id={subMenuId}>{children}</ParentProvider>
            </div>
          </DismissableLayer>
        )}
      </div>
    )
  },
)

// ============================================
// Export
// ============================================

const Menu = {
  Root,
  Trigger,
  Portal,
  Content,
  Item,
  Separator,
  Sub,
  SubTrigger,
  SubContent,
}

export default Menu
