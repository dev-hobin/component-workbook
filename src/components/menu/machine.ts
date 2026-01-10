import { createEventMachine } from '../../event-machine'

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

export type MenuContext = {
  // State
  openedPath: MenuId[]
  focusedItemId: ItemId | null
  setOpenedPath: (path: MenuId[]) => void
  setFocusedItemId: (id: ItemId | null) => void

  // Helpers (lazy evaluation)
  getActiveMenuId: () => MenuId | null
  getActiveMenuItems: () => MenuItem[]
  isActiveMenuSub: () => boolean
  isItemSubTrigger: (itemId: ItemId) => boolean

  // DOM helpers
  getItemElement: (itemId: ItemId) => HTMLElement | null
  getTriggerElement: (menuId: MenuId) => HTMLElement | null
  getAllElements: () => Map<string, HTMLElement>
}

// ============================================
// Machine
// ============================================

type MenuActions =
  | 'noop'
  | 'openMenu'
  | 'closeMenu'
  | 'closeAll'
  | 'closeAndFocusTrigger'
  | 'setFocus'
  | 'focusNext'
  | 'focusPrev'
  | 'focusFirst'
  | 'focusLast'
  | 'openFocusedSubmenu'
  | 'closeActiveSubmenu'

export const menuMachine = createEventMachine<{
  context: MenuContext
  events: MenuEvents
  actions: MenuActions
}>({
  on: {
    OPEN_MENU: 'openMenu',
    CLOSE_MENU: 'closeMenu',
    CLOSE_ALL: 'closeAll',
    CLOSE_AND_FOCUS_TRIGGER: 'closeAndFocusTrigger',

    FOCUS_NEXT: 'focusNext',
    FOCUS_PREV: 'focusPrev',
    FOCUS_FIRST: 'focusFirst',
    FOCUS_LAST: 'focusLast',
    SET_FOCUS: 'setFocus',

    OPEN_SUBMENU: [
      {
        when: (ctx) =>
          ctx.focusedItemId !== null && ctx.isItemSubTrigger(ctx.focusedItemId),
        do: 'openFocusedSubmenu',
      },
      { do: 'noop' },
    ],

    CLOSE_SUBMENU: [
      { when: (ctx) => ctx.isActiveMenuSub(), do: 'closeActiveSubmenu' },
      { do: 'noop' },
    ],
  },

  effects: [
    {
      // 메뉴 열림 상태 감시 → outside click listener
      watch: (ctx) => ctx.openedPath.length > 0,
      enter: (ctx) => {
        const handleOutsideClick = (event: PointerEvent) => {
          const target = event.target as Node | null
          if (!target) return

          const elements = ctx.getAllElements()
          for (const element of elements.values()) {
            if (element.contains(target)) return
          }

          ctx.setOpenedPath([])
          ctx.setFocusedItemId(null)
        }

        document.addEventListener('pointerdown', handleOutsideClick, true)
        return () => {
          document.removeEventListener('pointerdown', handleOutsideClick, true)
        }
      },
    },
    {
      // 포커스 변경 감시 → DOM focus 동기화
      watch: (ctx) => ctx.focusedItemId,
      change: (ctx) => {
        if (ctx.focusedItemId) {
          ctx.getItemElement(ctx.focusedItemId)?.focus()
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    openMenu: (ctx, payload: { menuId: MenuId; parentMenuId: MenuId | null }) => {
      const { menuId, parentMenuId } = payload

      if (parentMenuId === null) {
        // 루트 메뉴
        ctx.setOpenedPath([menuId])
      } else {
        // 서브메뉴: 부모까지의 경로 유지 + 새 메뉴 추가
        const parentIndex = ctx.openedPath.indexOf(parentMenuId)
        if (parentIndex === -1) {
          ctx.setOpenedPath([parentMenuId, menuId])
        } else {
          const basePath = ctx.openedPath.slice(0, parentIndex + 1)
          ctx.setOpenedPath([...basePath, menuId])
        }
      }
    },

    closeMenu: (ctx, payload: { menuId: MenuId }) => {
      const { menuId } = payload
      const index = ctx.openedPath.indexOf(menuId)
      if (index !== -1) {
        ctx.setOpenedPath(ctx.openedPath.slice(0, index))
      }
    },

    closeAll: (ctx) => {
      ctx.setOpenedPath([])
      ctx.setFocusedItemId(null)
    },

    closeAndFocusTrigger: (ctx, payload: { menuId: MenuId }) => {
      const { menuId } = payload
      const index = ctx.openedPath.indexOf(menuId)
      if (index !== -1) {
        ctx.setOpenedPath(ctx.openedPath.slice(0, index))
        // 닫히는 메뉴의 ID가 부모 메뉴에서의 서브트리거 아이템 ID
        ctx.setFocusedItemId(menuId)

        // 루트 메뉴가 닫히면 트리거로 포커스
        if (index === 0) {
          ctx.getTriggerElement(menuId)?.focus()
        }
      }
    },

    setFocus: (ctx, payload: { itemId: ItemId | null }) => {
      ctx.setFocusedItemId(payload.itemId)
    },

    focusNext: (ctx) => {
      const items = ctx.getActiveMenuItems()
      if (items.length === 0) return

      if (ctx.focusedItemId === null) {
        ctx.setFocusedItemId(items[0].id)
        return
      }

      const currentIndex = items.findIndex((item) => item.id === ctx.focusedItemId)
      if (currentIndex === -1) {
        ctx.setFocusedItemId(items[0].id)
        return
      }

      const nextIndex = (currentIndex + 1) % items.length
      ctx.setFocusedItemId(items[nextIndex].id)
    },

    focusPrev: (ctx) => {
      const items = ctx.getActiveMenuItems()
      if (items.length === 0) return

      if (ctx.focusedItemId === null) {
        ctx.setFocusedItemId(items[items.length - 1].id)
        return
      }

      const currentIndex = items.findIndex((item) => item.id === ctx.focusedItemId)
      if (currentIndex === -1) {
        ctx.setFocusedItemId(items[0].id)
        return
      }

      const prevIndex = (currentIndex - 1 + items.length) % items.length
      ctx.setFocusedItemId(items[prevIndex].id)
    },

    focusFirst: (ctx) => {
      const items = ctx.getActiveMenuItems()
      if (items.length > 0) {
        ctx.setFocusedItemId(items[0].id)
      }
    },

    focusLast: (ctx) => {
      const items = ctx.getActiveMenuItems()
      if (items.length > 0) {
        ctx.setFocusedItemId(items[items.length - 1].id)
      }
    },

    openFocusedSubmenu: (ctx) => {
      const focusedId = ctx.focusedItemId
      if (!focusedId) return

      const activeMenuId = ctx.getActiveMenuId()
      if (!activeMenuId) return

      // focusedId가 서브메뉴의 menuId
      const parentIndex = ctx.openedPath.indexOf(activeMenuId)
      if (parentIndex === -1) return

      const basePath = ctx.openedPath.slice(0, parentIndex + 1)
      ctx.setOpenedPath([...basePath, focusedId])
    },

    closeActiveSubmenu: (ctx) => {
      const activeMenuId = ctx.getActiveMenuId()
      if (!activeMenuId) return

      const index = ctx.openedPath.indexOf(activeMenuId)
      if (index > 0) {
        ctx.setOpenedPath(ctx.openedPath.slice(0, index))
        ctx.setFocusedItemId(activeMenuId)
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
