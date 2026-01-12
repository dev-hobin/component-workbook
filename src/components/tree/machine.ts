import { createMachine } from 'controlled-machine'

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
  onExpandedValuesChange: (values: ItemValue[]) => void

  // 선택 상태
  selectedValues: ItemValue[]
  onSelectedValuesChange: (values: ItemValue[]) => void

  // 하이라이트 (포커스)
  highlightedValue: ItemValue | null
  onHighlightedValueChange: (value: ItemValue | null) => void

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

export type TreeComputed = {
  highlightedValue: ItemValue | null
  isMultiSelect: boolean
}

export type TreeActions =
  | 'noop'
  | 'expand'
  | 'collapse'
  | 'toggleExpand'
  | 'expandSiblings'
  | 'select'
  | 'toggleSelect'
  | 'highlightById'
  | 'highlightNext'
  | 'highlightPrev'
  | 'highlightFirst'
  | 'highlightLast'
  | 'handleArrowRight'
  | 'handleArrowLeft'
  | 'handleActivate'
  | 'highlightByCharacter'
  // DOM actions (Shell에서 override)
  | 'focusItem'

export type TreeGuards = 'isMultiSelect'

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
  events: TreeEvents
  computed: TreeComputed
  actions: TreeActions
  guards: TreeGuards
}>({
  computed: {
    highlightedValue: (ctx) => ctx.highlightedValue,
    isMultiSelect: (ctx) => ctx.selectionMode === 'multiple',
  },

  guards: {
    isMultiSelect: (ctx) => ctx.selectionMode === 'multiple',
  },

  on: {
    // 확장/축소
    EXPAND: 'expand',
    COLLAPSE: 'collapse',
    TOGGLE_EXPAND: 'toggleExpand',
    EXPAND_SIBLINGS: 'expandSiblings',

    // 선택
    SELECT: 'select',
    TOGGLE_SELECT: [
      { when: 'isMultiSelect', do: 'toggleSelect' },
      { do: 'select' }, // single mode에서는 그냥 선택
    ],

    // 하이라이트
    HIGHLIGHT: 'highlightById',
    HIGHLIGHT_NEXT: 'highlightNext',
    HIGHLIGHT_PREV: 'highlightPrev',
    HIGHLIGHT_FIRST: 'highlightFirst',
    HIGHLIGHT_LAST: 'highlightLast',

    // 복합 키보드 액션
    ARROW_RIGHT: 'handleArrowRight',
    ARROW_LEFT: 'handleArrowLeft',
    ACTIVATE: 'handleActivate',

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

    expand: (ctx, event) => {
      if (!('value' in event)) return

      const { value } = event
      if (!ctx.getHasChildren(value)) return
      if (ctx.expandedValues.includes(value)) return

      ctx.onExpandedValuesChange([...ctx.expandedValues, value])
    },

    collapse: (ctx, event) => {
      if (!('value' in event)) return

      const { value } = event
      if (!ctx.expandedValues.includes(value)) return

      ctx.onExpandedValuesChange(ctx.expandedValues.filter((v) => v !== value))
    },

    toggleExpand: (ctx, event) => {
      if (!('value' in event)) return

      const { value } = event
      if (!ctx.getHasChildren(value)) return

      if (ctx.expandedValues.includes(value)) {
        ctx.onExpandedValuesChange(
          ctx.expandedValues.filter((v) => v !== value),
        )
      } else {
        ctx.onExpandedValuesChange([...ctx.expandedValues, value])
      }
    },

    expandSiblings: (ctx) => {
      if (!ctx.highlightedValue) return

      const siblings = ctx.getSiblingValues(ctx.highlightedValue)
      const toExpand = siblings.filter((v) => {
        return ctx.getHasChildren(v) && !ctx.expandedValues.includes(v)
      })

      if (toExpand.length > 0) {
        ctx.onExpandedValuesChange([...ctx.expandedValues, ...toExpand])
      }
    },

    select: (ctx, event) => {
      if (!('value' in event)) return

      const { value } = event
      const meta = ctx.getItemMeta(value)
      if (meta?.disabled) return

      if (ctx.selectionMode === 'single') {
        ctx.onSelectedValuesChange([value])
      } else {
        // multi-select: 추가
        if (!ctx.selectedValues.includes(value)) {
          ctx.onSelectedValuesChange([...ctx.selectedValues, value])
        }
      }
    },

    toggleSelect: (ctx, event) => {
      if (!('value' in event)) return

      const { value } = event
      const meta = ctx.getItemMeta(value)
      if (meta?.disabled) return

      if (ctx.selectedValues.includes(value)) {
        ctx.onSelectedValuesChange(
          ctx.selectedValues.filter((v) => v !== value),
        )
      } else {
        ctx.onSelectedValuesChange([...ctx.selectedValues, value])
      }
    },

    highlightById: (ctx, event) => {
      if ('value' in event) {
        const meta = ctx.getItemMeta(event.value)
        if (meta && !meta.disabled) {
          ctx.onHighlightedValueChange(event.value)
        }
      }
    },

    highlightNext: (ctx) => {
      const visibleValues = ctx.getVisibleItemValues()
      if (visibleValues.length === 0) return

      if (ctx.highlightedValue === null) {
        ctx.onHighlightedValueChange(visibleValues[0])
        return
      }

      const currentIndex = visibleValues.indexOf(ctx.highlightedValue)
      if (currentIndex === -1) {
        ctx.onHighlightedValueChange(visibleValues[0])
        return
      }

      // 다음 노드 (끝에서 멈춤)
      if (currentIndex < visibleValues.length - 1) {
        ctx.onHighlightedValueChange(visibleValues[currentIndex + 1])
      }
    },

    highlightPrev: (ctx) => {
      const visibleValues = ctx.getVisibleItemValues()
      if (visibleValues.length === 0) return

      if (ctx.highlightedValue === null) {
        ctx.onHighlightedValueChange(visibleValues[visibleValues.length - 1])
        return
      }

      const currentIndex = visibleValues.indexOf(ctx.highlightedValue)
      if (currentIndex === -1) {
        ctx.onHighlightedValueChange(visibleValues[visibleValues.length - 1])
        return
      }

      // 이전 노드 (처음에서 멈춤)
      if (currentIndex > 0) {
        ctx.onHighlightedValueChange(visibleValues[currentIndex - 1])
      }
    },

    highlightFirst: (ctx) => {
      const visibleValues = ctx.getVisibleItemValues()
      if (visibleValues.length > 0) {
        ctx.onHighlightedValueChange(visibleValues[0])
      }
    },

    highlightLast: (ctx) => {
      const visibleValues = ctx.getVisibleItemValues()
      if (visibleValues.length > 0) {
        ctx.onHighlightedValueChange(visibleValues[visibleValues.length - 1])
      }
    },

    /**
     * ArrowRight 처리:
     * 1. 닫힌 부모 노드 → 열기
     * 2. 열린 부모 노드 → 첫 자식으로 이동
     * 3. 끝 노드 → 무동작
     */
    handleArrowRight: (ctx) => {
      if (!ctx.highlightedValue) return

      const hasChildren = ctx.getHasChildren(ctx.highlightedValue)

      if (!hasChildren) {
        // 끝 노드: 무동작
        return
      }

      const isExpanded = ctx.expandedValues.includes(ctx.highlightedValue)

      if (!isExpanded) {
        // 닫힌 부모: 열기
        ctx.onExpandedValuesChange([...ctx.expandedValues, ctx.highlightedValue])
      } else {
        // 열린 부모: 첫 자식으로 이동
        const firstChild = ctx.getFirstChildValue(ctx.highlightedValue)
        if (firstChild) {
          ctx.onHighlightedValueChange(firstChild)
        }
      }
    },

    /**
     * ArrowLeft 처리:
     * 1. 열린 부모 노드 → 닫기
     * 2. 닫힌 노드 또는 끝 노드 → 부모로 이동
     * 3. 루트 노드 → 무동작
     */
    handleArrowLeft: (ctx) => {
      if (!ctx.highlightedValue) return

      const hasChildren = ctx.getHasChildren(ctx.highlightedValue)
      const isExpanded =
        hasChildren && ctx.expandedValues.includes(ctx.highlightedValue)

      if (isExpanded) {
        // 열린 부모: 닫기
        ctx.onExpandedValuesChange(
          ctx.expandedValues.filter((v) => v !== ctx.highlightedValue),
        )
      } else {
        // 닫힌 노드 또는 끝 노드: 부모로 이동
        const parentValue = ctx.getParentValue(ctx.highlightedValue)
        if (parentValue) {
          ctx.onHighlightedValueChange(parentValue)
        }
      }
    },

    /**
     * Enter 키 처리:
     * 1. 부모 노드 → 확장/축소 토글
     * 2. 끝 노드 → 선택
     */
    handleActivate: (ctx) => {
      if (!ctx.highlightedValue) return

      const meta = ctx.getItemMeta(ctx.highlightedValue)
      if (!meta || meta.disabled) return

      const hasChildren = ctx.getHasChildren(ctx.highlightedValue)

      if (hasChildren) {
        // 부모 노드: 토글
        if (ctx.expandedValues.includes(ctx.highlightedValue)) {
          ctx.onExpandedValuesChange(
            ctx.expandedValues.filter((v) => v !== ctx.highlightedValue),
          )
        } else {
          ctx.onExpandedValuesChange([
            ...ctx.expandedValues,
            ctx.highlightedValue,
          ])
        }
      } else {
        // 끝 노드: 선택
        if (ctx.selectionMode === 'single') {
          ctx.onSelectedValuesChange([ctx.highlightedValue])
        } else {
          // multi: 토글
          if (ctx.selectedValues.includes(ctx.highlightedValue)) {
            ctx.onSelectedValuesChange(
              ctx.selectedValues.filter((v) => v !== ctx.highlightedValue),
            )
          } else {
            ctx.onSelectedValuesChange([
              ...ctx.selectedValues,
              ctx.highlightedValue,
            ])
          }
        }
      }
    },

    highlightByCharacter: (ctx, event) => {
      if (!('character' in event)) return

      const char = event.character.toLowerCase()
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
          ctx.onHighlightedValueChange(visibleValues[i])
          return
        }
      }

      // 처음부터 현재 위치까지 검색 (wrap around)
      for (let i = 0; i < startIndex; i++) {
        const textValue = ctx.getItemTextValue(visibleValues[i])
        if (textValue.toLowerCase().startsWith(char)) {
          ctx.onHighlightedValueChange(visibleValues[i])
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
