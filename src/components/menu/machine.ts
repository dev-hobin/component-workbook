import { createMachine } from 'controlled-machine'

// ============================================
// Types
// ============================================

export type MenuId = string
export type ItemId = string

export type MenuItem = {
  id: ItemId
  menuId: MenuId
}

export type MenuEvents = {
  // Menu 열기/닫기
  OPEN_MENU: { menuId: MenuId; parentMenuId: MenuId | null }
  CLOSE_MENU: { menuId: MenuId }
  CLOSE_ALL: undefined
  CLOSE_AND_FOCUS_TRIGGER: { menuId: MenuId }

  // 포커스 이동
  FOCUS_NEXT: undefined
  FOCUS_PREV: undefined
  FOCUS_FIRST: undefined
  FOCUS_LAST: undefined
  SET_FOCUS: { itemId: ItemId | null }

  // 서브메뉴 관련
  OPEN_SUBMENU: undefined // focusedItemId가 서브트리거일 때
  CLOSE_SUBMENU: undefined // 현재 서브메뉴 닫기
}

export type MenuInput = {
  // State
  openedPath: MenuId[]
  focusedItemId: ItemId | null
  onOpenedPathChange: (path: MenuId[]) => void
  onFocusedItemIdChange: (id: ItemId | null) => void

  // Helpers (lazy evaluation)
  getActiveMenuItems: () => MenuItem[]
  isItemSubTrigger: (itemId: ItemId) => boolean

  // DOM helpers
  getItemElement: (itemId: ItemId) => HTMLElement | null
  getTriggerElement: (menuId: MenuId) => HTMLElement | null
  getAllElements: () => Map<string, HTMLElement>
}

// ============================================
// Computed
// ============================================

export type MenuComputed = {
  activeMenuId: MenuId | null
  rootMenuId: MenuId | null
  isActiveMenuSub: boolean
  isOpen: boolean
}

// ============================================
// Machine
// ============================================

type MenuActions =
  | 'noop'
  | 'openMenu'
  | 'closeMenu'
  | 'clearPath'
  | 'clearFocus'
  | 'closeAndFocusTrigger'
  | 'setFocus'
  | 'focusNext'
  | 'focusPrev'
  | 'focusFirst'
  | 'focusLast'
  | 'openFocusedSubmenu'
  | 'closeActiveSubmenu'

