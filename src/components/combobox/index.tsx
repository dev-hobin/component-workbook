import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import {
  deriveStatus,
  getEffectsOnStatusChange,
  handleKeyboardAction,
  handleInputChange,
  handleInputFocus,
  handleInputBlur,
  handleOutsideClick,
  handleOptionClick,
  handleOptionHover,
  filterOptions,
  isHighlighted,
  isSelected,
  getDisplayValue,
  togglePopup,
  type ComboboxState,
  type ComboboxStatus,
  type ComboboxEffect,
  type ComboboxContext as ComboboxContextType,
  type ComboboxOption,
  type OptionId,
  type AutocompleteMode,
  type KeyboardAction,
} from './core'
import { useLatestRef } from '../../hooks/useLatestRef'
import { useStableCallback } from '../../hooks/useStableCallback'
import { composeRefs } from '../../utils/composeRefs'
import { mergeProps } from '../../utils/mergeProps'

import {
  ComponentStoreProvider,
  useComponentStore,
} from '../../shell/use-component-store'
import { useNode } from '../../shell/use-node'
import { useComponentSubscribe } from '../../shell/use-component-subscribe'
import type { ComponentStore } from '../../core/component-store'

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
  state: ComboboxState
  setState: React.Dispatch<React.SetStateAction<ComboboxState>>
  context: ComboboxContextType
  store: ComponentStore<ComboboxRole, ComboboxMeta>
  runEffect: (effect: ComboboxEffect) => void
  // 필터링된 옵션 (Option들이 등록되면 업데이트)
  options: ComboboxOption[]
  filteredOptions: ComboboxOption[]
  registerOption: (option: ComboboxOption) => void
  unregisterOption: (optionId: OptionId) => void
  // 선택 콜백
  onSelect?: (value: string) => void
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
    <ComponentStoreProvider<ComboboxRole, ComboboxMeta>>
      <RootInner {...props} />
    </ComponentStoreProvider>
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
  const { store } = useComponentStore<ComboboxRole, ComboboxMeta>()
  const comboboxId = useId()

  // Options 관리
  const [options, setOptions] = React.useState<ComboboxOption[]>([])

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

  // Core state 구성
  const state: ComboboxState = {
    isOpen: isOpen ?? false,
    inputValue: inputValue ?? '',
    selectedValue: selectedValue ?? null,
    highlightedOptionId: null,
    autocompleteText: null,
  }

  // 내부 상태 (highlightedOptionId, autocompleteText)
  const [highlightedOptionId, setHighlightedOptionId] =
    React.useState<OptionId | null>(null)
  const [autocompleteText, setAutocompleteText] = React.useState<string | null>(
    null,
  )

  // 전체 state (controllable + internal)
  const fullState: ComboboxState = {
    ...state,
    highlightedOptionId,
    autocompleteText,
  }

  const fullStateRef = useLatestRef(fullState)

  const setState = useStableCallback(
    (action: React.SetStateAction<ComboboxState>) => {
      const currentState = fullStateRef.current
      const nextState =
        typeof action === 'function' ? action(currentState) : action

      setIsOpen(nextState.isOpen)
      setInputValue(nextState.inputValue)
      setSelectedValue(nextState.selectedValue)
      setHighlightedOptionId(nextState.highlightedOptionId)
      setAutocompleteText(nextState.autocompleteText)
    },
  )

  // Context 설정
  const context: ComboboxContextType = {
    autocomplete,
    openOnFocus,
    closeOnSelect,
    showAllOnEmpty,
    clearOnSelect,
    loop,
  }

  // 필터링된 옵션
  const filteredOptions = filterOptions(options, fullState.inputValue, context)

  // Status 파생
  const status: ComboboxStatus = deriveStatus(fullState)
  const prevStatusRef = useRef<ComboboxStatus>('idle')

  // Effect refs
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Outside click handler (runEffect보다 먼저 정의)
  const handleOutsideClickListener = useStableCallback(
    (event: PointerEvent) => {
      const inputEl = store.getElement(comboboxId, 'input')
      const listboxEl = store.getElement(comboboxId, 'listbox')
      const triggerEl = store.getElement(comboboxId, 'trigger')
      const target = event.target as Node

      const isInsideInput = inputEl?.contains(target)
      const isInsideListbox = listboxEl?.contains(target)
      const isInsideTrigger = triggerEl?.contains(target)

      if (!isInsideInput && !isInsideListbox && !isInsideTrigger) {
        const nextState = handleOutsideClick(fullStateRef.current)
        setState(nextState)
      }
    },
  )

  // runEffect
  const runEffect = useStableCallback((effect: ComboboxEffect) => {
    switch (effect.type) {
      case 'ADD_OUTSIDE_CLICK_LISTENER':
        document.addEventListener(
          'pointerdown',
          handleOutsideClickListener,
          true,
        )
        break
      case 'REMOVE_OUTSIDE_CLICK_LISTENER':
        document.removeEventListener(
          'pointerdown',
          handleOutsideClickListener,
          true,
        )
        break
      case 'ADD_KEYBOARD_LISTENER':
        // Input에서 직접 처리하므로 document 리스너 불필요
        break
      case 'REMOVE_KEYBOARD_LISTENER':
        break
      case 'FOCUS_INPUT':
        inputRef.current?.focus()
        break
      case 'SET_INPUT_SELECTION':
        if (inputRef.current) {
          inputRef.current.setSelectionRange(effect.start, effect.end)
        }
        break
      case 'UPDATE_ACTIVE_DESCENDANT':
        // Input의 aria-activedescendant 업데이트는 React에서 처리
        break
      case 'SCROLL_OPTION_INTO_VIEW': {
        const optionEl = store.getElement(effect.optionId, 'option')
        optionEl?.scrollIntoView({ block: 'nearest' })
        break
      }
      case 'NOTIFY_SELECT':
        onSelect?.(effect.value)
        break
    }
  })

  // Status 전환 시 Effect 실행
  useLayoutEffect(() => {
    const prevStatus = prevStatusRef.current
    const effects = getEffectsOnStatusChange(prevStatus, status)
    effects.forEach(runEffect)
    prevStatusRef.current = status
  }, [status, runEffect])

  // 언마운트 시 리소스 정리
  useEffect(() => {
    return () => {
      document.removeEventListener(
        'pointerdown',
        handleOutsideClickListener,
        true,
      )
      prevStatusRef.current = 'idle'
    }
  }, [handleOutsideClickListener])

  // Input ref 등록
  const setInputRef = (el: HTMLInputElement | null) => {
    inputRef.current = el
  }

  const contextValue: ComboboxContextValue = {
    comboboxId,
    state: fullState,
    setState,
    context,
    store,
    runEffect,
    options,
    filteredOptions,
    registerOption,
    unregisterOption,
    onSelect,
  }

  return (
    <ComboboxContext.Provider value={contextValue}>
      <InputRefContext.Provider value={setInputRef}>
        {children}
      </InputRefContext.Provider>
    </ComboboxContext.Provider>
  )
}

