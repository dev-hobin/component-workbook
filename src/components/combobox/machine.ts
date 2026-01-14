import { createMachine, not } from 'controlled-machine'

// ============================================
// Types
// ============================================

export type OptionId = string

export type AutocompleteMode = 'none' | 'list' | 'inline' | 'both'

export type ComboboxOption = {
  id: OptionId
  value: string
  label: string
  disabled: boolean
}

export type ComboboxInput = {
  // 핵심 상태
  isOpen: boolean
  inputValue: string
  selectedValue: string | null

  // 상태 변경 콜백 (선언적)
  onOpenChange?: (open: boolean) => void
  onInputValueChange?: (value: string) => void
  onSelectedValueChange?: (value: string | null) => void

  // 옵션
  autocomplete: AutocompleteMode
  openOnFocus: boolean
  closeOnSelect: boolean
  clearOnSelect: boolean
  loop: boolean

  // 콜백
  onSelect?: (value: string) => void
}

export type ComboboxInternal = {
  // 하이라이트된 옵션 - internal state
  highlightedOptionId: OptionId | null
}

export type ComboboxEvents = {
  // 팝업
  OPEN: { options: ComboboxOption[] }
  CLOSE: undefined
  TOGGLE: { options: ComboboxOption[] }

  // 입력
  INPUT_CHANGE: { value: string; options: ComboboxOption[] }
  INPUT_FOCUS: { options: ComboboxOption[] }
  INPUT_BLUR: undefined

  // 키보드 네비게이션
  HIGHLIGHT_NEXT: { options: ComboboxOption[] }
  HIGHLIGHT_PREV: { options: ComboboxOption[] }
  HIGHLIGHT_FIRST: { options: ComboboxOption[] }
  HIGHLIGHT_LAST: { options: ComboboxOption[] }

  // 선택
  SELECT_HIGHLIGHTED: { options: ComboboxOption[] }
  SELECT_OPTION: { option: ComboboxOption }

  // 하이라이트
  HIGHLIGHT: { option: ComboboxOption }
  CLEAR_HIGHLIGHT: undefined

  // DOM 이벤트 (effect에서 send로 호출, Shell에서 action override)
  SCROLL_INTO_VIEW: undefined
}

// 모든 상태는 Input/Internal에서 직접 접근하므로 Computed 불필요

export type ComboboxActions =
  | 'noop'
  // 팝업
  | 'open'
  | 'close'
  | 'clearHighlight'
  // 입력
  | 'updateInputValue'
  | 'openIfClosed'
  | 'highlightFirstIfAutocomplete'
  // 하이라이트 이동
  | 'highlightNext'
  | 'highlightPrev'
  | 'highlightFirst'
  | 'highlightLast'
  | 'highlightOption'
  // 선택 (작은 단위)
  | 'setSelectedValue'
  | 'updateInputAfterSelect'
  | 'closeIfCloseOnSelect'
  // 복합 선택
  | 'selectHighlighted'
  | 'selectOption'
  // DOM actions (Shell에서 override)
  | 'scrollOptionIntoView'
  | 'focusInput'

export type ComboboxGuards =
  | 'isOpen'
  | 'openOnFocus'
  | 'hasHighlight'
  | 'isAutocompleteList'

// ============================================
// Machine
// ============================================

/**
 * Combobox Machine - 선언적 명세
 *
 * 이 Machine을 읽으면 Combobox의 동작이 이해됩니다:
 *
 * ## 상태
 * - isOpen: 팝업 열림 여부
 * - inputValue: 입력 필드 값
 * - selectedValue: 선택된 옵션의 값
 * - highlightedOptionId: 현재 하이라이트된 옵션 ID
 *
 * ## 이벤트
 * - OPEN/CLOSE/TOGGLE → 팝업 열기/닫기
 * - INPUT_CHANGE → 입력 변경 (필터링 + 팝업 열기)
 * - HIGHLIGHT_NEXT/PREV → 하이라이트 이동
 * - SELECT_HIGHLIGHTED → 현재 하이라이트된 옵션 선택
 *
 * ## 부수효과 (Effects)
 * - 하이라이트 변경 시 스크롤
 *
 * Note: Escape 키와 외부 클릭은 DismissableLayer가 처리 (Shell에서 설정)
 */