export const menuMachine = createMachine<{
  input: MenuInput
  events: MenuEvents
  computed: MenuComputed
  actions: MenuActions
}>({
  computed: {
    activeMenuId: (input) => input.openedPath[input.openedPath.length - 1] ?? null,
    rootMenuId: (input) => input.openedPath[0] ?? null,
    isActiveMenuSub: (input) => input.openedPath.length > 1,
    isOpen: (input) => input.openedPath.length > 0,
  },

  on: {
    OPEN_MENU: 'openMenu',
    CLOSE_MENU: 'closeMenu',
    CLOSE_ALL: ['clearPath', 'clearFocus'],  // 경로 + 포커스 초기화
    CLOSE_AND_FOCUS_TRIGGER: 'closeAndFocusTrigger',

    FOCUS_NEXT: 'focusNext',
    FOCUS_PREV: 'focusPrev',
    FOCUS_FIRST: 'focusFirst',
    FOCUS_LAST: 'focusLast',
    SET_FOCUS: 'setFocus',

    OPEN_SUBMENU: [
      {
        when: (context) =>
          context.focusedItemId !== null && context.isItemSubTrigger(context.focusedItemId),
        do: 'openFocusedSubmenu',
      },
      { do: 'noop' },
    ],

    CLOSE_SUBMENU: [
      { when: (context) => context.isActiveMenuSub, do: 'closeActiveSubmenu' },
      { do: 'noop' },
    ],
  },

  effects: [
    {
      // 메뉴 열림 상태 감시 → outside click listener
      watch: (context) => context.isOpen,
      enter: (context) => {
        const handleOutsideClick = (event: PointerEvent) => {
          const target = event.target as Node | null
          if (!target) return

          const elements = context.getAllElements()
          for (const element of elements.values()) {
            if (element.contains(target)) return
          }

          context.onOpenedPathChange([])
          context.onFocusedItemIdChange(null)
        }

        document.addEventListener('pointerdown', handleOutsideClick, true)
        return () => {
          document.removeEventListener('pointerdown', handleOutsideClick, true)
        }
      },
    },
    {
      // 포커스 변경 감시 → DOM focus 동기화
      watch: (context) => context.focusedItemId,
      change: (context) => {
        if (context.focusedItemId) {
          context.getItemElement(context.focusedItemId)?.focus()
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    openMenu: (context, payload: { menuId: MenuId; parentMenuId: MenuId | null }) => {
      const { menuId, parentMenuId } = payload

      if (parentMenuId === null) {
        // 루트 메뉴
        context.onOpenedPathChange([menuId])
      } else {
        // 서브메뉴: 부모까지의 경로 유지 + 새 메뉴 추가
        const parentIndex = context.openedPath.indexOf(parentMenuId)
        if (parentIndex === -1) {
          context.onOpenedPathChange([parentMenuId, menuId])
        } else {
          const basePath = context.openedPath.slice(0, parentIndex + 1)
          context.onOpenedPathChange([...basePath, menuId])
        }
      }
    },

    closeMenu: (context, payload: { menuId: MenuId }) => {
      const { menuId } = payload
      const index = context.openedPath.indexOf(menuId)
      if (index !== -1) {
        context.onOpenedPathChange(context.openedPath.slice(0, index))
      }
    },

    clearPath: (context) => {
      context.onOpenedPathChange([])
    },

    clearFocus: (context) => {
      context.onFocusedItemIdChange(null)
    },

    closeAndFocusTrigger: (context, payload: { menuId: MenuId }) => {
      const { menuId } = payload
      const index = context.openedPath.indexOf(menuId)
      if (index !== -1) {
        context.onOpenedPathChange(context.openedPath.slice(0, index))
        // 닫히는 메뉴의 ID가 부모 메뉴에서의 서브트리거 아이템 ID
        context.onFocusedItemIdChange(menuId)

        // 루트 메뉴가 닫히면 트리거로 포커스
        if (index === 0) {
          context.getTriggerElement(menuId)?.focus()
        }
      }
    },

    setFocus: (context, payload: { itemId: ItemId | null }) => {
      context.onFocusedItemIdChange(payload.itemId)
    },

    focusNext: (context) => {
      const items = context.getActiveMenuItems()
      if (items.length === 0) return

      if (context.focusedItemId === null) {
        context.onFocusedItemIdChange(items[0].id)
        return
      }

      const currentIndex = items.findIndex((item) => item.id === context.focusedItemId)
      if (currentIndex === -1) {
        context.onFocusedItemIdChange(items[0].id)
        return
      }

      const nextIndex = (currentIndex + 1) % items.length
      context.onFocusedItemIdChange(items[nextIndex].id)
    },

    focusPrev: (context) => {
      const items = context.getActiveMenuItems()
      if (items.length === 0) return

      if (context.focusedItemId === null) {
        context.onFocusedItemIdChange(items[items.length - 1].id)
        return
      }

      const currentIndex = items.findIndex((item) => item.id === context.focusedItemId)
      if (currentIndex === -1) {
        context.onFocusedItemIdChange(items[0].id)
        return
      }

      const prevIndex = (currentIndex - 1 + items.length) % items.length
      context.onFocusedItemIdChange(items[prevIndex].id)
    },

    focusFirst: (context) => {
      const items = context.getActiveMenuItems()
      if (items.length > 0) {
        context.onFocusedItemIdChange(items[0].id)
      }
    },

    focusLast: (context) => {
      const items = context.getActiveMenuItems()
      if (items.length > 0) {
        context.onFocusedItemIdChange(items[items.length - 1].id)
      }
    },

    openFocusedSubmenu: (context) => {
      const focusedId = context.focusedItemId
      if (!focusedId) return
      if (!context.activeMenuId) return

      // focusedId가 서브메뉴의 menuId
      const parentIndex = context.openedPath.indexOf(context.activeMenuId)
      if (parentIndex === -1) return

      const basePath = context.openedPath.slice(0, parentIndex + 1)
      context.onOpenedPathChange([...basePath, focusedId])
    },

    closeActiveSubmenu: (context) => {
      if (!context.activeMenuId) return

      const index = context.openedPath.indexOf(context.activeMenuId)
      if (index > 0) {
        context.onOpenedPathChange(context.openedPath.slice(0, index))
        context.onFocusedItemIdChange(context.activeMenuId)
      }
    },
  },
})

// ============================================
// Query Helpers
// ============================================

export function isMenuOpen(openedPath: MenuId[], menuId: MenuId): boolean {
  return openedPath.includes(menuId)
}

export function getRootMenuId(openedPath: MenuId[]): MenuId | null {
  return openedPath[0] ?? null
}

export function getActiveMenuId(openedPath: MenuId[]): MenuId | null {
  return openedPath[openedPath.length - 1] ?? null
}
