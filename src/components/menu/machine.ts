import { createMachine } from 'controlled-machine'

// ============================================
// Types
// ============================================

export type MenuId = string
export type ItemId = string

export type MenuInput = {
  // 외부 제어 상태
  open: boolean
  onOpenChange?: (open: boolean) => void

  // 루트 메뉴 ID
  rootMenuId: MenuId

  // 옵션
  loop: boolean

  // 지연 헬퍼 (NodeStore에서 계산)
  getEnabledItemIds: (menuId: MenuId) => ItemId[]
  getItemTextValue: (itemId: ItemId) => string
  isSubTrigger: (itemId: ItemId) => MenuId | null // 서브메뉴 ID 반환
  getParentMenuId: (menuId: MenuId) => MenuId | null
}

export type MenuInternal = {
  // 열린 메뉴 경로 (중첩 지원) - internal state
  // e.g., ['root-menu', 'sub-menu-1', 'sub-menu-2']
  openedPath: MenuId[]

  // 하이라이트된 아이템 (포커스와 별개) - internal state
  highlightedId: ItemId | null
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

  // DOM 이벤트 (effect에서 send로 호출, Shell에서 action override)
  FOCUS_CONTENT: undefined
  FOCUS_TRIGGER: undefined
  FOCUS_ITEM: undefined
}

// Input/Internal과 키가 겹치면 안 됨
// rootMenuId는 Input에서, highlightedId는 Internal에서 직접 접근
export type MenuComputed = {
  isOpen: boolean
  activeMenuId: MenuId | null
}

export type MenuActions =
  | 'noop'
  // 메뉴 열기/닫기 (작은 단위)
  | 'buildOpenedPath'
  | 'highlightFirstInMenu'
  | 'highlightLastInMenu'
  | 'syncExternalOpenTrue'
  | 'syncExternalOpenFalse'
  | 'clearInternalState'
  // 복합 액션
  | 'openMenu'
  | 'closeMenu'
  | 'closeAll'
  // 하이라이트
  | 'highlightById'
  | 'highlightFirst'
  | 'highlightLast'
  | 'highlightNext'
  | 'highlightPrev'
  | 'clearHighlight'
  // 서브메뉴
  | 'openSubmenu'
  | 'closeSubmenu'
  // 검색
  | 'highlightByCharacter'
  // DOM actions (Shell에서 override)
  | 'focusContent'
  | 'focusTrigger'
  | 'focusItem'

