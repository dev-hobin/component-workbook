import { createEventMachine } from '../../event-machine'

// ============================================
// Types
// ============================================

export type OptionId = string

export type AutocompleteMode = 'none' | 'list' | 'inline' | 'both'

export type ComboboxOption = {
  id: OptionId
  value: string
  label: string
  disabled?: boolean
}

// ============================================
// Events
// ============================================

export type ComboboxEvents = {
  // Popup
  OPEN: undefined
  CLOSE: undefined
  TOGGLE: undefined

  // Input
  INPUT_CHANGE: { value: string }
  INPUT_FOCUS: undefined
  INPUT_BLUR: undefined

  // Keyboard
  KEY_ARROW_DOWN: undefined
  KEY_ARROW_UP: undefined
  KEY_ALT_ARROW_DOWN: undefined
  KEY_ENTER: undefined
  KEY_ESCAPE: undefined
  KEY_HOME: undefined
  KEY_END: undefined
  KEY_TAB: undefined

  // Option
  OPTION_CLICK: { optionId: OptionId }
  OPTION_HOVER: { optionId: OptionId }

  // Outside
  OUTSIDE_CLICK: undefined
}

// ============================================
// Context
// ============================================

export type ComboboxContext = {
  // State
  isOpen: boolean
  inputValue: string
  selectedValue: string | null
  highlightedOptionId: OptionId | null
  autocompleteText: string | null

  // Setters
  setOpen: (open: boolean) => void
  setInputValue: (value: string) => void
  setSelectedValue: (value: string | null) => void
  setHighlightedOptionId: (id: OptionId | null) => void
  setAutocompleteText: (text: string | null) => void

  // Options
  autocomplete: AutocompleteMode
  openOnFocus: boolean
  closeOnSelect: boolean
  showAllOnEmpty: boolean
  clearOnSelect: boolean
  loop: boolean

  // Lazy getters
  getFilteredOptions: () => ComboboxOption[]
  getOptionById: (id: OptionId) => ComboboxOption | undefined

  // DOM helpers
  getOptionElement: (optionId: OptionId) => HTMLElement | null
  getInputElement: () => HTMLInputElement | null
  getAllElements: () => Map<string, HTMLElement>

  // Callbacks
  notifySelect: (value: string) => void
}

// ============================================
// Machine
// ============================================

type ComboboxActions =
  | 'noop'
  | 'open'
  | 'close'
  | 'toggle'
  | 'openAndHighlightFirst'
  | 'openAndHighlightLast'
  | 'openAndHighlightSelected'
  | 'highlightFirst'
  | 'highlightLast'
  | 'highlightNext'
  | 'highlightPrev'
  | 'highlightOption'
  | 'selectHighlighted'
  | 'selectOption'
  | 'restoreSelectedValue'
  | 'acceptAutocomplete'
  | 'handleInputChange'
  | 'handleInputBlur'

export const comboboxMachine = createEventMachine<
  ComboboxContext,
  ComboboxEvents,
  Record<string, never>,
  ComboboxActions
