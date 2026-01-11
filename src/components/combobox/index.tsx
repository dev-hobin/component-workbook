import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useEventMachine, type Send } from '../../event-machine'

import {
  comboboxMachine,
  filterOptions,
  isHighlighted,
  isSelected,
  getDisplayValue,
  type ComboboxEvents,
  type ComboboxOption,
  type OptionId,
  type AutocompleteMode,
} from './machine'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'

import {
  NodeStoreProvider,
  useNodeStore,
} from '../../primitives/use-node-store'
import { useNode } from '../../primitives/use-node'
import { useStoreSubscribe } from '../../primitives/use-store-subscribe'
import type { NodeStore } from '../../primitives/node-store'

// ============================================
// Types
// ============================================

type ComboboxRole = 'input' | 'trigger' | 'listbox' | 'option' | 'label'

type ComboboxMeta = {
  optionId?: OptionId
  value?: string
  label?: string
  disabled?: boolean
}

type ComboboxContextValue = {
  comboboxId: string
  isOpen: boolean
  inputValue: string
  selectedValue: string | null
  highlightedOptionId: OptionId | null
  autocompleteText: string | null
  store: NodeStore<ComboboxRole, ComboboxMeta>
  send: Send<ComboboxEvents>
  autocomplete: AutocompleteMode
  options: ComboboxOption[]
  filteredOptions: ComboboxOption[]
  registerOption: (option: ComboboxOption) => void
  unregisterOption: (optionId: OptionId) => void
}

// ============================================
// Contexts
// ============================================

const ComboboxContext = createContext<ComboboxContextValue | null>(null)

function useComboboxContext() {
  const ctx = useContext(ComboboxContext)
  if (!ctx) {
    throw new Error('Combobox 컴포넌트는 Combobox.Root 안에서 사용해야 합니다.')
  }
  return ctx
}

// Input ref를 Root에서 관리하기 위한 context
const InputRefContext = createContext<
  ((el: HTMLInputElement | null) => void) | null
>(null)

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  // Controlled
  value?: string | null
  onValueChange?: (value: string | null) => void
  inputValue?: string
  onInputValueChange?: (value: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Uncontrolled
  defaultValue?: string | null
  defaultInputValue?: string
  defaultOpen?: boolean
  // Context options
  autocomplete?: AutocompleteMode
  openOnFocus?: boolean
  closeOnSelect?: boolean
  showAllOnEmpty?: boolean
  clearOnSelect?: boolean
  loop?: boolean
  // 선택 콜백
  onSelect?: (value: string) => void
}

export function Root(props: RootProps) {
  return (
    <NodeStoreProvider<ComboboxRole, ComboboxMeta>>
      <RootInner {...props} />
    </NodeStoreProvider>
  )
}

