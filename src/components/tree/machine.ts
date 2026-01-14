import { createMachine, and, not } from 'controlled-machine'

// ============================================
// Types
// ============================================

export type ItemValue = string

export type TreeItemMeta = {
  value: ItemValue
  disabled: boolean
  parentValue: ItemValue | null
  depth: number
  textValue: string
}

export type TreeInput = {
  // 확장 상태
  expandedValues: ItemValue[]
  onExpandedValuesChange?: (values: ItemValue[]) => void

  // 선택 상태
  selectedValues: ItemValue[]
  onSelectedValuesChange?: (values: ItemValue[]) => void

  // 옵션
  selectionMode: 'single' | 'multiple'

  // 지연 헬퍼 (NodeStore에서 계산 - 지연 렌더링으로 인해 getter 필요)
  getVisibleItemValues: () => ItemValue[]
  getItemMeta: (value: ItemValue) => TreeItemMeta | null
  getParentValue: (value: ItemValue) => ItemValue | null
  getFirstChildValue: (value: ItemValue) => ItemValue | null
  getSiblingValues: (value: ItemValue) => ItemValue[]
  getItemTextValue: (value: ItemValue) => string
  getHasChildren: (value: ItemValue) => boolean
}

export type TreeInternal = {
  // 하이라이트 (포커스) - internal state
  highlightedValue: ItemValue | null
}

export type TreeEvents = {
  // 확장/축소
  EXPAND: { value: ItemValue }
  COLLAPSE: { value: ItemValue }
  TOGGLE_EXPAND: { value: ItemValue }
  EXPAND_SIBLINGS: undefined // * 키

  // 선택
  SELECT: { value: ItemValue }
  TOGGLE_SELECT: { value: ItemValue } // multi-select

  // 하이라이트 이동
  HIGHLIGHT: { value: ItemValue }
  HIGHLIGHT_NEXT: undefined
  HIGHLIGHT_PREV: undefined
  HIGHLIGHT_FIRST: undefined
  HIGHLIGHT_LAST: undefined

  // 복합 액션 (키보드 매핑용)
  ARROW_RIGHT: undefined
  ARROW_LEFT: undefined
  ACTIVATE: undefined // Enter

  // 문자 검색
  TYPE_CHARACTER: { character: string }

  // DOM 이벤트 (effect에서 send로 호출, Shell에서 action override)
  FOCUS_ITEM: undefined
}

// highlightedValue는 Internal에서 직접 접근
export type TreeComputed = {
  isMultiSelect: boolean
}

export type TreeActions =
  | 'noop'
  // 확장/축소
  | 'expand'
  | 'collapse'
  | 'toggleExpand'
  | 'expandSiblings'
  // 선택
  | 'select'
  | 'toggleSelect'
  // 하이라이트
  | 'highlightById'
  | 'highlightNext'
  | 'highlightPrev'
  | 'highlightFirst'
  | 'highlightLast'
  | 'highlightToFirstChild'
  | 'highlightToParent'
  | 'highlightByCharacter'
  // 복합 키보드 액션
  | 'handleArrowRight'
  | 'handleArrowLeft'
  | 'handleActivate'
  // DOM actions (Shell에서 override)
  | 'focusItem'

export type TreeGuards =
  | 'isMultiSelect'
  | 'hasHighlight'
  | 'highlightedHasChildren'
  | 'highlightedIsInExpanded'

// ============================================
// Machine
// ============================================

/**
 * Tree Machine - 선언적 명세
 *
 * 이 Machine을 읽으면 Tree의 동작이 이해됩니다:
 *
 * ## 상태
 * - expandedValues: 확장된 부모 노드들
 * - selectedValues: 선택된 노드들
 * - highlightedValue: 현재 포커스된 노드
 *
 * ## 주요 이벤트
 * - ARROW_RIGHT: 닫힘→열기, 열림→자식으로
 * - ARROW_LEFT: 열림→닫기, 닫힘/끝노드→부모로
 * - ARROW_DOWN/UP: 보이는 노드 간 이동
 * - ACTIVATE (Enter): 부모→토글, 끝노드→선택
 * - TOGGLE_SELECT (Space): multi-select 모드에서 선택 토글
 *
 * ## Focus vs Selection
 * - Focus(highlight): 키보드 탐색 위치
 * - Selection: 실제 선택된 노드
 * - 화살표 키는 focus만 이동, Enter/Space로 selection 변경
 */
