import { createMachine } from 'controlled-machine'

// ============================================
// Types
// ============================================

export type MenuId = string
export type ItemId = string

export type MenuDom = {
  // 포커스 관리 (Shell이 타이밍 처리)
  focusContent: () => void
  focusTrigger: () => void
  focusItem: (itemId: ItemId) => void
}

export type MenuInput = {
  // 열린 메뉴 경로 (중첩 지원)
  // e.g., ['root-menu', 'sub-menu-1', 'sub-menu-2']
  openedPath: MenuId[]
  onOpenedPathChange: (path: MenuId[]) => void

  // 하이라이트된 아이템 (포커스와 별개)
  highlightedId: ItemId | null
  onHighlightedIdChange: (id: ItemId | null) => void

  // 옵션
  loop: boolean

  // 지연 헬퍼 (NodeStore에서 계산)
  getEnabledItemIds: (menuId: MenuId) => ItemId[]
  getItemTextValue: (itemId: ItemId) => string
  isSubTrigger: (itemId: ItemId) => MenuId | null // 서브메뉴 ID 반환
  getParentMenuId: (menuId: MenuId) => MenuId | null

  // DOM helpers
  dom: MenuDom
}

export type MenuEvents = {
  // 메뉴 열기/닫기
  OPEN: {
    menuId: MenuId
    parentMenuId: MenuId | null
    highlightFirst?: boolean
  }
  CLOSE: { menuId: MenuId }
  CLOSE_ALL: undefined

  // 하이라이트 이동
  HIGHLIGHT: { id: ItemId }
  HIGHLIGHT_FIRST: undefined
  HIGHLIGHT_LAST: undefined
  HIGHLIGHT_NEXT: undefined
  HIGHLIGHT_PREV: undefined
  CLEAR_HIGHLIGHT: undefined

  // 서브메뉴
  OPEN_SUBMENU: undefined // 현재 하이라이트된 아이템이 서브트리거면 열기
  CLOSE_SUBMENU: undefined // 현재 서브메뉴 닫고 부모로 이동

  // 문자 검색
  TYPE_CHARACTER: { character: string }
}

export type MenuComputed = {
  isOpen: boolean
  activeMenuId: MenuId | null
  rootMenuId: MenuId | null
  highlightedId: ItemId | null
}

export type MenuActions =
  | 'noop'
  | 'openMenu'
  | 'closeMenu'
  | 'closeAll'
  | 'highlightById'
  | 'highlightFirst'
  | 'highlightLast'
  | 'highlightNext'
  | 'highlightPrev'
  | 'clearHighlight'
  | 'openSubmenu'
  | 'closeSubmenu'
  | 'highlightByCharacter'

// ============================================
// Machine
// ============================================

/**
 * Menu Machine - 선언적 명세
 *
 * 이 Machine을 읽으면 Menu의 동작이 이해됩니다:
 *
 * ## 상태
 * - openedPath: 열린 메뉴 경로 (중첩 지원)
 * - highlightedId: 현재 하이라이트된 아이템
 *
 * ## 이벤트
 * - OPEN → 메뉴 열기 (경로에 추가)
 * - CLOSE → 해당 메뉴 닫기 (경로에서 제거)
 * - CLOSE_ALL → 모든 메뉴 닫기
 * - HIGHLIGHT_NEXT/PREV → 하이라이트 이동
 * - OPEN_SUBMENU → 서브트리거에서 서브메뉴 열기
 * - CLOSE_SUBMENU → 서브메뉴 닫고 부모로 이동
 * - TYPE_CHARACTER → 문자 검색
 *
 * ## 부수효과 (Effects)
 * - 메뉴 열림 시: Content에 포커스
 * - 메뉴 닫힘 시: Trigger로 포커스 복귀
 * - 하이라이트 변경 시: 해당 아이템에 DOM 포커스
 *
 * Note: Escape 키는 DismissableLayer가 처리 (Shell에서 설정)
 */