function RootInner({
  children,
  value: valueProp,
  onValueChange,
  inputValue: inputValueProp,
  onInputValueChange,
  open: openProp,
  onOpenChange,
  defaultValue = null,
  defaultInputValue = '',
  defaultOpen = false,
  autocomplete = 'list',
  openOnFocus = false,
  closeOnSelect = true,
  showAllOnEmpty = true,
  clearOnSelect = false,
  loop = true,
  onSelect,
}: RootProps) {
  const store = useNodeStore<ComboboxRole, ComboboxMeta>()
  const comboboxId = useId()

  // Options 관리
  const [options, setOptions] = useState<ComboboxOption[]>([])
  const optionsRef = useRef<ComboboxOption[]>([])
  optionsRef.current = options

  const registerOption = (option: ComboboxOption) => {
    setOptions((prev) => {
      const exists = prev.some((o) => o.id === option.id)
      if (exists) {
        return prev.map((o) => (o.id === option.id ? option : o))
      }
      return [...prev, option]
    })
  }

  const unregisterOption = (optionId: OptionId) => {
    setOptions((prev) => prev.filter((o) => o.id !== optionId))
  }

  // Controllable state
  const [selectedValue, setSelectedValue] = useControllableState({
    prop: valueProp,
    onChange: onValueChange,
    defaultProp: defaultValue,
  })

  const [inputValue, setInputValue] = useControllableState({
    prop: inputValueProp,
    onChange: onInputValueChange,
    defaultProp: defaultInputValue,
  })

  const [isOpen, setIsOpen] = useControllableState({
    prop: openProp,
    onChange: onOpenChange,
    defaultProp: defaultOpen,
  })

  // 내부 상태
  const [highlightedOptionId, setHighlightedOptionId] =
    useState<OptionId | null>(null)
  const [autocompleteText, setAutocompleteText] = useState<string | null>(null)

  // Input ref
  const inputRef = useRef<HTMLInputElement | null>(null)

  // 필터링된 옵션
  const filteredOptions = filterOptions(
    options,
    inputValue ?? '',
    autocomplete,
    showAllOnEmpty,
  )
  const filteredOptionsRef = useRef<ComboboxOption[]>([])
  filteredOptionsRef.current = filteredOptions

  // Event machine
  const { send } = useEventMachine(comboboxMachine, {
    props: {
      isOpen: isOpen ?? false,
      inputValue: inputValue ?? '',
      selectedValue: selectedValue ?? null,
      highlightedOptionId,
      autocompleteText,
    },
    handler: {
      setIsOpen: (open) => setIsOpen(open),
      setInputValue: (value) => setInputValue(value),
      setSelectedValue: (value) => setSelectedValue(value),
      setHighlightedOptionId,
      setAutocompleteText,
      onSelect,
    },
    options: {
      autocomplete,
      openOnFocus,
      closeOnSelect,
      showAllOnEmpty,
      clearOnSelect,
      loop,
    },
    helpers: {
      getFilteredOptions: () => filteredOptionsRef.current,
      getOptionById: (id) => optionsRef.current.find((o) => o.id === id),
    },
    dom: {
      getOptionElement: (optionId) => store.getElement(optionId, 'option'),
      getInputElement: () => inputRef.current,
      getAllElements: () => {
        const elements = new Map<string, HTMLElement>()
        const inputEl = store.getElement(comboboxId, 'input')
        const listbox = store.getElement(comboboxId, 'listbox')
        const trigger = store.getElement(comboboxId, 'trigger')
        if (inputEl) elements.set('input', inputEl)
        if (listbox) elements.set('listbox', listbox)
        if (trigger) elements.set('trigger', trigger)
        return elements
      },
    },
  })

  // Input ref setter
  const setInputRef = (el: HTMLInputElement | null) => {
    inputRef.current = el
  }

  const contextValue: ComboboxContextValue = {
    comboboxId,
    isOpen: isOpen ?? false,
    inputValue: inputValue ?? '',
    selectedValue: selectedValue ?? null,
    highlightedOptionId,
    autocompleteText,
    store,
    send,
    autocomplete,
    options,
    filteredOptions,
    registerOption,
    unregisterOption,
  }

  return (
    <ComboboxContext.Provider value={contextValue}>
      <InputRefContext.Provider value={setInputRef}>
        {children}
      </InputRefContext.Provider>
    </ComboboxContext.Provider>
  )
}

// ============================================
// Label
// ============================================

export type LabelProps = ComponentPropsWithoutRef<'label'>

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { comboboxId } = useComboboxContext()

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'label',
      id: comboboxId,
    })

    const inputDomId = `input::${comboboxId}`

    return (
      <label
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            id: domId,
            htmlFor: inputDomId,
          },
          rest,
        )}
      >
        {children}
      </label>
    )
  },
)

// ============================================
// Input
// ============================================

export type InputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'value' | 'defaultValue'
>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ ...rest }, forwardedRef) => {
    const {
      comboboxId,
      isOpen,
      inputValue,
      highlightedOptionId,
      autocompleteText,
      store,
      send,
      autocomplete,
    } = useComboboxContext()

    const setInputRef = useContext(InputRefContext)

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'input',
      id: comboboxId,
    })

    // Listbox ID 구독
    const listboxDomId = useStoreSubscribe(
      store,
      (s) => s.getElement(comboboxId, 'listbox')?.id || null,
    )

    // 하이라이트된 옵션의 DOM ID
    const activeDescendantId = highlightedOptionId
      ? `option::${highlightedOptionId}`
      : undefined

    // 키보드 핸들러
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          if (event.altKey) {
            send('KEY_ALT_ARROW_DOWN')
          } else {
            send('KEY_ARROW_DOWN')
          }
          break
        case 'ArrowUp':
          event.preventDefault()
          send('KEY_ARROW_UP')
          break
        case 'Enter':
          if (isOpen) {
            event.preventDefault()
          }
          send('KEY_ENTER')
          break
        case 'Escape':
          if (isOpen) {
            event.preventDefault()
          }
          send('KEY_ESCAPE')
          break
        case 'Home':
          if (isOpen) {
            event.preventDefault()
            send('KEY_HOME')
          }
          break
        case 'End':
          if (isOpen) {
            event.preventDefault()
            send('KEY_END')
          }
          break
        case 'Tab':
          send('KEY_TAB')
          break
      }
    }

    // 입력 핸들러
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      send('INPUT_CHANGE', { value: event.target.value })
    }

    // 포커스 핸들러
    const handleFocus = () => {
      send('INPUT_FOCUS')
    }

    // 블러 핸들러
    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      // listbox나 trigger로 포커스 이동 시 닫지 않음
      const relatedTarget = event.relatedTarget as HTMLElement | null
      const listboxEl = store.getElement(comboboxId, 'listbox')
      const triggerEl = store.getElement(comboboxId, 'trigger')

      if (
        relatedTarget &&
        (listboxEl?.contains(relatedTarget) ||
          triggerEl?.contains(relatedTarget))
      ) {
        return
      }

      send('INPUT_BLUR')
    }

    // 표시할 값
    const displayValue = getDisplayValue(inputValue, autocompleteText)

    return (
      <input
        ref={composeRefs(forwardedRef, ref, setInputRef)}
        {...mergeProps(
          {
            type: 'text',
            id: domId,
            role: 'combobox',
            'aria-autocomplete': autocomplete === 'none' ? 'none' : 'list',
            'aria-expanded': isOpen,
            'aria-controls': listboxDomId ?? undefined,
            'aria-activedescendant': activeDescendantId,
            'aria-haspopup': 'listbox',
            value: displayValue,
            onChange: handleChange,
            onKeyDown: handleKeyDown,
            onFocus: handleFocus,
            onBlur: handleBlur,
          },
          rest,
        )}
      />
    )
  },
)