export const comboboxMachine = createMachine<{
  input: ComboboxInput
  internal: ComboboxInternal
  events: ComboboxEvents
  actions: ComboboxActions
  guards: ComboboxGuards
}>({
  internal: {
    highlightedOptionId: null,
  },

  guards: {
    isOpen: (ctx) => ctx.isOpen,
    openOnFocus: (ctx) => ctx.openOnFocus,
    hasHighlight: (ctx) => ctx.highlightedOptionId !== null,
    isAutocompleteList: (ctx) =>
      ctx.autocomplete === 'list' || ctx.autocomplete === 'both',
  },

  on: {
    OPEN: 'open',
    CLOSE: 'close',
    TOGGLE: [{ when: 'isOpen', do: 'close' }, { do: 'open' }],

    // 입력: 값 변경 → 팝업 열기 → 자동완성 모드면 첫 옵션 하이라이트
    INPUT_CHANGE: ['updateInputValue', 'openIfClosed', 'highlightFirstIfAutocomplete'],
    INPUT_FOCUS: [{ when: ['openOnFocus', not('isOpen')], do: 'open' }, { do: 'noop' }],
    INPUT_BLUR: ['close', 'clearHighlight'],

    HIGHLIGHT_NEXT: [
      { when: not('isOpen'), do: ['open', 'highlightFirst'] },
      { do: 'highlightNext' },
    ],
    HIGHLIGHT_PREV: [
      { when: not('isOpen'), do: ['open', 'highlightLast'] },
      { do: 'highlightPrev' },
    ],
    HIGHLIGHT_FIRST: [{ when: 'isOpen', do: 'highlightFirst' }, { do: 'noop' }],
    HIGHLIGHT_LAST: [{ when: 'isOpen', do: 'highlightLast' }, { do: 'noop' }],

    SELECT_HIGHLIGHTED: [
      { when: not('isOpen'), do: 'noop' },
      { when: not('hasHighlight'), do: 'close' },
      { do: ['setSelectedValue', 'updateInputAfterSelect', 'closeIfCloseOnSelect', 'clearHighlight'] },
    ],
    SELECT_OPTION: ['setSelectedValue', 'updateInputAfterSelect', 'closeIfCloseOnSelect', 'clearHighlight', 'focusInput'],

    HIGHLIGHT: 'highlightOption',
    CLEAR_HIGHLIGHT: 'clearHighlight',

    // DOM 이벤트 (effect에서 send로 호출)
    SCROLL_INTO_VIEW: 'scrollOptionIntoView',
  },

  effects: [
    {
      // 하이라이트 변경 시 스크롤
      watch: (ctx) => ctx.highlightedOptionId,
      change: (ctx, _prev, _curr, { send }) => {
        if (ctx.highlightedOptionId) {
          send('SCROLL_INTO_VIEW')
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    // === 팝업 ===
    open: (ctx) => {
      ctx.onOpenChange?.(true)
    },

    close: (ctx) => {
      ctx.onOpenChange?.(false)
    },

    clearHighlight: (_ctx, _, assign) => {
      assign({ highlightedOptionId: null })
    },

    // === 입력 (작은 단위) ===
    updateInputValue: (ctx, payload: { value: string }) => {
      ctx.onInputValueChange?.(payload.value)
    },

    openIfClosed: (ctx) => {
      if (!ctx.isOpen) {
        ctx.onOpenChange?.(true)
      }
    },

    highlightFirstIfAutocomplete: (
      ctx,
      payload: { options: ComboboxOption[] },
      assign,
    ) => {
      if (ctx.autocomplete === 'list' || ctx.autocomplete === 'both') {
        const enabled = payload.options.filter((o) => !o.disabled)
        assign({ highlightedOptionId: enabled[0]?.id ?? null })
      } else {
        assign({ highlightedOptionId: null })
      }
    },

    highlightFirst: (_ctx, payload: { options: ComboboxOption[] }, assign) => {
      const enabled = payload.options.filter((o) => !o.disabled)
      if (enabled.length > 0) {
        assign({ highlightedOptionId: enabled[0].id })
      }
    },

    highlightLast: (_ctx, payload: { options: ComboboxOption[] }, assign) => {
      const enabled = payload.options.filter((o) => !o.disabled)
      if (enabled.length > 0) {
        assign({ highlightedOptionId: enabled[enabled.length - 1].id })
      }
    },

    highlightNext: (ctx, payload: { options: ComboboxOption[] }, assign) => {
      const enabled = payload.options.filter((o) => !o.disabled)
      if (enabled.length === 0) return

      if (ctx.highlightedOptionId === null) {
        assign({ highlightedOptionId: enabled[0].id })
        return
      }

      const currentIndex = enabled.findIndex(
        (o) => o.id === ctx.highlightedOptionId,
      )
      if (currentIndex === -1) {
        assign({ highlightedOptionId: enabled[0].id })
        return
      }

      const nextIndex = ctx.loop
        ? (currentIndex + 1) % enabled.length
        : Math.min(currentIndex + 1, enabled.length - 1)

      if (nextIndex !== currentIndex) {
        assign({ highlightedOptionId: enabled[nextIndex].id })
      }
    },

    highlightPrev: (ctx, payload: { options: ComboboxOption[] }, assign) => {
      const enabled = payload.options.filter((o) => !o.disabled)
      if (enabled.length === 0) return

      if (ctx.highlightedOptionId === null) {
        assign({ highlightedOptionId: enabled[enabled.length - 1].id })
        return
      }

      const currentIndex = enabled.findIndex(
        (o) => o.id === ctx.highlightedOptionId,
      )
      if (currentIndex === -1) {
        assign({ highlightedOptionId: enabled[enabled.length - 1].id })
        return
      }

      const prevIndex = ctx.loop
        ? (currentIndex - 1 + enabled.length) % enabled.length
        : Math.max(currentIndex - 1, 0)

      if (prevIndex !== currentIndex) {
        assign({ highlightedOptionId: enabled[prevIndex].id })
      }
    },

    highlightOption: (_ctx, payload: { option: ComboboxOption }, assign) => {
      const { option } = payload
      if (!option.disabled) {
        assign({ highlightedOptionId: option.id })
      }
    },

    // === 선택 (작은 단위) ===
    setSelectedValue: (ctx, payload: { option?: ComboboxOption; options?: ComboboxOption[] }) => {
      // SELECT_OPTION에서는 option, SELECT_HIGHLIGHTED에서는 options에서 찾음
      const option = payload.option ?? payload.options?.find(
        (o) => o.id === ctx.highlightedOptionId,
      )
      if (!option || option.disabled) return

      ctx.onSelectedValueChange?.(option.value)
      ctx.onSelect?.(option.value)
    },

    updateInputAfterSelect: (ctx, payload: { option?: ComboboxOption; options?: ComboboxOption[] }) => {
      const option = payload.option ?? payload.options?.find(
        (o) => o.id === ctx.highlightedOptionId,
      )
      if (!option || option.disabled) return

      if (ctx.clearOnSelect) {
        ctx.onInputValueChange?.('')
      } else {
        ctx.onInputValueChange?.(option.label)
      }
    },

    closeIfCloseOnSelect: (ctx) => {
      if (ctx.closeOnSelect) {
        ctx.onOpenChange?.(false)
      }
    },

    // === 복합 선택 (기존 호환) ===
    selectHighlighted: (ctx, payload: { options: ComboboxOption[] }, assign) => {
      if (!ctx.highlightedOptionId) return

      const option = payload.options.find(
        (o) => o.id === ctx.highlightedOptionId,
      )
      if (!option || option.disabled) return

      ctx.onSelectedValueChange?.(option.value)
      ctx.onSelect?.(option.value)

      if (ctx.clearOnSelect) {
        ctx.onInputValueChange?.('')
      } else {
        ctx.onInputValueChange?.(option.label)
      }

      if (ctx.closeOnSelect) {
        ctx.onOpenChange?.(false)
      }

      assign({ highlightedOptionId: null })
    },

    selectOption: (ctx, payload: { option: ComboboxOption }, assign) => {
      const { option } = payload
      if (option.disabled) return

      ctx.onSelectedValueChange?.(option.value)
      ctx.onSelect?.(option.value)

      if (ctx.clearOnSelect) {
        ctx.onInputValueChange?.('')
      } else {
        ctx.onInputValueChange?.(option.label)
      }

      if (ctx.closeOnSelect) {
        ctx.onOpenChange?.(false)
      }

      assign({ highlightedOptionId: null })
    },

    // DOM actions (Shell에서 override)
    scrollOptionIntoView: () => {},
    focusInput: () => {},
  },
})

// ============================================
// Helper Functions
// ============================================

/**
 * 옵션 필터링 헬퍼
 */
export function filterOptions(
  options: ComboboxOption[],
  inputValue: string,
  autocomplete: AutocompleteMode,
): ComboboxOption[] {
  // autocomplete가 none이면 필터링 없이 모든 옵션 반환
  if (autocomplete === 'none') {
    return options
  }

  // 입력이 비어있으면 모든 옵션 반환
  if (!inputValue.trim()) {
    return options
  }

  const lowerInput = inputValue.toLowerCase()
  return options.filter((option) =>
    option.label.toLowerCase().includes(lowerInput),
  )
}

/**
 * 옵션이 하이라이트되었는지 확인
 */
export function isHighlighted(
  highlightedOptionId: OptionId | null,
  optionId: OptionId,
): boolean {
  return highlightedOptionId === optionId
}

/**
 * 옵션이 선택되었는지 확인
 */
export function isSelected(
  selectedValue: string | null,
  optionValue: string,
): boolean {
  return selectedValue === optionValue
}
