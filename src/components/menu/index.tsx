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

import { useCharacterSearch } from '../../hooks/use-character-search'
import { usePresence } from '../../hooks/use-presence'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'
import { DismissableLayer } from '../../primitives/dismissable-layer'

import { useComponentRegistry, createComponentKey, type ComponentRegistry } from '../../primitives/component-registry'
import {
  createElementRegistry,
  type ElementRegistry,
  type RegistryEntry,
} from '../../primitives/element-registry'
import { RegistrationProvider } from '../../primitives/registration-context'
import { useRegister } from '../../primitives/use-register'

// ============================================
// Types
// ============================================

export type MenuId = string
export type ItemId = string

type MenuMeta = {
  menuId: MenuId
  disabled: boolean
  textValue: string
  isSubTrigger: boolean
  subMenuId?: MenuId
  onSelect?: () => void
}

export function isMenuOpen(openedPath: MenuId[], menuId: MenuId): boolean {
  return openedPath.includes(menuId)
}

type MenuContextValue = {
  componentRegistry: ComponentRegistry
  registry: ElementRegistry<MenuMeta>

  openedPath: MenuId[]
  highlightedId: ItemId | null
  activeMenuId: MenuId | null
  loop: boolean
  onItemSelect?: (id: ItemId) => void

  setHighlightedId: (id: ItemId | null) => void
  openMenu: (menuId: MenuId, parentMenuId: MenuId | null, highlightFirst?: boolean) => void
  closeMenu: (menuId: MenuId) => void
  closeAll: () => void
  openSubmenu: () => void
  closeSubmenu: () => void
  typeahead: (char: string) => void
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
// Helpers
// ============================================

function getEnabledItems(
  registry: ElementRegistry<MenuMeta>,
  menuId: MenuId,
): RegistryEntry<MenuMeta>[] {
  const items = registry.filterEntries(['item', 'sub-trigger'], (entry) => {
    return entry.meta.menuId === menuId && !entry.meta.disabled
  })
  items.sort((a, b) => {
    const pos = a.element.compareDocumentPosition(b.element)
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1
    return 0
  })
  return items
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
  const rootMenuId = useId()

  const [componentRegistry, componentActions] = useComponentRegistry()
  const registryRef = useRef<ElementRegistry<MenuMeta>>(null!)
  if (!registryRef.current) {
    registryRef.current = createElementRegistry<MenuMeta>()
  }
  const registry = registryRef.current

  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  const [openedPath, setOpenedPath] = useState<MenuId[]>([])
  const [highlightedId, setHighlightedIdState] = useState<ItemId | null>(null)

  const activeMenuId = openedPath[openedPath.length - 1] ?? null

  // Sync external open → internal openedPath
  useLayoutEffect(() => {
    if (open) {
      setOpenedPath((prev) => (prev.length === 0 ? [rootMenuId] : prev))
    } else {
      setOpenedPath([])
      setHighlightedIdState(null)
    }
  }, [open, rootMenuId])

  // setHighlightedId: validate against enabled items
  const setHighlightedId = useCallback(
    (id: ItemId | null) => {
      setHighlightedIdState(id)
    },
    [],
  )

  // DOM focus helpers
  const focusContent = useCallback(() => {
    requestAnimationFrame(() => {
      if (!activeMenuId) return
      const contentEntries = registry.filterEntries(
        ['content', 'sub-content'],
        (entry) => entry.meta.menuId === activeMenuId,
      )
      contentEntries[0]?.element?.focus()
    })
  }, [activeMenuId, registry])

  const focusTrigger = useCallback(() => {
    requestAnimationFrame(() => {
      const triggers = registry.getEntriesByRole('trigger')
      triggers[0]?.element?.focus()
    })
  }, [registry])

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
      requestAnimationFrame(() => {
        const entry =
          registry.getEntry('item', highlightedId) ??
          registry.getEntry('sub-trigger', highlightedId)
        entry?.element?.focus()
      })
    }
  }, [highlightedId, registry])

  // Character search
  const typeahead = useCharacterSearch(
    () => {
      if (!activeMenuId) return []
      const items = getEnabledItems(registry, activeMenuId)
      return items.map((entry) => entry.meta.textValue)
    },
    (index) => {
      if (!activeMenuId) return
      const items = getEnabledItems(registry, activeMenuId)
      const item = items[index]
      if (item) setHighlightedIdState(item.value)
    },
    (() => {
      if (!activeMenuId || !highlightedId) return undefined
      const items = getEnabledItems(registry, activeMenuId)
      const idx = items.findIndex((entry) => entry.value === highlightedId)
      return idx >= 0 ? idx : undefined
    })(),
  )

  // ── Actions ──

  const openMenu = useCallback(
    (menuId: MenuId, parentMenuId: MenuId | null, highlightFirst = true) => {
      if (parentMenuId === null) {
        setOpenedPath([menuId])
      } else {
        setOpenedPath((prev) => {
          const parentIndex = prev.indexOf(parentMenuId)
          if (parentIndex === -1) return [parentMenuId, menuId]
          return [...prev.slice(0, parentIndex + 1), menuId]
        })
      }

      requestAnimationFrame(() => {
        const items = getEnabledItems(registry, menuId)
        if (items.length > 0) {
          setHighlightedIdState(
            highlightFirst
              ? items[0].value
              : items[items.length - 1].value,
          )
        }
      })

      if (!open) setOpen(true)
    },
    [open, setOpen, registry],
  )

  const closeMenu = useCallback(
    (menuId: MenuId) => {
      setOpenedPath((prev) => {
        const index = prev.indexOf(menuId)
        if (index === -1) return prev
        const newPath = prev.slice(0, index)
        if (newPath.length === 0 && open) setOpen(false)
        return newPath
      })
      setHighlightedIdState(null)
    },
    [open, setOpen],
  )

  const closeAll = useCallback(() => {
    setOpenedPath([])
    setHighlightedIdState(null)
    if (open) setOpen(false)
  }, [open, setOpen])

  const openSubmenu = useCallback(() => {
    if (!highlightedId || !activeMenuId) return
    const entry = registry.getEntry('sub-trigger', highlightedId)
    if (!entry || !entry.meta.subMenuId) return

    const subMenuId = entry.meta.subMenuId
    setOpenedPath((prev) => [...prev, subMenuId])
    requestAnimationFrame(() => {
      const items = getEnabledItems(registry, subMenuId)
      if (items.length > 0) setHighlightedIdState(items[0].value)
    })
  }, [highlightedId, activeMenuId, registry])

  const closeSubmenu = useCallback(() => {
    if (openedPath.length <= 1) return
    const closingMenuId = openedPath[openedPath.length - 1]
    const parentMenuId = openedPath[openedPath.length - 2]
    setOpenedPath((prev) => prev.slice(0, -1))
    if (parentMenuId) {
      setHighlightedIdState(closingMenuId)
    }
  }, [openedPath])

  // Menu keyboard handler
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    // Scope to the closest [role=menu] — prevents portal synthetic event bubbling
    const target = e.target as HTMLElement
    if (target.closest('[role=menu]') !== e.currentTarget) return

    if (!activeMenuId) return
    const items = getEnabledItems(registry, activeMenuId)
    const currentIndex = items.findIndex((entry) => entry.value === highlightedId)

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        if (items.length === 0) break
        const nextIndex = currentIndex + 1
        const next = loop
          ? items[nextIndex % items.length]
          : items[Math.min(nextIndex, items.length - 1)]
        if (next) setHighlightedIdState(next.value)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        if (items.length === 0) break
        const prevIndex = currentIndex - 1
        const prev = loop
          ? items[(prevIndex + items.length) % items.length]
          : items[Math.max(prevIndex, 0)]
        if (prev) setHighlightedIdState(prev.value)
        break
      }
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
        if (items.length > 0) setHighlightedIdState(items[0].value)
        break
      case 'End':
        e.preventDefault()
        if (items.length > 0) setHighlightedIdState(items[items.length - 1].value)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (highlightedId) {
          const entry = registry.getEntry('sub-trigger', highlightedId)
          if (entry?.meta.subMenuId) {
            openSubmenu()
          } else {
            const itemEntry = registry.getEntry('item', highlightedId)
            itemEntry?.meta.onSelect?.()
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

  const handlePointerDownOutside = useCallback(
    (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) {
        closeAll()
        return
      }

      const roles = ['trigger', 'sub-trigger', 'content', 'sub-content'] as const
      for (const role of roles) {
        const entries = registry.getEntriesByRole(role)
        for (const entry of entries) {
          if (entry.element?.contains(target)) return
        }
      }

      closeAll()
    },
    [closeAll, registry],
  )

  const contextValue: MenuContextValue = {
    componentRegistry,
    registry,
    openedPath,
    highlightedId,
    activeMenuId,
    loop,
    onItemSelect,
    setHighlightedId,
    openMenu,
    closeMenu,
    closeAll,
    openSubmenu,
    closeSubmenu,
    typeahead,
    handleMenuKeyDown,
    handlePointerDownOutside,
  }

  const menuIdContextValue: MenuIdContextValue = {
    menuId: rootMenuId,
    parentMenuId: null,
  }

  return (
    <RegistrationProvider componentActions={componentActions} elementRegistry={registry}>
      <MenuContext.Provider value={contextValue}>
        <MenuIdContext.Provider value={menuIdContextValue}>
          {children}
        </MenuIdContext.Provider>
      </MenuContext.Provider>
    </RegistrationProvider>
  )
}