// ============================================
// Trigger (Optional toggle button)
// ============================================

export type TriggerProps = ComponentPropsWithoutRef<'button'>

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { comboboxId, isOpen, store, send } = useComboboxContext()

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'trigger',
      id: comboboxId,
    })

    const handleClick = () => {
      send('TOGGLE')
      // 토글 후 input으로 포커스
      const inputEl = store.getElement(comboboxId, 'input')
      inputEl?.focus()
    }

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            type: 'button',
            id: domId,
            tabIndex: -1,
            'aria-label': isOpen ? 'Close suggestions' : 'Show suggestions',
            'aria-expanded': isOpen,
            onClick: handleClick,
          },
          rest,
        )}
      >
        {children}
      </button>
    )
  },
)

// ============================================
// Listbox (Popup)
// ============================================

export type ListboxProps = ComponentPropsWithoutRef<'ul'>

export const Listbox = forwardRef<HTMLUListElement, ListboxProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { comboboxId, isOpen, store } = useComboboxContext()

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'listbox',
      id: comboboxId,
    })

    // Label ID 구독
    const labelId = useStoreSubscribe(
      store,
      (s) => s.getElement(comboboxId, 'label')?.id || null,
    )

    if (!isOpen) {
      return null
    }

    return (
      <ul
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'listbox',
            id: domId,
            'aria-labelledby': labelId ?? undefined,
          },
          rest,
        )}
      >
        {children}
      </ul>
    )
  },
)

// ============================================
// Option
// ============================================

export type OptionProps = {
  value: string
  label?: string
  disabled?: boolean
} & Omit<ComponentPropsWithoutRef<'li'>, 'value'>

export const Option = forwardRef<HTMLLIElement, OptionProps>(
  ({ children, value, label, disabled = false, ...rest }, forwardedRef) => {
    const {
      selectedValue,
      highlightedOptionId,
      send,
      registerOption,
      unregisterOption,
    } = useComboboxContext()

    const optionId = useId()
    const displayLabel =
      label ?? (typeof children === 'string' ? children : value)

    const { ref, domId } = useNode<ComboboxRole, ComboboxMeta>({
      role: 'option',
      id: optionId,
      meta: { optionId, value, label: displayLabel, disabled },
    })

    // 옵션 등록/해제
    useEffect(() => {
      const option: ComboboxOption = {
        id: optionId,
        value,
        label: displayLabel,
        disabled,
      }
      registerOption(option)
      return () => unregisterOption(optionId)
    }, [
      optionId,
      value,
      displayLabel,
      disabled,
      registerOption,
      unregisterOption,
    ])

    const option: ComboboxOption = {
      id: optionId,
      value,
      label: displayLabel,
      disabled,
    }

    const highlighted = isHighlighted(highlightedOptionId, optionId)
    const selected = isSelected(selectedValue, option)

    const handleClick = () => {
      if (disabled) return
      send('OPTION_CLICK', { optionId })
    }

    const handleMouseEnter = () => {
      if (disabled) return
      send('OPTION_HOVER', { optionId })
    }

    // mousedown에서 preventDefault로 input blur 방지
    const handleMouseDown = (event: React.MouseEvent) => {
      event.preventDefault()
    }

    return (
      <li
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'option',
            id: domId,
            'aria-selected': selected,
            'aria-disabled': disabled || undefined,
            'data-highlighted': highlighted || undefined,
            'data-disabled': disabled || undefined,
            onMouseDown: handleMouseDown,
            onClick: handleClick,
            onMouseEnter: handleMouseEnter,
          },
          rest,
        )}
      >
        {children}
      </li>
    )
  },
)

// ============================================
// NoResults (Optional empty state)
// ============================================

export type NoResultsProps = {
  children: React.ReactNode
}

export function NoResults({ children }: NoResultsProps) {
  const { isOpen, filteredOptions } = useComboboxContext()

  if (!isOpen || filteredOptions.length > 0) {
    return null
  }

  return <>{children}</>
}

// ============================================
// Export
// ============================================

const Combobox = {
  Root,
  Label,
  Input,
  Trigger,
  Listbox,
  Option,
  NoResults,
}

export default Combobox
