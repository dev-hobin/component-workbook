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

export type ComboboxDom = {
  scrollOptionIntoView: (optionId: OptionId) => void
  focusInput: () => void
}

export type ComboboxInput = {
  // 핵심 상태
  isOpen: boolean
  inputValue: string
  selectedValue: string | null
  highlightedOptionId: OptionId | null

  // 상태 변경 핸들러
  setIsOpen: (open: boolean) => void
  setInputValue: (value: string) => void
  setSelectedValue: (value: string | null) => void
  setHighlightedOptionId: (id: OptionId | null) => void

  // 옵션
  autocomplete: AutocompleteMode
  openOnFocus: boolean
  closeOnSelect: boolean
  clearOnSelect: boolean
  loop: boolean

  // 콜백
  onSelect?: (value: string) => void

  // 지연 헬퍼 (NodeStore에서 계산)
  getFilteredOptions: () => ComboboxOption[]
  getOptionById: (id: OptionId) => ComboboxOption | null

  // DOM helpers
  dom: ComboboxDom
}

export type ComboboxEvents = {
  // 팝업
  OPEN: undefined
  CLOSE: undefined
  TOGGLE: undefined

  // 입력
  INPUT_CHANGE: { value: string }
  INPUT_FOCUS: undefined
  INPUT_BLUR: undefined

  // 키보드 네비게이션
  HIGHLIGHT_NEXT: undefined
  HIGHLIGHT_PREV: undefined
  HIGHLIGHT_FIRST: undefined
  HIGHLIGHT_LAST: undefined

  // 선택
  SELECT_HIGHLIGHTED: undefined
  SELECT_OPTION: { optionId: OptionId }

  // 하이라이트
  HIGHLIGHT: { optionId: OptionId }
  CLEAR_HIGHLIGHT: undefined
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
}>({
  computed: {
    isOpen: (ctx) => ctx.isOpen,
    highlightedOptionId: (ctx) => ctx.highlightedOptionId,
  },

  on: {
    OPEN: 'open',
    CLOSE: 'close',
    TOGGLE: [
      { when: (ctx) => ctx.isOpen, do: 'close' },
      { do: 'open' },
    ],

    INPUT_CHANGE: 'handleInputChange',
    INPUT_FOCUS: [
      { when: (ctx) => ctx.openOnFocus && !ctx.isOpen, do: 'open' },
      { do: 'noop' },
    ],
    INPUT_BLUR: 'handleInputBlur',

    HIGHLIGHT_NEXT: [
      { when: (ctx) => !ctx.isOpen, do: ['open', 'highlightFirst'] },
      { do: 'highlightNext' },
    ],
    HIGHLIGHT_PREV: [
      { when: (ctx) => !ctx.isOpen, do: ['open', 'highlightLast'] },
      { do: 'highlightPrev' },
    ],
    HIGHLIGHT_FIRST: [
      { when: (ctx) => ctx.isOpen, do: 'highlightFirst' },
      { do: 'noop' },
    ],
    HIGHLIGHT_LAST: [
      { when: (ctx) => ctx.isOpen, do: 'highlightLast' },
      { do: 'noop' },
    ],

    SELECT_HIGHLIGHTED: [
      { when: (ctx) => !ctx.isOpen, do: 'noop' },
      { when: (ctx) => ctx.highlightedOptionId === null, do: 'close' },
      { do: 'selectHighlighted' },
    ],
    SELECT_OPTION: 'selectOption',

    HIGHLIGHT: 'highlightOption',
    CLEAR_HIGHLIGHT: 'clearHighlight',
  },

  effects: [
    {
      // 하이라이트 변경 시 스크롤
      watch: (ctx) => ctx.highlightedOptionId,
      change: (ctx) => {
        if (ctx.highlightedOptionId) {
          ctx.dom.scrollOptionIntoView(ctx.highlightedOptionId)
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    open: (ctx) => {
      ctx.setIsOpen(true)
    },

    close: (ctx) => {
      ctx.setIsOpen(false)
      ctx.setHighlightedOptionId(null)
    },

    handleInputChange: (ctx, event) => {
      if (!('value' in event)) return

      const { value } = event
      ctx.setInputValue(value)

      // 입력 시 팝업 열기
      if (!ctx.isOpen) {
        ctx.setIsOpen(true)
      }

      // 첫 번째 필터된 옵션 하이라이트 (list 모드)
      if (ctx.autocomplete === 'list' || ctx.autocomplete === 'both') {
        const options = ctx.getFilteredOptions()
        const enabled = options.filter((o) => !o.disabled)
        if (enabled.length > 0) {
          ctx.setHighlightedOptionId(enabled[0].id)
        } else {
          ctx.setHighlightedOptionId(null)
        }
      } else {
        ctx.setHighlightedOptionId(null)
      }
    },

    handleInputBlur: (ctx) => {
      // Shell에서 relatedTarget 체크 후 호출
      ctx.setIsOpen(false)
      ctx.setHighlightedOptionId(null)
    },

    highlightFirst: (ctx) => {
      const options = ctx.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length > 0) {
        ctx.setHighlightedOptionId(enabled[0].id)
      }
    },

    highlightLast: (ctx) => {
      const options = ctx.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length > 0) {
        ctx.setHighlightedOptionId(enabled[enabled.length - 1].id)
      }
    },

    highlightNext: (ctx) => {
      const options = ctx.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length === 0) return

      if (ctx.highlightedOptionId === null) {
        ctx.setHighlightedOptionId(enabled[0].id)
        return
      }

      const currentIndex = enabled.findIndex(
        (o) => o.id === ctx.highlightedOptionId,
      )
      if (currentIndex === -1) {
        ctx.setHighlightedOptionId(enabled[0].id)
        return
      }

      const nextIndex = ctx.loop
        ? (currentIndex + 1) % enabled.length
        : Math.min(currentIndex + 1, enabled.length - 1)

      if (nextIndex !== currentIndex) {
        ctx.setHighlightedOptionId(enabled[nextIndex].id)
      }
    },

    highlightPrev: (ctx) => {
      const options = ctx.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length === 0) return

      if (ctx.highlightedOptionId === null) {
        ctx.setHighlightedOptionId(enabled[enabled.length - 1].id)
        return
      }

      const currentIndex = enabled.findIndex(
        (o) => o.id === ctx.highlightedOptionId,
      )
      if (currentIndex === -1) {
        ctx.setHighlightedOptionId(enabled[enabled.length - 1].id)
        return
      }

      const prevIndex = ctx.loop
        ? (currentIndex - 1 + enabled.length) % enabled.length
        : Math.max(currentIndex - 1, 0)

      if (prevIndex !== currentIndex) {
        ctx.setHighlightedOptionId(enabled[prevIndex].id)
      }
    },

    highlightOption: (ctx, event) => {
      if ('optionId' in event) {
        const option = ctx.getOptionById(event.optionId)
        if (option && !option.disabled) {
          ctx.setHighlightedOptionId(event.optionId)
        }
      }
    },

    clearHighlight: (ctx) => {
      ctx.setHighlightedOptionId(null)
    },

    selectHighlighted: (ctx) => {
      if (!ctx.highlightedOptionId) return

      const option = ctx.getOptionById(ctx.highlightedOptionId)
      if (!option || option.disabled) return

      ctx.setSelectedValue(option.value)
      ctx.onSelect?.(option.value)

      if (ctx.clearOnSelect) {
        ctx.setInputValue('')
      } else {
        ctx.setInputValue(option.label)
      }

      if (ctx.closeOnSelect) {
        ctx.setIsOpen(false)
      }

      ctx.setHighlightedOptionId(null)
    },

    selectOption: (ctx, event) => {
      if (!('optionId' in event)) return

      const option = ctx.getOptionById(event.optionId)
      if (!option || option.disabled) return

      ctx.setSelectedValue(option.value)
      ctx.onSelect?.(option.value)

      if (ctx.clearOnSelect) {
        ctx.setInputValue('')
      } else {
        ctx.setInputValue(option.label)
      }

      if (ctx.closeOnSelect) {
        ctx.setIsOpen(false)
      }

      ctx.setHighlightedOptionId(null)
      ctx.dom.focusInput()
    },
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