export type MenuGuards =
  | 'isHighlightedSubTrigger'
  | 'hasOpenedSubmenu'
  | 'noHighlight'
  | 'hasActiveMenu'

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
  internal: MenuInternal
  events: MenuEvents
  computed: MenuComputed
  actions: MenuActions
  guards: MenuGuards
}>({
  internal: {
    openedPath: [],
    highlightedId: null,
  },

  computed: {
    isOpen: (ctx) => ctx.open,
    activeMenuId: (ctx) => ctx.openedPath[ctx.openedPath.length - 1] ?? null,
  },

  guards: {
    isHighlightedSubTrigger: (ctx) => {
      if (!ctx.highlightedId) return false
      return ctx.isSubTrigger(ctx.highlightedId) !== null
    },
    hasOpenedSubmenu: (ctx) => ctx.openedPath.length > 1,
    noHighlight: (ctx) => ctx.highlightedId === null,
    hasActiveMenu: (ctx) => ctx.openedPath.length > 0,
  },

  // Sync external open state with internal openedPath
  always: [
    {
      // open=true but openedPath empty → initialize with rootMenuId
      when: (ctx) => ctx.open && ctx.openedPath.length === 0,
      do: (ctx, _, assign) => {
        assign({ openedPath: [ctx.rootMenuId] })
      },
    },
    {
      // open=false but openedPath not empty → clear internal state
      when: (ctx) => !ctx.open && ctx.openedPath.length > 0,
      do: (_, __, assign) => {
        assign({ openedPath: [], highlightedId: null })
      },
    },
  ],

  on: {
    OPEN: 'openMenu',
    CLOSE: 'closeMenu',
    CLOSE_ALL: ['clearInternalState', 'syncExternalOpenFalse'],

    HIGHLIGHT: 'highlightById',
    // 하이라이트: 활성 메뉴가 있을 때만
    HIGHLIGHT_FIRST: [{ when: 'hasActiveMenu', do: 'highlightFirst' }],
    HIGHLIGHT_LAST: [{ when: 'hasActiveMenu', do: 'highlightLast' }],
    HIGHLIGHT_NEXT: [{ when: 'hasActiveMenu', do: 'highlightNext' }],
    HIGHLIGHT_PREV: [{ when: 'hasActiveMenu', do: 'highlightPrev' }],
    CLEAR_HIGHLIGHT: 'clearHighlight',

    // 서브메뉴: 하이라이트된 아이템이 서브트리거인 경우만
    OPEN_SUBMENU: [{ when: 'isHighlightedSubTrigger', do: 'openSubmenu' }],

    // 서브메뉴 닫기: 서브메뉴가 열려있는 경우만
    CLOSE_SUBMENU: [{ when: 'hasOpenedSubmenu', do: 'closeSubmenu' }],

    TYPE_CHARACTER: [{ when: 'hasActiveMenu', do: 'highlightByCharacter' }],

    // DOM 이벤트
    FOCUS_CONTENT: 'focusContent',
    FOCUS_TRIGGER: 'focusTrigger',
    FOCUS_ITEM: 'focusItem',
  },

  effects: [
    {
      // 메뉴 열림 시 Content 포커스, 닫힘 시 Trigger 포커스
      watch: (ctx) => ctx.openedPath.length > 0,
      enter: (_ctx, { send }) => {
        send('FOCUS_CONTENT')
        return () => {
          send('FOCUS_TRIGGER')
        }
      },
    },
    {
      // 하이라이트 변경 시 DOM 포커스
      watch: (ctx) => ctx.highlightedId,
      change: (ctx, _prev, _curr, { send }) => {
        if (ctx.highlightedId) {
          send('FOCUS_ITEM')
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    // === 작은 단위 액션 ===
    syncExternalOpenTrue: (ctx) => {
      if (!ctx.open) {
        ctx.onOpenChange?.(true)
      }
    },

    syncExternalOpenFalse: (ctx) => {
      if (ctx.open) {
        ctx.onOpenChange?.(false)
      }
    },

    clearInternalState: (_ctx, _, assign) => {
      assign({ openedPath: [], highlightedId: null })
    },

    buildOpenedPath: (
      ctx,
      payload: { menuId: MenuId; parentMenuId: MenuId | null },
      assign,
    ) => {
      const { menuId, parentMenuId } = payload

      let newPath: MenuId[]
      if (parentMenuId === null) {
        newPath = [menuId]
      } else {
        const parentIndex = ctx.openedPath.indexOf(parentMenuId)
        if (parentIndex === -1) {
          newPath = [parentMenuId, menuId]
        } else {
          const basePath = ctx.openedPath.slice(0, parentIndex + 1)
          newPath = [...basePath, menuId]
        }
      }

      assign({ openedPath: newPath })
    },

    highlightFirstInMenu: (ctx, payload: { menuId: MenuId }, assign) => {
      const items = ctx.getEnabledItemIds(payload.menuId)
      assign({ highlightedId: items[0] ?? null })
    },

    highlightLastInMenu: (ctx, payload: { menuId: MenuId }, assign) => {
      const items = ctx.getEnabledItemIds(payload.menuId)
      assign({ highlightedId: items[items.length - 1] ?? null })
    },

    // === 복합 액션 (기존 호환) ===
    openMenu: (
      ctx,
      payload: {
        menuId: MenuId
        parentMenuId: MenuId | null
        highlightFirst?: boolean
      },
      assign,
    ) => {
      const { menuId, parentMenuId, highlightFirst = true } = payload

      let newPath: MenuId[]
      if (parentMenuId === null) {
        newPath = [menuId]
      } else {
        const parentIndex = ctx.openedPath.indexOf(parentMenuId)
        if (parentIndex === -1) {
          newPath = [parentMenuId, menuId]
        } else {
          const basePath = ctx.openedPath.slice(0, parentIndex + 1)
          newPath = [...basePath, menuId]
        }
      }

      const items = ctx.getEnabledItemIds(menuId)
      const highlightId = highlightFirst
        ? items[0] ?? null
        : items[items.length - 1] ?? null

      assign({ openedPath: newPath, highlightedId: highlightId })

      if (newPath.length > 0 && !ctx.open) {
        ctx.onOpenChange?.(true)
      }
    },

    closeMenu: (ctx, payload: { menuId: MenuId }, assign) => {
      const { menuId } = payload
      const index = ctx.openedPath.indexOf(menuId)

      if (index !== -1) {
        const newPath = ctx.openedPath.slice(0, index)
        assign({ openedPath: newPath, highlightedId: null })

        if (newPath.length === 0 && ctx.open) {
          ctx.onOpenChange?.(false)
        }
      }
    },

    closeAll: (ctx, _, assign) => {
      assign({ openedPath: [], highlightedId: null })

      if (ctx.open) {
        ctx.onOpenChange?.(false)
      }
    },

    highlightById: (_ctx, payload: { id: ItemId }, assign) => {
      assign({ highlightedId: payload.id })
    },

    highlightFirst: (ctx, _, assign) => {
      // guard: hasActiveMenu ensures activeMenuId exists
      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]!
      const items = ctx.getEnabledItemIds(activeMenuId)
      assign({ highlightedId: items[0] ?? null })
    },

    highlightLast: (ctx, _, assign) => {
      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]!
      const items = ctx.getEnabledItemIds(activeMenuId)
      assign({ highlightedId: items[items.length - 1] ?? null })
    },

    highlightNext: (ctx, _, assign) => {
      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]!
      const items = ctx.getEnabledItemIds(activeMenuId)
      if (items.length === 0) return

      // 하이라이트 없으면 첫 아이템
      if (ctx.highlightedId === null) {
        assign({ highlightedId: items[0] })
        return
      }

      const currentIndex = items.indexOf(ctx.highlightedId)
      const startIndex = currentIndex === -1 ? -1 : currentIndex

      const nextIndex = ctx.loop
        ? (startIndex + 1) % items.length
        : Math.min(startIndex + 1, items.length - 1)

      assign({ highlightedId: items[nextIndex] })
    },

    highlightPrev: (ctx, _, assign) => {
      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]!
      const items = ctx.getEnabledItemIds(activeMenuId)
      if (items.length === 0) return

      // 하이라이트 없으면 마지막 아이템
      if (ctx.highlightedId === null) {
        assign({ highlightedId: items[items.length - 1] })
        return
      }

      const currentIndex = items.indexOf(ctx.highlightedId)
      const startIndex = currentIndex === -1 ? items.length : currentIndex

      const prevIndex = ctx.loop
        ? (startIndex - 1 + items.length) % items.length
        : Math.max(startIndex - 1, 0)

      assign({ highlightedId: items[prevIndex] })
    },

    clearHighlight: (_ctx, _, assign) => {
      assign({ highlightedId: null })
    },

    openSubmenu: (ctx, _, assign) => {
      // guard: isHighlightedSubTrigger ensures highlightedId is a sub-trigger
      const subMenuId = ctx.isSubTrigger(ctx.highlightedId!)!
      const newPath = [...ctx.openedPath, subMenuId]
      const items = ctx.getEnabledItemIds(subMenuId)

      assign({ openedPath: newPath, highlightedId: items[0] ?? null })
    },

    closeSubmenu: (ctx, _, assign) => {
      // guard: hasOpenedSubmenu ensures openedPath.length > 1
      const closingMenuId = ctx.openedPath[ctx.openedPath.length - 1]
      const newPath = ctx.openedPath.slice(0, -1)

      // 닫히는 메뉴의 SubTrigger를 하이라이트 (closingMenuId === subTriggerId)
      assign({ openedPath: newPath, highlightedId: closingMenuId })
    },

    highlightByCharacter: (ctx, payload: { character: string }, assign) => {
      // guard: hasActiveMenu ensures activeMenuId exists
      const activeMenuId = ctx.openedPath[ctx.openedPath.length - 1]!
      const char = payload.character.toLowerCase()
      const items = ctx.getEnabledItemIds(activeMenuId)

      const currentIndex = ctx.highlightedId
        ? items.indexOf(ctx.highlightedId)
        : -1
      const startIndex = currentIndex === -1 ? 0 : currentIndex + 1

      // 현재 위치 이후 검색 → 처음부터 wrap around
      const searchOrder = [
        ...items.slice(startIndex),
        ...items.slice(0, startIndex),
      ]

      for (const itemId of searchOrder) {
        if (ctx.getItemTextValue(itemId).toLowerCase().startsWith(char)) {
          assign({ highlightedId: itemId })
          return
        }
      }
    },

    // DOM actions (Shell에서 override)
    focusContent: () => {},
    focusTrigger: () => {},
    focusItem: () => {},
  },
})

// ============================================
// Query Helpers
// ============================================

export function isMenuOpen(openedPath: MenuId[], menuId: MenuId): boolean {
  return openedPath.includes(menuId)
}
