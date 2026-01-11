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

export type ComboboxProps = {
  isOpen: boolean
  inputValue: string
  selectedValue: string | null
  highlightedOptionId: OptionId | null
  autocompleteText: string | null
}

export type ComboboxHandler = {
  setIsOpen: (open: boolean) => void
  setInputValue: (value: string) => void
  setSelectedValue: (value: string | null) => void
  setHighlightedOptionId: (id: OptionId | null) => void
  setAutocompleteText: (text: string | null) => void
  onSelect?: (value: string) => void
}

export type ComboboxOptions = {
  autocomplete: AutocompleteMode
  openOnFocus: boolean
  closeOnSelect: boolean
  showAllOnEmpty: boolean
  clearOnSelect: boolean
  loop: boolean
}

export type ComboboxHelpers = {
  getFilteredOptions: () => ComboboxOption[]
  getOptionById: (id: OptionId) => ComboboxOption | undefined
}

export type ComboboxDom = {
  getOptionElement: (optionId: OptionId) => HTMLElement | null
  getInputElement: () => HTMLInputElement | null
  getAllElements: () => Map<string, HTMLElement>
}

export type ComboboxInput = {
  props: ComboboxProps
  handler: ComboboxHandler
  options: ComboboxOptions
  helpers: ComboboxHelpers
  dom: ComboboxDom
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
      { when: (ctx) => ctx.props.isOpen, do: ['clearOpen', 'clearHighlight', 'clearAutocomplete'] },
      { do: 'setOpen' },
    ],

    INPUT_CHANGE: 'handleInputChange',
    INPUT_FOCUS: [
      { when: (ctx) => ctx.options.openOnFocus && !ctx.props.isOpen, do: ['setOpen', 'highlightSelected'] },
      { do: 'noop' },
    ],
    INPUT_BLUR: 'handleInputBlur',

    KEY_ARROW_DOWN: [
      { when: (ctx) => !ctx.props.isOpen, do: ['setOpen', 'highlightFirst'] },
      { do: 'highlightNext' },
    ],
    KEY_ARROW_UP: [
      { when: (ctx) => !ctx.props.isOpen, do: ['setOpen', 'highlightLast'] },
      { do: 'highlightPrev' },
    ],
    KEY_ALT_ARROW_DOWN: [
      { when: (ctx) => !ctx.props.isOpen, do: 'setOpen' },
      { do: 'noop' },
    ],
    KEY_ENTER: [
      { when: (ctx) => !ctx.props.isOpen, do: 'noop' },
      { when: (ctx) => ctx.props.highlightedOptionId === null, do: ['clearOpen', 'clearHighlight', 'clearAutocomplete'] },
      { do: 'selectHighlighted' },
    ],
    KEY_ESCAPE: [
      { when: (ctx) => ctx.props.isOpen, do: ['clearOpen', 'clearHighlight', 'clearAutocomplete'] },
      {
        when: (ctx) =>
          ctx.props.selectedValue !== null && ctx.props.inputValue !== ctx.props.selectedValue,
        do: 'restoreSelectedValue',
      },
      { do: 'noop' },
    ],
    KEY_HOME: [
      { when: (ctx) => ctx.props.isOpen, do: 'highlightFirst' },
      { do: 'noop' },
    ],
    KEY_END: [
      { when: (ctx) => ctx.props.isOpen, do: 'highlightLast' },
      { do: 'noop' },
    ],
    KEY_TAB: [
      { when: (ctx) => ctx.props.autocompleteText !== null, do: 'acceptAutocomplete' },
      { when: (ctx) => ctx.props.isOpen, do: ['clearOpen', 'clearHighlight', 'clearAutocomplete'] },
      { do: 'noop' },
    ],

    OPTION_CLICK: 'selectOption',
    OPTION_HOVER: 'highlightOption',

    OUTSIDE_CLICK: [
      { when: (ctx) => ctx.props.isOpen, do: ['clearOpen', 'clearHighlight', 'clearAutocomplete'] },
      { do: 'noop' },
    ],
  },

  effects: [
    {
      // Outside click 리스너
      watch: (ctx) => ctx.props.isOpen,
      enter: (ctx) => {
        const handleClick = (event: PointerEvent) => {
          const target = event.target as Node | null
          if (!target) return

          const elements = ctx.dom.getAllElements()
          for (const element of elements.values()) {
            if (element.contains(target)) return
          }

          ctx.handler.setIsOpen(false)
          ctx.handler.setHighlightedOptionId(null)
          ctx.handler.setAutocompleteText(null)
        }

        document.addEventListener('pointerdown', handleClick, true)
        return () =>
          document.removeEventListener('pointerdown', handleClick, true)
      },
    },
    {
      // Highlight 변경 시 스크롤
      watch: (ctx) => ctx.props.highlightedOptionId,
      change: (ctx) => {
        if (ctx.props.highlightedOptionId) {
          ctx.dom
            .getOptionElement(ctx.props.highlightedOptionId)
            ?.scrollIntoView({ block: 'nearest' })
        }
      },
    },
  ],

  actions: {
    noop: () => {},

    setOpen: (ctx) => {
      ctx.handler.setIsOpen(true)
    },

    clearOpen: (ctx) => {
      ctx.handler.setIsOpen(false)
    },

    clearHighlight: (ctx) => {
      ctx.handler.setHighlightedOptionId(null)
    },

    clearAutocomplete: (ctx) => {
      ctx.handler.setAutocompleteText(null)
    },

    highlightFirst: (ctx) => {
      const options = ctx.helpers.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length > 0) {
        ctx.handler.setHighlightedOptionId(enabled[0].id)
      }
    },

    highlightLast: (ctx) => {
      const options = ctx.helpers.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length > 0) {
        ctx.handler.setHighlightedOptionId(enabled[enabled.length - 1].id)
      }
    },

    highlightNext: (ctx) => {
      const options = ctx.helpers.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length === 0) return

      if (ctx.props.highlightedOptionId === null) {
        ctx.handler.setHighlightedOptionId(enabled[0].id)
        return
      }

      const currentIndex = enabled.findIndex(
        (o) => o.id === ctx.props.highlightedOptionId,
      )
      if (currentIndex === -1) {
        ctx.handler.setHighlightedOptionId(enabled[0].id)
        return
      }

      const nextIndex = currentIndex + 1
      if (nextIndex >= enabled.length) {
        if (ctx.options.loop) {
          ctx.handler.setHighlightedOptionId(enabled[0].id)
        }
      } else {
        ctx.handler.setHighlightedOptionId(enabled[nextIndex].id)
      }
    },

    highlightPrev: (ctx) => {
      const options = ctx.helpers.getFilteredOptions()
      const enabled = options.filter((o) => !o.disabled)
      if (enabled.length === 0) return

      if (ctx.props.highlightedOptionId === null) {
        ctx.handler.setHighlightedOptionId(enabled[enabled.length - 1].id)
        return
      }

      const currentIndex = enabled.findIndex(
        (o) => o.id === ctx.props.highlightedOptionId,
      )
      if (currentIndex === -1) {
        ctx.handler.setHighlightedOptionId(enabled[enabled.length - 1].id)
        return
      }

      const prevIndex = currentIndex - 1
      if (prevIndex < 0) {
        if (ctx.options.loop) {
          ctx.handler.setHighlightedOptionId(enabled[enabled.length - 1].id)
        }
      } else {
        ctx.handler.setHighlightedOptionId(enabled[prevIndex].id)
      }
    },

    highlightOption: (ctx, payload: { optionId: string }) => {
      const { optionId } = payload
      const option = ctx.helpers.getOptionById(optionId)
      if (option && !option.disabled) {
        ctx.handler.setHighlightedOptionId(optionId)
      }
    },

    highlightSelected: (ctx) => {
      if (ctx.props.selectedValue) {
        const options = ctx.helpers.getFilteredOptions()
        const selected = options.find((o) => o.value === ctx.props.selectedValue)
        if (selected) {
          ctx.handler.setHighlightedOptionId(selected.id)
        }
      }
    },

    selectHighlighted: (ctx) => {
      if (ctx.props.highlightedOptionId === null) return

      const option = ctx.helpers.getOptionById(ctx.props.highlightedOptionId)
      if (!option || option.disabled) return

      const newInputValue = ctx.options.clearOnSelect ? '' : option.label
      ctx.handler.setSelectedValue(option.value)
      ctx.handler.setInputValue(newInputValue)
      ctx.handler.setAutocompleteText(null)

      if (ctx.options.closeOnSelect) {
        ctx.handler.setIsOpen(false)
        ctx.handler.setHighlightedOptionId(null)
      }

      ctx.handler.onSelect?.(option.value)
    },

    selectOption: (ctx, payload: { optionId: OptionId }) => {
      const { optionId } = payload
      const option = ctx.helpers.getOptionById(optionId)
      if (!option || option.disabled) return

      const newInputValue = ctx.options.clearOnSelect ? '' : option.label
      ctx.handler.setSelectedValue(option.value)
      ctx.handler.setInputValue(newInputValue)
      ctx.handler.setAutocompleteText(null)

      if (ctx.options.closeOnSelect) {
        ctx.handler.setIsOpen(false)
        ctx.handler.setHighlightedOptionId(null)
      }

      ctx.handler.onSelect?.(option.value)
    },

    restoreSelectedValue: (ctx) => {
      if (!ctx.props.selectedValue) return
      const options = ctx.helpers.getFilteredOptions()
      const selected = options.find((o) => o.value === ctx.props.selectedValue)
      if (selected) {
        ctx.handler.setInputValue(selected.label)
      }
    },

    acceptAutocomplete: (ctx) => {
      if (ctx.props.autocompleteText === null) return
      ctx.handler.setInputValue(ctx.props.inputValue + ctx.props.autocompleteText)
      ctx.handler.setAutocompleteText(null)
    },

    handleInputChange: (ctx, payload: { value: string }) => {
      const { value } = payload

      // 1. 입력값 업데이트 + popup 열기
      ctx.handler.setInputValue(value)
      ctx.handler.setIsOpen(true)
      ctx.handler.setAutocompleteText(null)

      // 2. 필터링된 옵션
      const options = ctx.helpers.getFilteredOptions()

      // 3. Inline autocomplete 적용
      if (ctx.options.autocomplete === 'inline' || ctx.options.autocomplete === 'both') {
        if (value.length > 0) {
          const valueLower = value.toLowerCase()
          const matching = options.find(
            (o) => !o.disabled && o.label.toLowerCase().startsWith(valueLower),
          )
          if (matching) {
            ctx.handler.setHighlightedOptionId(matching.id)
            ctx.handler.setAutocompleteText(matching.label.slice(value.length))
            // Selection range 처리
            const input = ctx.dom.getInputElement()
            if (input) {
              requestAnimationFrame(() => {
                input.setSelectionRange(value.length, matching.label.length)
              })
            }
          } else {
            ctx.handler.setHighlightedOptionId(null)
          }
        } else {
          ctx.handler.setHighlightedOptionId(null)
        }
      } else if (options.length > 0) {
        // list 모드: 첫 번째 매칭 옵션 하이라이트
        const enabled = options.filter((o) => !o.disabled)
        if (enabled.length > 0) {
          ctx.handler.setHighlightedOptionId(enabled[0].id)
        } else {
          ctx.handler.setHighlightedOptionId(null)
        }
      } else {
        ctx.handler.setHighlightedOptionId(null)
      }
    },

    handleInputBlur: (ctx) => {
      if (!ctx.props.isOpen) return

      // Autocomplete가 있으면 수락
      if (ctx.props.autocompleteText) {
        ctx.handler.setInputValue(ctx.props.inputValue + ctx.props.autocompleteText)
        ctx.handler.setAutocompleteText(null)
      }

      ctx.handler.setIsOpen(false)
      ctx.handler.setHighlightedOptionId(null)
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
