import { createMachine } from 'controlled-machine'

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
  highlightedOptionId: OptionId | null

  // 상태 변경 콜백 (선언적)
  onOpenChange: (open: boolean) => void
  onInputValueChange: (value: string) => void
  onSelectedValueChange: (value: string | null) => void
  onHighlightedOptionIdChange: (id: OptionId | null) => void

  // 옵션
  autocomplete: AutocompleteMode
  openOnFocus: boolean
  closeOnSelect: boolean
  clearOnSelect: boolean
  loop: boolean

  // 콜백
  onSelect?: (value: string) => void
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

export type ComboboxComputed = {
  isOpen: boolean
  highlightedOptionId: OptionId | null
}

export type ComboboxActions =
  | 'noop'
  | 'open'
  | 'close'
  | 'handleInputChange'
  | 'handleInputBlur'
  | 'highlightNext'
  | 'highlightPrev'
  | 'highlightFirst'
  | 'highlightLast'
  | 'highlightOption'
  | 'clearHighlight'
  | 'selectHighlighted'
  | 'selectOption'
  // DOM actions (Shell에서 override)
  | 'scrollOptionIntoView'
  | 'focusInput'

export type ComboboxGuards =
  | 'isOpen'
  | 'isClosed'
  | 'shouldOpenOnFocus'
  | 'hasHighlight'
  | 'noHighlight'

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
  events: ComboboxEvents
  computed: ComboboxComputed
  actions: ComboboxActions
  guards: ComboboxGuards
}>({
  computed: {
    isOpen: (ctx) => ctx.isOpen,
    highlightedOptionId: (ctx) => ctx.highlightedOptionId,
  },

  guards: {
    isOpen: (ctx) => ctx.isOpen,
    isClosed: (ctx) => !ctx.isOpen,
    shouldOpenOnFocus: (ctx) => ctx.openOnFocus && !ctx.isOpen,
    hasHighlight: (ctx) => ctx.highlightedOptionId !== null,
    noHighlight: (ctx) => ctx.highlightedOptionId === null,
  },

  on: {
    OPEN: 'open',
    CLOSE: 'close',
    TOGGLE: [
      { when: 'isOpen', do: 'close' },
      { do: 'open' },
    ],

    INPUT_CHANGE: 'handleInputChange',
    INPUT_FOCUS: [
      { when: 'shouldOpenOnFocus', do: 'open' },
      { do: 'noop' },
    ],
    INPUT_BLUR: 'handleInputBlur',

    HIGHLIGHT_NEXT: [
      { when: 'isClosed', do: ['open', 'highlightFirst'] },
      { do: 'highlightNext' },
    ],
    HIGHLIGHT_PREV: [
      { when: 'isClosed', do: ['open', 'highlightLast'] },
      { do: 'highlightPrev' },
    ],
    HIGHLIGHT_FIRST: [
      { when: 'isOpen', do: 'highlightFirst' },
      { do: 'noop' },
    ],
    HIGHLIGHT_LAST: [
      { when: 'isOpen', do: 'highlightLast' },
      { do: 'noop' },
    ],

    SELECT_HIGHLIGHTED: [
      { when: 'isClosed', do: 'noop' },
      { when: 'noHighlight', do: 'close' },
      { do: 'selectHighlighted' },
    ],
    SELECT_OPTION: ['selectOption', 'focusInput'],

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

    open: (ctx) => {
      ctx.onOpenChange(true)
    },

    close: (ctx) => {
      ctx.onOpenChange(false)
      ctx.onHighlightedOptionIdChange(null)
    },

    handleInputChange: (ctx, event) => {
      if (!('value' in event) || !('options' in event)) return

      const { value, options } = event
      ctx.onInputValueChange(value)

      // 입력 시 팝업 열기
      if (!ctx.isOpen) {
        ctx.onOpenChange(true)
      }

      // 첫 번째 필터된 옵션 하이라이트 (list 모드)
      if (ctx.autocomplete === 'list' || ctx.autocomplete === 'both') {
        const enabled = options.filter((o: ComboboxOption) => !o.disabled)
        if (enabled.length > 0) {
          ctx.onHighlightedOptionIdChange(enabled[0].id)
        } else {
          ctx.onHighlightedOptionIdChange(null)
        }
      } else {
        ctx.onHighlightedOptionIdChange(null)
      }
    },

    handleInputBlur: (ctx) => {
      // Shell에서 relatedTarget 체크 후 호출
      ctx.onOpenChange(false)
      ctx.onHighlightedOptionIdChange(null)
    },

    highlightFirst: (ctx, event) => {
      if (!('options' in event)) return
      const enabled = event.options.filter((o: ComboboxOption) => !o.disabled)
      if (enabled.length > 0) {
        ctx.onHighlightedOptionIdChange(enabled[0].id)
      }
    },

    highlightLast: (ctx, event) => {
      if (!('options' in event)) return
      const enabled = event.options.filter((o: ComboboxOption) => !o.disabled)
      if (enabled.length > 0) {
        ctx.onHighlightedOptionIdChange(enabled[enabled.length - 1].id)
      }
    },

    highlightNext: (ctx, event) => {
      if (!('options' in event)) return
      const enabled = event.options.filter((o: ComboboxOption) => !o.disabled)
      if (enabled.length === 0) return

      if (ctx.highlightedOptionId === null) {
        ctx.onHighlightedOptionIdChange(enabled[0].id)
        return
      }

      const currentIndex = enabled.findIndex(
        (o: ComboboxOption) => o.id === ctx.highlightedOptionId,
      )
      if (currentIndex === -1) {
        ctx.onHighlightedOptionIdChange(enabled[0].id)
        return
      }

      const nextIndex = ctx.loop
        ? (currentIndex + 1) % enabled.length
        : Math.min(currentIndex + 1, enabled.length - 1)

      if (nextIndex !== currentIndex) {
        ctx.onHighlightedOptionIdChange(enabled[nextIndex].id)
      }
    },

    highlightPrev: (ctx, event) => {
      if (!('options' in event)) return
      const enabled = event.options.filter((o: ComboboxOption) => !o.disabled)
      if (enabled.length === 0) return

      if (ctx.highlightedOptionId === null) {
        ctx.onHighlightedOptionIdChange(enabled[enabled.length - 1].id)
        return
      }

      const currentIndex = enabled.findIndex(
        (o: ComboboxOption) => o.id === ctx.highlightedOptionId,
      )
      if (currentIndex === -1) {
        ctx.onHighlightedOptionIdChange(enabled[enabled.length - 1].id)
        return
      }

      const prevIndex = ctx.loop
        ? (currentIndex - 1 + enabled.length) % enabled.length
        : Math.max(currentIndex - 1, 0)

      if (prevIndex !== currentIndex) {
        ctx.onHighlightedOptionIdChange(enabled[prevIndex].id)
      }
    },

    highlightOption: (ctx, event) => {
      if (!('option' in event)) return
      const { option } = event
      if (!option.disabled) {
        ctx.onHighlightedOptionIdChange(option.id)
      }
    },

    clearHighlight: (ctx) => {
      ctx.onHighlightedOptionIdChange(null)
    },

    selectHighlighted: (ctx, event) => {
      if (!ctx.highlightedOptionId) return
      if (!('options' in event)) return

      const option = event.options.find(
        (o: ComboboxOption) => o.id === ctx.highlightedOptionId,
      )
      if (!option || option.disabled) return

      ctx.onSelectedValueChange(option.value)
      ctx.onSelect?.(option.value)

      if (ctx.clearOnSelect) {
        ctx.onInputValueChange('')
      } else {
        ctx.onInputValueChange(option.label)
      }

      if (ctx.closeOnSelect) {
        ctx.onOpenChange(false)
      }

      ctx.onHighlightedOptionIdChange(null)
    },

    selectOption: (ctx, event) => {
      if (!('option' in event)) return

      const { option } = event
      if (option.disabled) return

      ctx.onSelectedValueChange(option.value)
      ctx.onSelect?.(option.value)

      if (ctx.clearOnSelect) {
        ctx.onInputValueChange('')
      } else {
        ctx.onInputValueChange(option.label)
      }

      if (ctx.closeOnSelect) {
        ctx.onOpenChange(false)
      }

      ctx.onHighlightedOptionIdChange(null)
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