// Input ref를 Root에서 관리하기 위한 context
const InputRefContext = createContext<
  ((el: HTMLInputElement | null) => void) | null
>(null)

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

    // Input의 domId 구독
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
      state,
      setState,
      context,
      store,
      runEffect,
      filteredOptions,
    } = useComboboxContext()

    const setInputRef = useContext(InputRefContext)

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'input',
      id: comboboxId,
    })

    // Listbox ID 구독
    const listboxDomId = useComponentSubscribe(
      store,
      (s) => s.getElement(comboboxId, 'listbox')?.id || null,
    )

    // 하이라이트된 옵션의 DOM ID
    const activeDescendantId = state.highlightedOptionId
      ? `option::${state.highlightedOptionId}`
      : undefined

    // 키보드 핸들러
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      let action: KeyboardAction | null = null

      switch (event.key) {
        case 'ArrowDown':
          if (event.altKey) {
            action = { type: 'ALT_ARROW_DOWN' }
          } else {
            action = { type: 'ARROW_DOWN' }
          }
          break
        case 'ArrowUp':
          action = { type: 'ARROW_UP' }
          break
        case 'Enter':
          action = { type: 'ENTER' }
          break
        case 'Escape':
          action = { type: 'ESCAPE' }
          break
        case 'Home':
          if (state.isOpen) {
            action = { type: 'HOME' }
          }
          break
        case 'End':
          if (state.isOpen) {
            action = { type: 'END' }
          }
          break
        case 'Tab':
          action = { type: 'TAB' }
          break
      }

      if (action) {
        const result = handleKeyboardAction(
          state,
          action,
          filteredOptions,
          context,
        )

        if (result.preventDefault) {
          event.preventDefault()
        }

        setState(result.state)
        result.effects.forEach(runEffect)
      }
    }

    // 입력 핸들러
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      const result = handleInputChange(state, value, filteredOptions, context)

      setState(result.state)
      result.effects.forEach(runEffect)
    }

    // 포커스 핸들러
    const handleFocus = () => {
      const nextState = handleInputFocus(state, filteredOptions, context)
      setState(nextState)
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

      const nextState = handleInputBlur(state, context)
      setState(nextState)
    }

    // 표시할 값
    const displayValue = getDisplayValue(state)

    return (
      <input
        ref={composeRefs(forwardedRef, ref, setInputRef)}
        {...mergeProps(
          {
            type: 'text',
            id: domId,
            role: 'combobox',
            'aria-autocomplete':
              context.autocomplete === 'none' ? 'none' : 'list',
            'aria-expanded': state.isOpen,
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
    const { comboboxId, state, setState, store } = useComboboxContext()

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'trigger',
      id: comboboxId,
    })

    const handleClick = () => {
      setState(togglePopup(state))
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
            'aria-label': state.isOpen
              ? 'Close suggestions'
              : 'Show suggestions',
            'aria-expanded': state.isOpen,
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
    const { comboboxId, state, store } = useComboboxContext()

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'listbox',
      id: comboboxId,
    })

    // Label ID 구독
    const labelId = useComponentSubscribe(
      store,
      (s) => s.getElement(comboboxId, 'label')?.id || null,
    )

    if (!state.isOpen) {
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
      state,
      setState,
      context,
      runEffect,
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

    const highlighted = isHighlighted(state, optionId)
    const selected = isSelected(state, option)

    const handleClick = () => {
      if (disabled) return
      const result = handleOptionClick(state, option, context)
      setState(result.state)
      result.effects.forEach(runEffect)
    }

    const handleMouseEnter = () => {
      if (disabled) return
      const nextState = handleOptionHover(state, optionId)
      setState(nextState)
      runEffect({ type: 'UPDATE_ACTIVE_DESCENDANT', optionId })
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
  const { state, filteredOptions } = useComboboxContext()

  if (!state.isOpen || filteredOptions.length > 0) {
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