export const treeMachine = createMachine<{
  input: TreeInput
  internal: TreeInternal
  events: TreeEvents
  computed: TreeComputed
  actions: TreeActions
  guards: TreeGuards
}>({
  internal: {
    highlightedValue: null,
  },

  computed: {
    isMultiSelect: (ctx) => ctx.selectionMode === 'multiple',
  },

  guards: {
    isMultiSelect: (ctx) => ctx.selectionMode === 'multiple',
    hasHighlight: (ctx) => ctx.highlightedValue !== null,
    highlightedHasChildren: (ctx) =>
      ctx.highlightedValue !== null && ctx.getHasChildren(ctx.highlightedValue),
    highlightedIsInExpanded: (ctx) =>
      ctx.highlightedValue !== null &&
      ctx.expandedValues.includes(ctx.highlightedValue),
  },

  on: {
    // 확장/축소
    EXPAND: 'expand',
    COLLAPSE: 'collapse',
    TOGGLE_EXPAND: [{ when: 'highlightedHasChildren', do: 'toggleExpand' }],
    EXPAND_SIBLINGS: [{ when: 'hasHighlight', do: 'expandSiblings' }],

    // 선택
    SELECT: 'select',
    TOGGLE_SELECT: [
      { when: 'isMultiSelect', do: 'toggleSelect' },
      { do: 'select' },
    ],

    // 하이라이트
    HIGHLIGHT: 'highlightById',
    HIGHLIGHT_NEXT: 'highlightNext',
    HIGHLIGHT_PREV: 'highlightPrev',
    HIGHLIGHT_FIRST: 'highlightFirst',
    HIGHLIGHT_LAST: 'highlightLast',

    // ArrowRight: 닫힌 부모 → 열기, 열린 부모 → 첫 자식으로
    ARROW_RIGHT: [
      { when: and(['highlightedHasChildren', not('highlightedIsInExpanded')]), do: 'expand' },
      { when: and(['highlightedHasChildren', 'highlightedIsInExpanded']), do: 'highlightToFirstChild' },
    ],

    // ArrowLeft: 열린 부모 → 닫기, 그 외 → 부모로
    ARROW_LEFT: [
      { when: and(['highlightedHasChildren', 'highlightedIsInExpanded']), do: 'collapse' },
      { when: 'hasHighlight', do: 'highlightToParent' },
    ],

    // Enter: 부모 → 토글, 끝 노드 → 선택/토글선택
    ACTIVATE: [
      { when: 'highlightedHasChildren', do: 'toggleExpand' },
      { when: ['hasHighlight', 'isMultiSelect'], do: 'toggleSelect' },
      { when: 'hasHighlight', do: 'select' },
    ],

    // 문자 검색
    TYPE_CHARACTER: 'highlightByCharacter',

    // DOM 이벤트
    FOCUS_ITEM: 'focusItem',
  },

  effects: [
    {
      // 하이라이트 변경 시 DOM 포커스
      watch: (ctx) => ctx.highlightedValue,
      change: (ctx, _prev, _curr, { send }) => {
        if (ctx.highlightedValue) {
          send('FOCUS_ITEM')
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    // value가 payload에 있으면 사용, 없으면 highlightedValue 사용
    expand: (ctx, payload: { value?: ItemValue }) => {
      const value = payload?.value ?? ctx.highlightedValue
      if (!value) return
      if (!ctx.getHasChildren(value)) return
      if (ctx.expandedValues.includes(value)) return

      ctx.onExpandedValuesChange?.([...ctx.expandedValues, value])
    },

    collapse: (ctx, payload: { value?: ItemValue }) => {
      const value = payload?.value ?? ctx.highlightedValue
      if (!value) return
      if (!ctx.expandedValues.includes(value)) return

      ctx.onExpandedValuesChange?.(ctx.expandedValues.filter((v) => v !== value))
    },

    toggleExpand: (ctx, payload: { value?: ItemValue }) => {
      const value = payload?.value ?? ctx.highlightedValue
      if (!value) return
      if (!ctx.getHasChildren(value)) return

      if (ctx.expandedValues.includes(value)) {
        ctx.onExpandedValuesChange?.(
          ctx.expandedValues.filter((v) => v !== value),
        )
      } else {
        ctx.onExpandedValuesChange?.([...ctx.expandedValues, value])
      }
    },

    expandSiblings: (ctx) => {
      // guard: hasHighlight ensures highlightedValue exists
      const siblings = ctx.getSiblingValues(ctx.highlightedValue!)
      const toExpand = siblings.filter((v) => {
        return ctx.getHasChildren(v) && !ctx.expandedValues.includes(v)
      })

      if (toExpand.length > 0) {
        ctx.onExpandedValuesChange?.([...ctx.expandedValues, ...toExpand])
      }
    },

    select: (ctx, payload: { value: ItemValue }) => {
      const { value } = payload
      const meta = ctx.getItemMeta(value)
      if (meta?.disabled) return

      if (ctx.selectionMode === 'single') {
        ctx.onSelectedValuesChange?.([value])
      } else {
        // multi-select: 추가
        if (!ctx.selectedValues.includes(value)) {
          ctx.onSelectedValuesChange?.([...ctx.selectedValues, value])
        }
      }
    },

    toggleSelect: (ctx, payload: { value: ItemValue }) => {
      const { value } = payload
      const meta = ctx.getItemMeta(value)
      if (meta?.disabled) return

      if (ctx.selectedValues.includes(value)) {
        ctx.onSelectedValuesChange?.(
          ctx.selectedValues.filter((v) => v !== value),
        )
      } else {
        ctx.onSelectedValuesChange?.([...ctx.selectedValues, value])
      }
    },

    highlightById: (ctx, payload: { value: ItemValue }, assign) => {
      const meta = ctx.getItemMeta(payload.value)
      if (meta && !meta.disabled) {
        assign({ highlightedValue: payload.value })
      }
    },

    highlightNext: (ctx, _, assign) => {
      const visibleValues = ctx.getVisibleItemValues()
      if (visibleValues.length === 0) return

      if (ctx.highlightedValue === null) {
        assign({ highlightedValue: visibleValues[0] })
        return
      }

      const currentIndex = visibleValues.indexOf(ctx.highlightedValue)
      if (currentIndex === -1) {
        assign({ highlightedValue: visibleValues[0] })
        return
      }

      // 다음 노드 (끝에서 멈춤)
      if (currentIndex < visibleValues.length - 1) {
        assign({ highlightedValue: visibleValues[currentIndex + 1] })
      }
    },

    highlightPrev: (ctx, _, assign) => {
      const visibleValues = ctx.getVisibleItemValues()
      if (visibleValues.length === 0) return

      if (ctx.highlightedValue === null) {
        assign({ highlightedValue: visibleValues[visibleValues.length - 1] })
        return
      }

      const currentIndex = visibleValues.indexOf(ctx.highlightedValue)
      if (currentIndex === -1) {
        assign({ highlightedValue: visibleValues[visibleValues.length - 1] })
        return
      }

      // 이전 노드 (처음에서 멈춤)
      if (currentIndex > 0) {
        assign({ highlightedValue: visibleValues[currentIndex - 1] })
      }
    },

    highlightFirst: (ctx, _, assign) => {
      const visibleValues = ctx.getVisibleItemValues()
      if (visibleValues.length > 0) {
        assign({ highlightedValue: visibleValues[0] })
      }
    },

    highlightLast: (ctx, _, assign) => {
      const visibleValues = ctx.getVisibleItemValues()
      if (visibleValues.length > 0) {
        assign({ highlightedValue: visibleValues[visibleValues.length - 1] })
      }
    },

    highlightToFirstChild: (ctx, _, assign) => {
      // guard: highlightedIsExpanded ensures highlightedValue is expanded parent
      const firstChild = ctx.getFirstChildValue(ctx.highlightedValue!)
      if (firstChild) {
        assign({ highlightedValue: firstChild })
      }
    },

    highlightToParent: (ctx, _, assign) => {
      // guard: hasHighlight ensures highlightedValue exists
      const parentValue = ctx.getParentValue(ctx.highlightedValue!)
      if (parentValue) {
        assign({ highlightedValue: parentValue })
      }
    },

    // 기존 복합 액션 (하위 호환)
    handleArrowRight: (ctx, _, assign) => {
      if (!ctx.highlightedValue) return

      const hasChildren = ctx.getHasChildren(ctx.highlightedValue)
      if (!hasChildren) return

      const isExpanded = ctx.expandedValues.includes(ctx.highlightedValue)

      if (!isExpanded) {
        ctx.onExpandedValuesChange?.([...ctx.expandedValues, ctx.highlightedValue])
      } else {
        const firstChild = ctx.getFirstChildValue(ctx.highlightedValue)
        if (firstChild) {
          assign({ highlightedValue: firstChild })
        }
      }
    },

    handleArrowLeft: (ctx, _, assign) => {
      if (!ctx.highlightedValue) return

      const hasChildren = ctx.getHasChildren(ctx.highlightedValue)
      const isExpanded =
        hasChildren && ctx.expandedValues.includes(ctx.highlightedValue)

      if (isExpanded) {
        ctx.onExpandedValuesChange?.(
          ctx.expandedValues.filter((v) => v !== ctx.highlightedValue),
        )
      } else {
        const parentValue = ctx.getParentValue(ctx.highlightedValue)
        if (parentValue) {
          assign({ highlightedValue: parentValue })
        }
      }
    },

    handleActivate: (ctx) => {
      if (!ctx.highlightedValue) return

      const meta = ctx.getItemMeta(ctx.highlightedValue)
      if (!meta || meta.disabled) return

      const hasChildren = ctx.getHasChildren(ctx.highlightedValue)

      if (hasChildren) {
        if (ctx.expandedValues.includes(ctx.highlightedValue)) {
          ctx.onExpandedValuesChange?.(
            ctx.expandedValues.filter((v) => v !== ctx.highlightedValue),
          )
        } else {
          ctx.onExpandedValuesChange?.([
            ...ctx.expandedValues,
            ctx.highlightedValue,
          ])
        }
      } else {
        if (ctx.selectionMode === 'single') {
          ctx.onSelectedValuesChange?.([ctx.highlightedValue])
        } else {
          if (ctx.selectedValues.includes(ctx.highlightedValue)) {
            ctx.onSelectedValuesChange?.(
              ctx.selectedValues.filter((v) => v !== ctx.highlightedValue),
            )
          } else {
            ctx.onSelectedValuesChange?.([
              ...ctx.selectedValues,
              ctx.highlightedValue,
            ])
          }
        }
      }
    },

    highlightByCharacter: (ctx, payload: { character: string }, assign) => {
      const char = payload.character.toLowerCase()
      const visibleValues = ctx.getVisibleItemValues()

      // 현재 하이라이트 이후부터 검색
      const currentIndex = ctx.highlightedValue
        ? visibleValues.indexOf(ctx.highlightedValue)
        : -1
      const startIndex = currentIndex === -1 ? 0 : currentIndex + 1

      // 현재 위치 이후 검색
      for (let i = startIndex; i < visibleValues.length; i++) {
        const textValue = ctx.getItemTextValue(visibleValues[i])
        if (textValue.toLowerCase().startsWith(char)) {
          assign({ highlightedValue: visibleValues[i] })
          return
        }
      }

      // 처음부터 현재 위치까지 검색 (wrap around)
      for (let i = 0; i < startIndex; i++) {
        const textValue = ctx.getItemTextValue(visibleValues[i])
        if (textValue.toLowerCase().startsWith(char)) {
          assign({ highlightedValue: visibleValues[i] })
          return
        }
      }
    },

    // DOM actions (Shell에서 override)
    focusItem: () => {},
  },
})

// ============================================
// Query Helpers
// ============================================

export function isItemExpanded(
  expandedValues: ItemValue[],
  value: ItemValue,
): boolean {
  return expandedValues.includes(value)
}

export function isItemSelected(
  selectedValues: ItemValue[],
  value: ItemValue,
): boolean {
  return selectedValues.includes(value)
}