>({
  on: {
    OPEN: 'open',
    CLOSE: 'close',
    TOGGLE: 'toggle',

    INPUT_CHANGE: 'handleInputChange',
    INPUT_FOCUS: [
      {
        when: (ctx) => ctx.openOnFocus && !ctx.isOpen,
        do: 'openAndHighlightSelected',
      },
      { do: 'noop' },
    ],
    INPUT_BLUR: 'handleInputBlur',

    KEY_ARROW_DOWN: [
      { when: (ctx) => !ctx.isOpen, do: 'openAndHighlightFirst' },
      { do: 'highlightNext' },
    ],
    KEY_ARROW_UP: [
      { when: (ctx) => !ctx.isOpen, do: 'openAndHighlightLast' },
      { do: 'highlightPrev' },
    ],
    KEY_ALT_ARROW_DOWN: [
      { when: (ctx) => !ctx.isOpen, do: 'open' },
      { do: 'noop' },
    ],
    KEY_ENTER: [
      { when: (ctx) => !ctx.isOpen, do: 'noop' },
      { when: (ctx) => ctx.highlightedOptionId === null, do: 'close' },
      { do: 'selectHighlighted' },
    ],
    KEY_ESCAPE: [
      { when: (ctx) => ctx.isOpen, do: 'close' },
      {
        when: (ctx) =>
          ctx.selectedValue !== null && ctx.inputValue !== ctx.selectedValue,
        do: 'restoreSelectedValue',
      },
      { do: 'noop' },
    ],
    KEY_HOME: [
      { when: (ctx) => ctx.isOpen, do: 'highlightFirst' },
      { do: 'noop' },
    ],
    KEY_END: [
      { when: (ctx) => ctx.isOpen, do: 'highlightLast' },
      { do: 'noop' },
    ],
    KEY_TAB: [
      {
        when: (ctx) => ctx.autocompleteText !== null,
        do: 'acceptAutocomplete',
      },
      { when: (ctx) => ctx.isOpen, do: 'close' },
      { do: 'noop' },
    ],

    OPTION_CLICK: 'selectOption',
    OPTION_HOVER: 'highlightOption',

    OUTSIDE_CLICK: [{ when: (ctx) => ctx.isOpen, do: 'close' }, { do: 'noop' }],
  },

  effects: [
    {
      // Outside click 리스너
      watch: (ctx) => ctx.isOpen,
      enter: (ctx) => {
        const handleClick = (event: PointerEvent) => {
          const target = event.target as Node | null
          if (!target) return

          const elements = ctx.getAllElements()
          for (const element of elements.values()) {
            if (element.contains(target)) return
          }

          ctx.setOpen(false)
          ctx.setHighlightedOptionId(null)
          ctx.setAutocompleteText(null)
        }

        document.addEventListener('pointerdown', handleClick, true)
        return () =>
          document.removeEventListener('pointerdown', handleClick, true)
      },
    },
    {
      // Highlight 변경 시 스크롤
      watch: (ctx) => ctx.highlightedOptionId,
      change: (ctx) => {
        if (ctx.highlightedOptionId) {
          ctx
            .getOptionElement(ctx.highlightedOptionId)
            ?.scrollIntoView({ block: 'nearest' })
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    open: (ctx) => {
      ctx.setOpen(true)
    },

    close: (ctx) => {
      ctx.setOpen(false)
      ctx.setHighlightedOptionId(null)
      ctx.setAutocompleteText(null)
    },

    toggle: (ctx) => {
      if (ctx.isOpen) {
        ctx.setOpen(false)
        ctx.setHighlightedOptionId(null)
        ctx.setAutocompleteText(null)
      } else {
        ctx.setOpen(true)
      }
    },

    openAndHighlightFirst: (ctx) => {
      ctx.setOpen(true)
      const options = ctx.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length > 0) {
        ctx.setHighlightedOptionId(enabled[0].id)
      }
    },

    openAndHighlightLast: (ctx) => {
      ctx.setOpen(true)
      const options = ctx.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length > 0) {
        ctx.setHighlightedOptionId(enabled[enabled.length - 1].id)
      }
    },

    openAndHighlightSelected: (ctx) => {
      ctx.setOpen(true)
      if (ctx.selectedValue) {
        const options = ctx.getFilteredOptions()
        const selected = options.find((o) => o.value === ctx.selectedValue)
        if (selected) {
          ctx.setHighlightedOptionId(selected.id)
        }
      }
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

      const nextIndex = currentIndex + 1
      if (nextIndex >= enabled.length) {
        if (ctx.loop) {
          ctx.setHighlightedOptionId(enabled[0].id)
        }
      } else {
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

      const prevIndex = currentIndex - 1
      if (prevIndex < 0) {
        if (ctx.loop) {
          ctx.setHighlightedOptionId(enabled[enabled.length - 1].id)
        }
      } else {
        ctx.setHighlightedOptionId(enabled[prevIndex].id)
      }
    },

    highlightOption: (ctx, payload: { optionId: string }) => {
      const { optionId } = payload
      const option = ctx.getOptionById(optionId)
      if (option && !option.disabled) {
        ctx.setHighlightedOptionId(optionId)
      }
    },

    selectHighlighted: (ctx) => {
      if (ctx.highlightedOptionId === null) return

      const option = ctx.getOptionById(ctx.highlightedOptionId)
      if (!option || option.disabled) return

      const newInputValue = ctx.clearOnSelect ? '' : option.label
      ctx.setSelectedValue(option.value)
      ctx.setInputValue(newInputValue)
      ctx.setAutocompleteText(null)

      if (ctx.closeOnSelect) {
        ctx.setOpen(false)
        ctx.setHighlightedOptionId(null)
      }

      ctx.notifySelect(option.value)
    },

    selectOption: (ctx, payload: { optionId: OptionId }) => {
      const { optionId } = payload
      const option = ctx.getOptionById(optionId)
      if (!option || option.disabled) return

      const newInputValue = ctx.clearOnSelect ? '' : option.label
      ctx.setSelectedValue(option.value)
      ctx.setInputValue(newInputValue)
      ctx.setAutocompleteText(null)

      if (ctx.closeOnSelect) {
        ctx.setOpen(false)
        ctx.setHighlightedOptionId(null)
      }

      ctx.notifySelect(option.value)
    },

    restoreSelectedValue: (ctx) => {
      if (!ctx.selectedValue) return
      const options = ctx.getFilteredOptions()
      const selected = options.find((o) => o.value === ctx.selectedValue)
      if (selected) {
        ctx.setInputValue(selected.label)
      }
    },

    acceptAutocomplete: (ctx) => {
      if (ctx.autocompleteText === null) return
      ctx.setInputValue(ctx.inputValue + ctx.autocompleteText)
      ctx.setAutocompleteText(null)
    },

    handleInputChange: (ctx, payload: { value: string }) => {
      const { value } = payload

      // 1. 입력값 업데이트 + popup 열기
      ctx.setInputValue(value)
      ctx.setOpen(true)
      ctx.setAutocompleteText(null)

      // 2. 필터링된 옵션 (새 입력값 기준으로 다시 계산 필요)
      // Note: getFilteredOptions는 ctx.inputValue를 사용하므로
      // 여기서는 직접 필터링 로직 사용
      const options = ctx.getFilteredOptions()

      // 3. Inline autocomplete 적용
      if (ctx.autocomplete === 'inline' || ctx.autocomplete === 'both') {
        if (value.length > 0) {
          const valueLower = value.toLowerCase()
          const matching = options.find(
            (o) => !o.disabled && o.label.toLowerCase().startsWith(valueLower),
          )
          if (matching) {
            ctx.setHighlightedOptionId(matching.id)
            ctx.setAutocompleteText(matching.label.slice(value.length))
            // Selection range는 Shell에서 처리
            const input = ctx.getInputElement()
            if (input) {
              requestAnimationFrame(() => {
                input.setSelectionRange(value.length, matching.label.length)
              })
            }
          } else {
            ctx.setHighlightedOptionId(null)
          }
        } else {
          ctx.setHighlightedOptionId(null)
        }
      } else if (options.length > 0) {
        // list 모드: 첫 번째 매칭 옵션 하이라이트
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
      if (!ctx.isOpen) return

      // Autocomplete가 있으면 수락
      if (ctx.autocompleteText) {
        ctx.setInputValue(ctx.inputValue + ctx.autocompleteText)
        ctx.setAutocompleteText(null)
      }

      ctx.setOpen(false)
      ctx.setHighlightedOptionId(null)
    },
  },
})

// ============================================
// Query Helpers
// ============================================

export function filterOptions(
  options: ComboboxOption[],
  inputValue: string,
  autocomplete: AutocompleteMode,
  showAllOnEmpty: boolean,
): ComboboxOption[] {
  if (autocomplete === 'none') {
    return options
  }

  if (inputValue.length === 0) {
    return showAllOnEmpty ? options : []
  }

  const inputLower = inputValue.toLowerCase()
  return options.filter((opt) => opt.label.toLowerCase().startsWith(inputLower))
}

export function isHighlighted(
  highlightedOptionId: OptionId | null,
  optionId: OptionId,
): boolean {
  return highlightedOptionId === optionId
}

export function isSelected(
  selectedValue: string | null,
  option: ComboboxOption,
): boolean {
  return selectedValue === option.value
}

export function getDisplayValue(
  inputValue: string,
  autocompleteText: string | null,
): string {
  if (autocompleteText) {
    return inputValue + autocompleteText
  }
  return inputValue
}