// ============================================
// Trigger
// ============================================

export type TriggerProps = ComponentPropsWithoutRef<'button'>

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ children, id: userDomId, ...rest }, forwardedRef) => {
    const { componentRegistry, openedPath, openMenu, closeMenu } = useMenuContext()
    const { menuId, parentMenuId } = useMenuIdContext()

    const { domId, ref } = useRegister<MenuMeta>({
      value: menuId,
      role: 'trigger',
      id: userDomId,
      meta: { menuId, disabled: false, textValue: '', isSubTrigger: false },
    })

    const isOpen = isMenuOpen(openedPath, menuId)
    const contentDomId = componentRegistry.get(createComponentKey('content', menuId))

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
    { children, id: userDomId, placement = 'bottom-start', sideOffset = 4, ...rest },
    forwardedRef,
  ) => {
    const {
      componentRegistry,
      registry,
      openedPath,
      closeMenu,
      handleMenuKeyDown,
      handlePointerDownOutside,
    } = useMenuContext()
    const { menuId } = useMenuIdContext()

    const positionerRef = useRef<HTMLDivElement>(null)
    const elementRef = useRef<HTMLDivElement>(null)

    const { domId, ref } = useRegister<MenuMeta>({
      value: menuId,
      role: 'content',
      id: userDomId,
      meta: { menuId, disabled: false, textValue: '', isSubTrigger: false },
    })

    const triggerDomId = componentRegistry.get(createComponentKey('trigger', menuId))
    const isOpen = isMenuOpen(openedPath, menuId)

    const { isPresent, transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => elementRef.current,
    })

    useLayoutEffect(() => {
      if (!isPresent) return
      requestAnimationFrame(() => {
        elementRef.current?.focus()
      })
    }, [isPresent])

    useLayoutEffect(() => {
      const trigger = registry.getElement('trigger', menuId)
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
    }, [placement, sideOffset, menuId, registry])

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
              ref={composeRefs(forwardedRef, ref as React.Ref<HTMLDivElement>, elementRef)}
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
              {children}
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
    const { highlightedId, setHighlightedId, closeAll, onItemSelect } =
      useMenuContext()
    const { menuId } = useMenuIdContext()

    const derivedTextValue =
      textValue ?? (typeof children === 'string' ? children : '')

    const { ref, value: itemId } = useRegister<MenuMeta>({
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
    const { openedPath, highlightedId, setHighlightedId, openMenu, closeMenu } =
      useMenuContext()
    const { menuId: subMenuId, parentMenuId } = useMenuIdContext()

    const derivedTextValue =
      textValue ?? (typeof children === 'string' ? children : '')

    const { ref } = useRegister<MenuMeta>({
      value: subMenuId,
      role: 'sub-trigger',
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
    { children, id: userDomId, placement = 'right-start', sideOffset = 4, ...rest },
    forwardedRef,
  ) => {
    const {
      componentRegistry,
      registry,
      openedPath,
      closeMenu,
      handleMenuKeyDown,
      handlePointerDownOutside,
    } = useMenuContext()
    const { menuId: subMenuId } = useMenuIdContext()

    const positionerRef = useRef<HTMLDivElement>(null)
    const elementRef = useRef<HTMLDivElement>(null)

    const { domId, ref } = useRegister<MenuMeta>({
      value: subMenuId,
      role: 'sub-content',
      id: userDomId,
      meta: { menuId: subMenuId, disabled: false, textValue: '', isSubTrigger: false },
    })

    const subTriggerDomId = componentRegistry.get(createComponentKey('sub-trigger', subMenuId))
    const isOpen = isMenuOpen(openedPath, subMenuId)

    const { isPresent, transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => elementRef.current,
    })

    useLayoutEffect(() => {
      if (!isPresent) return
      requestAnimationFrame(() => {
        elementRef.current?.focus()
      })
    }, [isPresent])

    useLayoutEffect(() => {
      const trigger = registry.getElement('sub-trigger', subMenuId)
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
    }, [placement, sideOffset, subMenuId, registry])

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
              ref={composeRefs(forwardedRef, ref as React.Ref<HTMLDivElement>, elementRef)}
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
              {children}
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
