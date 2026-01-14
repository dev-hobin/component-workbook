import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
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
import { useMachine, type Send } from 'controlled-machine/react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import {
  menuMachine,
  isMenuOpen,
  type MenuEvents,
  type MenuComputed,
  type MenuId,
  type ItemId,
} from './machine'
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

// NodeStore Roles & Meta
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

type MenuSnapshot = MenuComputed & {
  openedPath: MenuId[]
  highlightedId: ItemId | null
}

type MenuContextValue = {
  // State
  send: Send<MenuEvents>
  snapshot: MenuSnapshot

  // NodeStore (replaces manual registries)
  store: NodeStore<MenuRole, MenuMeta>

  // Options
  loop: boolean

  // Callbacks
  onItemSelect?: (id: ItemId) => void
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

  // Ref for machine snapshot (used in callbacks)
  const snapshotRef = useRef<MenuSnapshot | null>(null)

  // DOM helpers using NodeStore
  const focusContent = useCallback(() => {
    requestAnimationFrame(() => {
      const currentPath = snapshotRef.current?.openedPath ?? []
      const activeMenuId = currentPath[currentPath.length - 1]
      if (!activeMenuId) return

      // Query store for content element
      const contentNodes = store.filterNodesByRolesAndMeta(
        ['content', 'sub-content'],
        (meta) => 'menuId' in meta && meta.menuId === activeMenuId,
      )
      contentNodes[0]?.element?.focus()
    })
  }, [store])

  const focusTrigger = useCallback(() => {
    requestAnimationFrame(() => {
      const triggerNode = store.getNodesByRole('trigger')[0]
      triggerNode?.element?.focus()
    })
  }, [store])

  const focusItemById = useCallback(
    (itemId: ItemId) => {
      requestAnimationFrame(() => {
        // Item or SubTrigger
        const itemNode =
          store.getNode(itemId, 'item') ?? store.getNode(itemId, 'sub-trigger')
        itemNode?.element?.focus()
      })
    },
    [store],
  )

  // Machine helpers using NodeStore
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

      // Sort by DOM order
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

  const isSubTrigger = useCallback(
    (itemId: ItemId) => {
      const node = store.getNode(itemId, 'sub-trigger')
      if (node && 'subMenuId' in node.meta) {
        return (node.meta as MenuItemMeta).subMenuId ?? null
      }
      return null
    },
    [store],
  )

  const getParentMenuId = useCallback(
    (menuId: MenuId) => {
      const currentPath = snapshotRef.current?.openedPath ?? []
      const index = currentPath.indexOf(menuId)
      if (index > 0) {
        return currentPath[index - 1]
      }
      return null
    },
    [],
  )

  // Machine
  const [snapshot, send] = useMachine(menuMachine, {
    input: {
      open,
      onOpenChange: setOpen,
      rootMenuId,
      loop,
      getEnabledItemIds,
      getItemTextValue,
      isSubTrigger,
      getParentMenuId,
    },
    actions: {
      // DOM actions override
      focusContent,
      focusTrigger,
      focusItem: () => {
        if (snapshot.highlightedId) {
          focusItemById(snapshot.highlightedId)
        }
      },
    },
  })

  // Keep snapshot ref updated for callbacks
  snapshotRef.current = snapshot

  const contextValue: MenuContextValue = {
    send,
    snapshot,
    store,
    loop,
    onItemSelect,
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
    const { snapshot, send, store } = useMenuContext()
    const { menuId, parentMenuId } = useMenuIdContext()

    // useNode for automatic ID and ref management
    const { domId, ref } = useNode<MenuRole>({
      role: 'trigger',
      id: menuId,
    })

    const isOpen = isMenuOpen(snapshot.openedPath, menuId)

    // Subscribe to content's domId dynamically
    const contentDomId = useStoreSubscribe(
      store,
      (s) => s.getNode(menuId, 'content')?.domId ?? null,
    )

    const handleClick = () => {
      if (isOpen) {
        send('CLOSE', { menuId })
      } else {
        send('OPEN', { menuId, parentMenuId })
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isOpen) return

      switch (e.key) {
        case 'Enter':
        case ' ':
        case 'ArrowDown':
          e.preventDefault()
          send('OPEN', { menuId, parentMenuId, highlightFirst: true })
          break
        case 'ArrowUp':
          e.preventDefault()
          send('OPEN', { menuId, parentMenuId, highlightFirst: false })
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
    const { snapshot, send, store, onItemSelect } =
      useMenuContext()
    const { menuId } = useMenuIdContext()

    const positionerRef = useRef<HTMLDivElement>(null)

    // useNode for automatic ID and ref management
    const { domId, ref, elementRef } = useNode<MenuRole, MenuContentMeta>({
      role: 'content',
      id: menuId,
      meta: { menuId },
    })

    // Subscribe to trigger's domId dynamically
    const triggerDomId = useStoreSubscribe(
      store,
      (s) => s.getNode(menuId, 'trigger')?.domId ?? null,
    )
    const isOpen = isMenuOpen(snapshot.openedPath, menuId)

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

    // Positioning with floating-ui (on Positioner, not Content)
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

    // Get item meta from store for keyboard handling
    const getItemMeta = useCallback(
      (itemId: ItemId) => {
        const node =
          store.getNode(itemId, 'item') ?? store.getNode(itemId, 'sub-trigger')
        return node?.meta as MenuItemMeta | undefined
      },
      [store],
    )

    // Keyboard handler - only process when this menu is the active (topmost) menu
    const handleKeyDown = (e: React.KeyboardEvent) => {
      // State-based topmost check: only handle events when this menu is active
      if (snapshot.activeMenuId !== menuId) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          send('HIGHLIGHT_NEXT')
          break
        case 'ArrowUp':
          e.preventDefault()
          send('HIGHLIGHT_PREV')
          break
        case 'ArrowRight':
          e.preventDefault()
          send('OPEN_SUBMENU')
          break
        case 'ArrowLeft':
          e.preventDefault()
          send('CLOSE_SUBMENU')
          break
        case 'Home':
          e.preventDefault()
          send('HIGHLIGHT_FIRST')
          break
        case 'End':
          e.preventDefault()
          send('HIGHLIGHT_LAST')
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (snapshot.highlightedId) {
            const meta = getItemMeta(snapshot.highlightedId)
            if (meta?.isSubTrigger) {
              send('OPEN_SUBMENU')
            } else {
              meta?.onSelect?.()
              onItemSelect?.(snapshot.highlightedId)
              send('CLOSE_ALL')
            }
          }
          break
        case 'Tab':
          e.preventDefault()
          send('CLOSE_ALL')
          break
        default:
          // Character search
          if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            send('TYPE_CHARACTER', { character: e.key })
          }
          break
      }
    }

    // Escape handler for DismissableLayer
    const handleEscapeKeyDown = useCallback(() => {
      // 현재 메뉴만 닫기
      send('CLOSE', { menuId })
    }, [send, menuId])

    // Outside click handler - check against store directly for fresh data
    const handlePointerDownOutside = useCallback(
      (event: PointerEvent) => {
        const target = event.target as Node | null
        if (!target) {
          send('CLOSE_ALL')
          return
        }

        // Check if click is on trigger
        const triggerNode = store.getNode(menuId, 'trigger')
        if (triggerNode?.element?.contains(target)) {
          return // Don't close - trigger handles its own click
        }

        // Check if click is on any sub-trigger
        const subTriggerNodes = store.getNodesByRole('sub-trigger')
        for (const node of subTriggerNodes) {
          if (node.element?.contains(target)) {
            return // Don't close - sub-trigger handles its own click
          }
        }

        // Check if click is on any content/sub-content
        const contentNodes = store.getNodesByRole('content')
        const subContentNodes = store.getNodesByRole('sub-content')
        for (const node of [...contentNodes, ...subContentNodes]) {
          if (node.element?.contains(target)) {
            return // Click is inside menu tree
          }
        }

        // Truly outside click
        send('CLOSE_ALL')
      },
      [send, store, menuId],
    )

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
                  onKeyDown: handleKeyDown,
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
    const { snapshot, send, onItemSelect } = useMenuContext()
    const { menuId } = useMenuIdContext()

    // Derive textValue from children if not provided
    const derivedTextValue =
      textValue ?? (typeof children === 'string' ? children : '')

    // useNode for automatic ID and ref management with meta
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

    const isHighlighted = snapshot.highlightedId === itemId

    const handleClick = () => {
      if (disabled) return
      onSelect?.()
      onItemSelect?.(itemId)
      send('CLOSE_ALL')
    }

    const handlePointerEnter = () => {
      if (disabled) return
      send('HIGHLIGHT', { id: itemId })
    }

    const handlePointerLeave = () => {
      send('CLEAR_HIGHLIGHT')
    }

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
            onClick: handleClick,
            onPointerEnter: handlePointerEnter,
            onPointerLeave: handlePointerLeave,
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
    const { snapshot, send } = useMenuContext()
    const { menuId: subMenuId, parentMenuId } = useMenuIdContext()

    // Derive textValue from children if not provided
    const derivedTextValue =
      textValue ?? (typeof children === 'string' ? children : '')

    // useNode for automatic ID and ref management
    // SubTrigger uses subMenuId as its itemId (so machine can find it)
    const { ref } = useNode<MenuRole, MenuItemMeta>({
      role: 'sub-trigger',
      id: subMenuId, // Important: Use subMenuId so closeSubmenu can highlight it
      meta: {
        menuId: parentMenuId ?? '',
        disabled,
        textValue: derivedTextValue,
        isSubTrigger: true,
        subMenuId,
      },
    })

    const itemId = subMenuId
    const isHighlighted = snapshot.highlightedId === itemId
    const isOpen = isMenuOpen(snapshot.openedPath, subMenuId)

    const handleClick = () => {
      if (disabled) return
      if (isOpen) {
        send('CLOSE', { menuId: subMenuId })
      } else if (parentMenuId) {
        send('OPEN', { menuId: subMenuId, parentMenuId })
      }
    }

    const handlePointerEnter = () => {
      if (disabled) return
      send('HIGHLIGHT', { id: itemId })
    }

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
            onClick: handleClick,
            onPointerEnter: handlePointerEnter,
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
    const { snapshot, send, store, onItemSelect } =
      useMenuContext()
    const { menuId: subMenuId } = useMenuIdContext()

    const positionerRef = useRef<HTMLDivElement>(null)

    // useNode for automatic ID and ref management
    const { domId, ref, elementRef } = useNode<MenuRole, MenuContentMeta>({
      role: 'sub-content',
      id: subMenuId,
      meta: { menuId: subMenuId },
    })

    // Subscribe to sub-trigger's domId dynamically
    const subTriggerDomId = useStoreSubscribe(
      store,
      (s) => s.getNode(subMenuId, 'sub-trigger')?.domId ?? null,
    )

    const isOpen = isMenuOpen(snapshot.openedPath, subMenuId)

    const { isPresent, transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => elementRef.current,
    })

    // Auto-focus content and highlight first item when submenu becomes present
    useLayoutEffect(() => {
      if (!isPresent) return
      // This submenu just became visible - highlight first item after items are registered
      requestAnimationFrame(() => {
        elementRef.current?.focus()
        // Only highlight if this submenu is the active one
        if (snapshot.activeMenuId === subMenuId) {
          send('HIGHLIGHT_FIRST')
        }
      })
    }, [isPresent, elementRef, snapshot.activeMenuId, subMenuId, send])

    // Positioning with floating-ui (on Positioner, relative to SubTrigger)
    useLayoutEffect(() => {
      // SubTrigger element from store
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

    // Get item meta from store for keyboard handling
    const getItemMeta = useCallback(
      (itemId: ItemId) => {
        const node =
          store.getNode(itemId, 'item') ?? store.getNode(itemId, 'sub-trigger')
        return node?.meta as MenuItemMeta | undefined
      },
      [store],
    )

    // Keyboard handler - only process when this submenu is the active (topmost) menu
    const handleKeyDown = (e: React.KeyboardEvent) => {
      // State-based topmost check: only handle events when this submenu is active
      if (snapshot.activeMenuId !== subMenuId) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          send('HIGHLIGHT_NEXT')
          break
        case 'ArrowUp':
          e.preventDefault()
          send('HIGHLIGHT_PREV')
          break
        case 'ArrowRight':
          e.preventDefault()
          send('OPEN_SUBMENU')
          break
        case 'ArrowLeft':
          e.preventDefault()
          send('CLOSE_SUBMENU')
          break
        case 'Home':
          e.preventDefault()
          send('HIGHLIGHT_FIRST')
          break
        case 'End':
          e.preventDefault()
          send('HIGHLIGHT_LAST')
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (snapshot.highlightedId) {
            const meta = getItemMeta(snapshot.highlightedId)
            if (meta?.isSubTrigger) {
              send('OPEN_SUBMENU')
            } else {
              meta?.onSelect?.()
              onItemSelect?.(snapshot.highlightedId)
              send('CLOSE_ALL')
            }
          }
          break
        case 'Tab':
          e.preventDefault()
          send('CLOSE_ALL')
          break
        default:
          // Character search
          if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            send('TYPE_CHARACTER', { character: e.key })
          }
          break
      }
    }

    // Escape handler for DismissableLayer
    const handleEscapeKeyDown = useCallback(() => {
      // Close this submenu only
      send('CLOSE', { menuId: subMenuId })
    }, [send, subMenuId])

    // Outside click handler - check against store directly for fresh data
    const handlePointerDownOutside = useCallback(
      (event: PointerEvent) => {
        const target = event.target as Node | null
        if (!target) {
          send('CLOSE_ALL')
          return
        }

        // Check if click is on trigger
        const triggerNode = store.getNodesByRole('trigger')[0]
        if (triggerNode?.element?.contains(target)) {
          return // Don't close - trigger handles its own click
        }

        // Check if click is on any sub-trigger
        const subTriggerNodes = store.getNodesByRole('sub-trigger')
        for (const node of subTriggerNodes) {
          if (node.element?.contains(target)) {
            return // Don't close - sub-trigger handles its own click
          }
        }

        // Check if click is on any content/sub-content
        const contentNodes = store.getNodesByRole('content')
        const subContentNodes = store.getNodesByRole('sub-content')
        for (const node of [...contentNodes, ...subContentNodes]) {
          if (node.element?.contains(target)) {
            return // Click is inside menu tree
          }
        }

        // Truly outside click
        send('CLOSE_ALL')
      },
      [send, store],
    )

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
                  onKeyDown: handleKeyDown,
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
