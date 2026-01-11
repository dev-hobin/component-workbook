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

export type ComboboxInput = {
  // State
  isOpen: boolean
  inputValue: string
  selectedValue: string | null
  highlightedOptionId: OptionId | null
  autocompleteText: string | null

  // Callbacks
  onOpenChange: (open: boolean) => void
  onInputValueChange: (value: string) => void
  onSelectedValueChange: (value: string | null) => void
  onHighlightedOptionIdChange: (id: OptionId | null) => void
  onAutocompleteTextChange: (text: string | null) => void

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

  // Selection callback
  notifySelect: (value: string) => void
}

// ============================================
// Machine
// ============================================

type ComboboxActions =
  | 'noop'
  | 'setOpen'
  | 'clearOpen'
  | 'clearHighlight'
  | 'clearAutocomplete'
  | 'highlightFirst'
  | 'highlightLast'
  | 'highlightNext'
  | 'highlightPrev'
  | 'highlightOption'
  | 'highlightSelected'
  | 'selectHighlighted'
  | 'selectOption'
  | 'restoreSelectedValue'
  | 'acceptAutocomplete'
  | 'handleInputChange'
  | 'handleInputBlur'

export const comboboxMachine = createEventMachine<{
  input: ComboboxInput
  events: ComboboxEvents
  actions: ComboboxActions
}>({
  on: {
    OPEN: 'setOpen',
    CLOSE: ['clearOpen', 'clearHighlight', 'clearAutocomplete'],
    TOGGLE: [
      { when: (context) => context.isOpen, do: ['clearOpen', 'clearHighlight', 'clearAutocomplete'] },
      { do: 'setOpen' },
    ],

    INPUT_CHANGE: 'handleInputChange',
    INPUT_FOCUS: [
      { when: (context) => context.openOnFocus && !context.isOpen, do: ['setOpen', 'highlightSelected'] },
      { do: 'noop' },
    ],
    INPUT_BLUR: 'handleInputBlur',

    KEY_ARROW_DOWN: [
      { when: (context) => !context.isOpen, do: ['setOpen', 'highlightFirst'] },
      { do: 'highlightNext' },
    ],
    KEY_ARROW_UP: [
      { when: (context) => !context.isOpen, do: ['setOpen', 'highlightLast'] },
      { do: 'highlightPrev' },
    ],
    KEY_ALT_ARROW_DOWN: [
      { when: (context) => !context.isOpen, do: 'setOpen' },
      { do: 'noop' },
    ],
    KEY_ENTER: [
      { when: (context) => !context.isOpen, do: 'noop' },
      { when: (context) => context.highlightedOptionId === null, do: ['clearOpen', 'clearHighlight', 'clearAutocomplete'] },
      { do: 'selectHighlighted' },
    ],
    KEY_ESCAPE: [
      { when: (context) => context.isOpen, do: ['clearOpen', 'clearHighlight', 'clearAutocomplete'] },
      {
        when: (context) =>
          context.selectedValue !== null && context.inputValue !== context.selectedValue,
        do: 'restoreSelectedValue',
      },
      { do: 'noop' },
    ],
    KEY_HOME: [
      { when: (context) => context.isOpen, do: 'highlightFirst' },
      { do: 'noop' },
    ],
    KEY_END: [
      { when: (context) => context.isOpen, do: 'highlightLast' },
      { do: 'noop' },
    ],
    KEY_TAB: [
      { when: (context) => context.autocompleteText !== null, do: 'acceptAutocomplete' },
      { when: (context) => context.isOpen, do: ['clearOpen', 'clearHighlight', 'clearAutocomplete'] },
      { do: 'noop' },
    ],

    OPTION_CLICK: 'selectOption',
    OPTION_HOVER: 'highlightOption',

    OUTSIDE_CLICK: [
      { when: (context) => context.isOpen, do: ['clearOpen', 'clearHighlight', 'clearAutocomplete'] },
      { do: 'noop' },
    ],
  },

  effects: [
    {
      // Outside click 리스너
      watch: (context) => context.isOpen,
      enter: (context) => {
        const handleClick = (event: PointerEvent) => {
          const target = event.target as Node | null
          if (!target) return

          const elements = context.getAllElements()
          for (const element of elements.values()) {
            if (element.contains(target)) return
          }

          context.onOpenChange(false)
          context.onHighlightedOptionIdChange(null)
          context.onAutocompleteTextChange(null)
        }

        document.addEventListener('pointerdown', handleClick, true)
        return () =>
          document.removeEventListener('pointerdown', handleClick, true)
      },
    },
    {
      // Highlight 변경 시 스크롤
      watch: (context) => context.highlightedOptionId,
      change: (context) => {
        if (context.highlightedOptionId) {
          context
            .getOptionElement(context.highlightedOptionId)
            ?.scrollIntoView({ block: 'nearest' })
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    setOpen: (context) => {
      context.onOpenChange(true)
    },

    clearOpen: (context) => {
      context.onOpenChange(false)
    },

    clearHighlight: (context) => {
      context.onHighlightedOptionIdChange(null)
    },

    clearAutocomplete: (context) => {
      context.onAutocompleteTextChange(null)
    },

    highlightFirst: (context) => {
      const options = context.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length > 0) {
        context.onHighlightedOptionIdChange(enabled[0].id)
      }
    },

    highlightLast: (context) => {
      const options = context.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length > 0) {
        context.onHighlightedOptionIdChange(enabled[enabled.length - 1].id)
      }
    },

    highlightNext: (context) => {
      const options = context.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length === 0) return

      if (context.highlightedOptionId === null) {
        context.onHighlightedOptionIdChange(enabled[0].id)
        return
      }

      const currentIndex = enabled.findIndex(
        (o) => o.id === context.highlightedOptionId,
      )
      if (currentIndex === -1) {
        context.onHighlightedOptionIdChange(enabled[0].id)
        return
      }

      const nextIndex = currentIndex + 1
      if (nextIndex >= enabled.length) {
        if (context.loop) {
          context.onHighlightedOptionIdChange(enabled[0].id)
        }
      } else {
        context.onHighlightedOptionIdChange(enabled[nextIndex].id)
      }
    },

    highlightPrev: (context) => {
      const options = context.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length === 0) return

      if (context.highlightedOptionId === null) {
        context.onHighlightedOptionIdChange(enabled[enabled.length - 1].id)
        return
      }

      const currentIndex = enabled.findIndex(
        (o) => o.id === context.highlightedOptionId,
      )
      if (currentIndex === -1) {
        context.onHighlightedOptionIdChange(enabled[enabled.length - 1].id)
        return
      }

      const prevIndex = currentIndex - 1
      if (prevIndex < 0) {
        if (context.loop) {
          context.onHighlightedOptionIdChange(enabled[enabled.length - 1].id)
        }
      } else {
        context.onHighlightedOptionIdChange(enabled[prevIndex].id)
      }
    },

    highlightOption: (context, payload: { optionId: string }) => {
      const { optionId } = payload
      const option = context.getOptionById(optionId)
      if (option && !option.disabled) {
        context.onHighlightedOptionIdChange(optionId)
      }
    },

    highlightSelected: (context) => {
      if (context.selectedValue) {
        const options = context.getFilteredOptions()
        const selected = options.find((o) => o.value === context.selectedValue)
        if (selected) {
          context.onHighlightedOptionIdChange(selected.id)
        }
      }
    },

    selectHighlighted: (context) => {
      if (context.highlightedOptionId === null) return

      const option = context.getOptionById(context.highlightedOptionId)
      if (!option || option.disabled) return

      const newInputValue = context.clearOnSelect ? '' : option.label
      context.onSelectedValueChange(option.value)
      context.onInputValueChange(newInputValue)
      context.onAutocompleteTextChange(null)

      if (context.closeOnSelect) {
        context.onOpenChange(false)
        context.onHighlightedOptionIdChange(null)
      }

      context.notifySelect(option.value)
    },

    selectOption: (context, payload: { optionId: OptionId }) => {
      const { optionId } = payload
      const option = context.getOptionById(optionId)
      if (!option || option.disabled) return

      const newInputValue = context.clearOnSelect ? '' : option.label
      context.onSelectedValueChange(option.value)
      context.onInputValueChange(newInputValue)
      context.onAutocompleteTextChange(null)

      if (context.closeOnSelect) {
        context.onOpenChange(false)
        context.onHighlightedOptionIdChange(null)
      }

      context.notifySelect(option.value)
    },

    restoreSelectedValue: (context) => {
      if (!context.selectedValue) return
      const options = context.getFilteredOptions()
      const selected = options.find((o) => o.value === context.selectedValue)
      if (selected) {
        context.onInputValueChange(selected.label)
      }
    },

    acceptAutocomplete: (context) => {
      if (context.autocompleteText === null) return
      context.onInputValueChange(context.inputValue + context.autocompleteText)
      context.onAutocompleteTextChange(null)
    },

    handleInputChange: (context, payload: { value: string }) => {
      const { value } = payload

      // 1. 입력값 업데이트 + popup 열기
      context.onInputValueChange(value)
      context.onOpenChange(true)
      context.onAutocompleteTextChange(null)

      // 2. 필터링된 옵션 (새 입력값 기준으로 다시 계산 필요)
      // Note: getFilteredOptions는 context.inputValue를 사용하므로
      // 여기서는 직접 필터링 로직 사용
      const options = context.getFilteredOptions()

      // 3. Inline autocomplete 적용
      if (context.autocomplete === 'inline' || context.autocomplete === 'both') {
        if (value.length > 0) {
          const valueLower = value.toLowerCase()
          const matching = options.find(
            (o) => !o.disabled && o.label.toLowerCase().startsWith(valueLower),
          )
          if (matching) {
            context.onHighlightedOptionIdChange(matching.id)
            context.onAutocompleteTextChange(matching.label.slice(value.length))
            // Selection range는 Shell에서 처리
            const input = context.getInputElement()
            if (input) {
              requestAnimationFrame(() => {
                input.setSelectionRange(value.length, matching.label.length)
              })
            }
          } else {
            context.onHighlightedOptionIdChange(null)
          }
        } else {
          context.onHighlightedOptionIdChange(null)
        }
      } else if (options.length > 0) {
        // list 모드: 첫 번째 매칭 옵션 하이라이트
        const enabled = options.filter((o) => !o.disabled)
        if (enabled.length > 0) {
          context.onHighlightedOptionIdChange(enabled[0].id)
        } else {
          context.onHighlightedOptionIdChange(null)
        }
      } else {
        context.onHighlightedOptionIdChange(null)
      }
    },

    handleInputBlur: (context) => {
      if (!context.isOpen) return

      // Autocomplete가 있으면 수락
      if (context.autocompleteText) {
        context.onInputValueChange(context.inputValue + context.autocompleteText)
        context.onAutocompleteTextChange(null)
      }

      context.onOpenChange(false)
      context.onHighlightedOptionIdChange(null)
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