export const menuMachine = createMachine<{
  input: MenuInput
  events: MenuEvents
  computed: MenuComputed
  actions: MenuActions
}>({
  computed: {
    isOpen: (ctx) => ctx.openedPath.length > 0,
    activeMenuId: (ctx) => ctx.openedPath[ctx.openedPath.length - 1] ?? null,
    rootMenuId: (ctx) => ctx.openedPath[0] ?? null,
    highlightedId: (ctx) => ctx.highlightedId,
  },

  on: {
    OPEN: 'openMenu',
    CLOSE: 'closeMenu',
    CLOSE_ALL: 'closeAll',

    HIGHLIGHT: 'highlightById',
    HIGHLIGHT_FIRST: 'highlightFirst',
    HIGHLIGHT_LAST: 'highlightLast',
    HIGHLIGHT_NEXT: 'highlightNext',
    HIGHLIGHT_PREV: 'highlightPrev',
    CLEAR_HIGHLIGHT: 'clearHighlight',

    // 서브메뉴: 하이라이트된 아이템이 서브트리거인 경우만
    OPEN_SUBMENU: [
      {
        when: (ctx) => {
          if (!ctx.highlightedId) return false
          return ctx.isSubTrigger(ctx.highlightedId) !== null
        },
        do: 'openSubmenu',
      },
      { do: 'noop' },
    ],

    // 서브메뉴 닫기: 서브메뉴가 열려있는 경우만
    CLOSE_SUBMENU: [
      { when: (ctx) => ctx.openedPath.length > 1, do: 'closeSubmenu' },
      { do: 'noop' },
    ],

    TYPE_CHARACTER: 'highlightByCharacter',
  },

  effects: [
    {
      // 메뉴 열림/닫힘 시 포커스 관리
      watch: (ctx) => ctx.openedPath.length > 0,
      enter: (ctx) => {
        ctx.dom.focusContent()

        return () => {
          ctx.dom.focusTrigger()
        }
      },
    },
    {
      // 하이라이트 변경 시 DOM 포커스
      watch: (ctx) => ctx.highlightedId,
      change: (ctx) => {
        if (ctx.highlightedId) {
          ctx.dom.focusItem(ctx.highlightedId)
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    openMenu: (ctx, event) => {
      if (!('menuId' in event)) return

      const { menuId, parentMenuId, highlightFirst = true } = event

      if (parentMenuId === null) {
        // 루트 메뉴
        ctx.onOpenedPathChange([menuId])
      } else {
        // 서브메뉴: 부모까지의 경로 유지 + 새 메뉴 추가
        const parentIndex = ctx.openedPath.indexOf(parentMenuId)
        if (parentIndex === -1) {
          ctx.onOpenedPathChange([parentMenuId, menuId])
        } else {
          const basePath = ctx.openedPath.slice(0, parentIndex + 1)
          ctx.onOpenedPathChange([...basePath, menuId])
        }
      }

      // 첫/마지막 아이템 하이라이트
      // Note: 실제 하이라이트는 Content 마운트 후 Shell에서 처리
      if (highlightFirst) {
        const items = ctx.getEnabledItemIds(menuId)
        if (items.length > 0) {
          ctx.onHighlightedIdChange(items[0])
        }
      } else {
        const items = ctx.getEnabledItemIds(menuId)
        if (items.length > 0) {
          ctx.onHighlightedIdChange(items[items.length - 1])
        }
      }
    },

    closeMenu: (ctx, event) => {
      if (!('menuId' in event)) return

      const { menuId } = event
      const index = ctx.openedPath.indexOf(menuId)

      if (index !== -1) {
        ctx.onOpenedPathChange(ctx.openedPath.slice(0, index))
        ctx.onHighlightedIdChange(null)
      }
    },

    closeAll: (ctx) => {
      ctx.onOpenedPathChange([])
      ctx.onHighlightedIdChange(null)
    },

    highlightById: (ctx, event) => {
      if ('id' in event) {
        ctx.onHighlightedIdChange(event.id)
      }
    },

    highlightFirst: (ctx) => {
      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]
      if (!activeMenuId) return

      const items = ctx.getEnabledItemIds(activeMenuId)
      if (items.length > 0) {
        ctx.onHighlightedIdChange(items[0])
      }
    },

    highlightLast: (ctx) => {
      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]
      if (!activeMenuId) return

      const items = ctx.getEnabledItemIds(activeMenuId)
      if (items.length > 0) {
        ctx.onHighlightedIdChange(items[items.length - 1])
      }
    },

    highlightNext: (ctx) => {
      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]
      if (!activeMenuId) return

      const items = ctx.getEnabledItemIds(activeMenuId)
      if (items.length === 0) return

      if (ctx.highlightedId === null) {
        ctx.onHighlightedIdChange(items[0])
        return
      }

      const currentIndex = items.indexOf(ctx.highlightedId)
      if (currentIndex === -1) {
        ctx.onHighlightedIdChange(items[0])
        return
      }

      const nextIndex = ctx.loop
        ? (currentIndex + 1) % items.length
        : Math.min(currentIndex + 1, items.length - 1)

      if (nextIndex !== currentIndex) {
        ctx.onHighlightedIdChange(items[nextIndex])
      }
    },

    highlightPrev: (ctx) => {
      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]
      if (!activeMenuId) return

      const items = ctx.getEnabledItemIds(activeMenuId)
      if (items.length === 0) return

      if (ctx.highlightedId === null) {
        ctx.onHighlightedIdChange(items[items.length - 1])
        return
      }

      const currentIndex = items.indexOf(ctx.highlightedId)
      if (currentIndex === -1) {
        ctx.onHighlightedIdChange(items[items.length - 1])
        return
      }

      const prevIndex = ctx.loop
        ? (currentIndex - 1 + items.length) % items.length
        : Math.max(currentIndex - 1, 0)

      if (prevIndex !== currentIndex) {
        ctx.onHighlightedIdChange(items[prevIndex])
      }
    },

    clearHighlight: (ctx) => {
      ctx.onHighlightedIdChange(null)
    },

    openSubmenu: (ctx) => {
      if (!ctx.highlightedId) return

      const subMenuId = ctx.isSubTrigger(ctx.highlightedId)
      if (!subMenuId) return

      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]
      if (!activeMenuId) return

      // 서브메뉴 열기
      const basePath = ctx.openedPath
      ctx.onOpenedPathChange([...basePath, subMenuId])

      // 첫 아이템 하이라이트
      const items = ctx.getEnabledItemIds(subMenuId)
      if (items.length > 0) {
        ctx.onHighlightedIdChange(items[0])
      }
    },

    closeSubmenu: (ctx) => {
      if (ctx.openedPath.length <= 1) return

      // 현재 서브메뉴 닫기
      const closingMenuId = ctx.openedPath[ctx.openedPath.length - 1]
      ctx.onOpenedPathChange(ctx.openedPath.slice(0, -1))

      // 닫히는 메뉴의 SubTrigger를 하이라이트
      // closingMenuId가 SubTrigger의 ID이기도 함
      ctx.onHighlightedIdChange(closingMenuId)
    },

    highlightByCharacter: (ctx, event) => {
      if (!('character' in event)) return

      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]
      if (!activeMenuId) return

      const char = event.character.toLowerCase()
      const items = ctx.getEnabledItemIds(activeMenuId)

      // 현재 하이라이트 이후부터 검색
      const currentIndex = ctx.highlightedId
        ? items.indexOf(ctx.highlightedId)
        : -1
      const startIndex = currentIndex === -1 ? 0 : currentIndex + 1

      // 현재 위치 이후 검색
      for (let i = startIndex; i < items.length; i++) {
        const textValue = ctx.getItemTextValue(items[i])
        if (textValue.toLowerCase().startsWith(char)) {
          ctx.onHighlightedIdChange(items[i])
          return
        }
      }

      // 처음부터 현재 위치까지 검색 (wrap around)
      for (let i = 0; i < startIndex; i++) {
        const textValue = ctx.getItemTextValue(items[i])
        if (textValue.toLowerCase().startsWith(char)) {
          ctx.onHighlightedIdChange(items[i])
          return
        }
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
