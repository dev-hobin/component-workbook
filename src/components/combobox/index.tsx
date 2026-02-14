import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import { useHighlight, type UseHighlightReturn } from '../../hooks/use-highlight'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'

import {
  NodeStoreProvider,
  useNodeStore,
} from '../../primitives/use-node-store'
import { useNode } from '../../primitives/use-node'
import { useStoreSubscribe } from '../../primitives/use-store-subscribe'
import { DismissableLayer } from '../../primitives/dismissable-layer'
import type { NodeStore } from '../../primitives/node-store'

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

type ComboboxRole = 'input' | 'trigger' | 'listbox' | 'option' | 'label'

type ComboboxOptionMeta = {
  value: string
  label: string
  disabled: boolean
}

type ComboboxContextValue = {
  comboboxId: string
  isOpen: boolean
  inputValue: string
  selectedValue: string | null
  highlightedOptionId: OptionId | null
  autocomplete: AutocompleteMode
  openOnFocus: boolean
  loop: boolean
  store: NodeStore<ComboboxRole, ComboboxOptionMeta>
  highlight: UseHighlightReturn
  getFilteredOptions: () => ComboboxOption[]
  getEnabledOptions: () => ComboboxOption[]
  // 행동 단위 액션
  open: () => void
  openLast: () => void
  close: () => void
  setInputValue: (value: string) => void
  selectOption: (option: ComboboxOption) => void
  focusInput: () => void
}

// ============================================
// Helper Functions
// ============================================

export function filterOptions(
  options: ComboboxOption[],
  inputValue: string,
  autocomplete: AutocompleteMode,
): ComboboxOption[] {
  if (autocomplete === 'none') {
    return options
  }

  if (!inputValue.trim()) {
    return options
  }

  const lowerInput = inputValue.toLowerCase()
  return options.filter((option) =>
    option.label.toLowerCase().includes(lowerInput),
  )
}

export function isHighlighted(
  highlightedOptionId: OptionId | null,
  optionId: OptionId,
): boolean {
  return highlightedOptionId === optionId
}

export function isSelected(
  selectedValue: string | null,
  optionValue: string,
): boolean {
  return selectedValue === optionValue
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
  // Options
  autocomplete?: AutocompleteMode
  openOnFocus?: boolean
  closeOnSelect?: boolean
  clearOnSelect?: boolean
  loop?: boolean
  // Callback
  onSelect?: (value: string) => void
}

export function Root(props: RootProps) {
  return (
    <NodeStoreProvider<ComboboxRole, ComboboxOptionMeta>>
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
  clearOnSelect = false,
  loop = true,
  onSelect,
}: RootProps) {
  const store = useNodeStore<ComboboxRole, ComboboxOptionMeta>()
  const comboboxId = useId()

  // Controllable states
  const [selectedValue, setSelectedValue] = useControllableState<string | null>({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const [inputValue = '', setInputValue] = useControllableState({
    prop: inputValueProp,
    defaultProp: defaultInputValue,
    onChange: onInputValueChange,
  })
  const [isOpen = false, setIsOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  // Helper: Get options from NodeStore meta
  const getOptionsFromStore = useCallback((): ComboboxOption[] => {
    const optionNodes = store.getNodesByRole('option')
    return optionNodes.map((node) => ({
      id: node.id,
      value: node.meta.value,
      label: node.meta.label,
      disabled: node.meta.disabled,
    }))
  }, [store])

  const getFilteredOptions = useCallback(
    () => filterOptions(getOptionsFromStore(), inputValue ?? '', autocomplete),
    [getOptionsFromStore, inputValue, autocomplete],
  )

  const getEnabledOptions = useCallback(
    () => getFilteredOptions().filter((o) => !o.disabled),
    [getFilteredOptions],
  )

  // useHighlight: index 기반 하이라이트
  const enabledOptions = getEnabledOptions()
  const highlight = useHighlight(enabledOptions.length, { loop })

  // index → ID 파생
  const highlightedOptionId =
    highlight.index >= 0 ? (enabledOptions[highlight.index]?.id ?? null) : null

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedOptionId) {
      requestAnimationFrame(() => {
        const element = store.getElement(highlightedOptionId, 'option')
        element?.scrollIntoView({ block: 'nearest' })
      })
    }
  }, [highlightedOptionId, store])

  // ── 행동 단위 액션 ──

  const open = useCallback(() => {
    setIsOpen(true)
    highlight.first()
  }, [setIsOpen, highlight])

  const openLast = useCallback(() => {
    setIsOpen(true)
    highlight.last()
  }, [setIsOpen, highlight])

  const close = useCallback(() => {
    setIsOpen(false)
    highlight.clear()
  }, [setIsOpen, highlight])

  const selectOption = useCallback(
    (option: ComboboxOption) => {
      if (option.disabled) return

      setSelectedValue(option.value)
      onSelect?.(option.value)

      if (clearOnSelect) {
        setInputValue('')
      } else {
        setInputValue(option.label)
      }

      if (closeOnSelect) {
        close()
      } else {
        highlight.clear()
      }
    },
    [setSelectedValue, onSelect, clearOnSelect, closeOnSelect, setInputValue, close, highlight],
  )

  // Focus input helper
  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      const element = store.getElement(comboboxId, 'input')
      ;(element as HTMLInputElement | null)?.focus()
    })
  }, [store, comboboxId])

  const contextValue: ComboboxContextValue = {
    comboboxId,
    isOpen,
    inputValue,
    selectedValue,
    highlightedOptionId,
    autocomplete,
    openOnFocus,
    loop,
    store,
    highlight,
    getFilteredOptions,
    getEnabledOptions,
    open,
    openLast,
    close,
    setInputValue,
    selectOption,
    focusInput,
  }

  return (
    <ComboboxContext.Provider value={contextValue}>
      {children}
    </ComboboxContext.Provider>
  )
}

// ============================================
// Label
// ============================================

export type LabelProps = ComponentPropsWithoutRef<'label'>

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { comboboxId, store } = useComboboxContext()

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'label',
      id: comboboxId,
    })

    // Input의 domId 구독
    const inputDomId = useStoreSubscribe(
      store,
      (s) => s.getNode(comboboxId, 'input')?.domId ?? null,
    )

    return (
      <label
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            id: domId,
            htmlFor: inputDomId ?? undefined,
            'data-part': 'label',
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
// Control (Wrapper for Input + Trigger)
// ============================================

export type ControlProps = ComponentPropsWithoutRef<'div'>

export const Control = forwardRef<HTMLDivElement, ControlProps>(
  ({ children, ...rest }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        {...mergeProps(
          {
            'data-part': 'control',
          },
          rest,
        )}
      >
        {children}
      </div>
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
      autocomplete,
      openOnFocus,
      store,
      highlight,
      getFilteredOptions,
      open,
      openLast,
      close,
      setInputValue,
      selectOption,
    } = useComboboxContext()

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'input',
      id: comboboxId,
    })

    // Listbox의 domId 구독
    const listboxDomId = useStoreSubscribe(
      store,
      (s) => s.getNode(comboboxId, 'listbox')?.domId ?? null,
    )

    // Highlighted option의 domId 구독
    const activeDescendantId = useStoreSubscribe(store, (s) => {
      if (!highlightedOptionId) return null
      return s.getNode(highlightedOptionId, 'option')?.domId ?? null
    })

    // Keyboard handler
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          if (!isOpen) {
            open()
          } else {
            highlight.next()
          }
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          if (!isOpen) {
            openLast()
          } else {
            highlight.prev()
          }
          break
        }
        case 'Enter':
          if (isOpen) {
            event.preventDefault()
            if (highlightedOptionId) {
              const options = getFilteredOptions()
              const option = options.find((o) => o.id === highlightedOptionId)
              if (option && !option.disabled) {
                selectOption(option)
              }
            } else {
              close()
            }
          }
          break
        case 'Home':
          if (isOpen) {
            event.preventDefault()
            highlight.first()
          }
          break
        case 'End':
          if (isOpen) {
            event.preventDefault()
            highlight.last()
          }
          break
        case 'Tab':
          if (isOpen) {
            close()
          }
          break
      }
    }

    // Input handler
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value
      setInputValue(newValue)

      if (!isOpen) {
        open()
        return
      }

      // Autocomplete mode: highlight first option
      if (autocomplete === 'list' || autocomplete === 'both') {
        highlight.first()
      } else {
        highlight.clear()
      }
    }

    // Focus handler
    const handleFocus = () => {
      if (openOnFocus && !isOpen) {
        open()
      }
    }

    // Blur handler
    const handleBlur = () => {
      close()
    }

    return (
      <input
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            type: 'text',
            id: domId,
            role: 'combobox',
            'aria-autocomplete': autocomplete === 'none' ? 'none' : 'list',
            'aria-expanded': isOpen,
            'aria-controls': listboxDomId ?? undefined,
            'aria-activedescendant': activeDescendantId ?? undefined,
            'aria-haspopup': 'listbox',
            'data-part': 'input',
            'data-state': isOpen ? 'open' : 'closed',
            value: inputValue,
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
    const { comboboxId, isOpen, store, open, close } = useComboboxContext()

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'trigger',
      id: comboboxId,
    })

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
            'data-part': 'trigger',
            'data-state': isOpen ? 'open' : 'closed',
            onClick: () => {
              if (isOpen) {
                close()
              } else {
                open()
              }
              const inputEl = store.getElement(comboboxId, 'input')
              ;(inputEl as HTMLInputElement | null)?.focus()
            },
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
// Positioner (For floating-ui positioning)
// ============================================

export type PositionerProps = ComponentPropsWithoutRef<'div'>

export const Positioner = forwardRef<HTMLDivElement, PositionerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { isOpen } = useComboboxContext()

    if (!isOpen) {
      return null
    }

    return (
      <div
        ref={forwardedRef}
        {...mergeProps(
          {
            'data-part': 'positioner',
          },
          rest,
        )}
      >
        {children}
      </div>
    )
  },
)

// ============================================
// Listbox (Popup)
// ============================================

export type ListboxProps = ComponentPropsWithoutRef<'ul'>

export const Listbox = forwardRef<HTMLUListElement, ListboxProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { comboboxId, isOpen, store, close } = useComboboxContext()

    const { ref, domId, elementRef } = useNode<ComboboxRole>({
      role: 'listbox',
      id: comboboxId,
    })

    // Label의 domId 구독
    const labelDomId = useStoreSubscribe(
      store,
      (s) => s.getNode(comboboxId, 'label')?.domId ?? null,
    )

    // For DismissableLayer excludeRefs
    const inputRef = useRef<HTMLElement | null>(null)
    const triggerRef = useRef<HTMLElement | null>(null)

    // Get refs for exclude (실시간 쿼리)
    const getExcludeRefs = useCallback(() => {
      inputRef.current = store.getElement(comboboxId, 'input')
      triggerRef.current = store.getElement(comboboxId, 'trigger')
      return [inputRef, triggerRef]
    }, [store, comboboxId])

    const handleEscapeKeyDown = useCallback(() => {
      close()
    }, [close])

    const handlePointerDownOutside = useCallback(
      (event: PointerEvent) => {
        const target = event.target as Node | null
        if (!target) return

        // Input이나 Trigger 클릭은 무시
        const inputEl = store.getElement(comboboxId, 'input')
        const triggerEl = store.getElement(comboboxId, 'trigger')

        if (inputEl?.contains(target) || triggerEl?.contains(target)) {
          return
        }

        close()
      },
      [close, store, comboboxId],
    )

    // isOpen이 false면 렌더링하지 않음
    if (!isOpen) {
      return null
    }

    return (
      <DismissableLayer
        isActive={isOpen}
        dismissOnEscape={true}
        onEscapeKeyDown={handleEscapeKeyDown}
        onPointerDownOutside={handlePointerDownOutside}
        contentRef={elementRef}
        excludeRefs={getExcludeRefs()}
      >
        <ul
          ref={composeRefs(forwardedRef, ref)}
          {...mergeProps(
            {
              role: 'listbox',
              id: domId,
              'aria-labelledby': labelDomId ?? undefined,
              'data-part': 'listbox',
              'data-state': isOpen ? 'open' : 'closed',
            },
            rest,
          )}
        >
          {children}
        </ul>
      </DismissableLayer>
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
    const { selectedValue, highlightedOptionId, highlight, getEnabledOptions, selectOption, focusInput } =
      useComboboxContext()

    const optionId = useId()
    const displayLabel =
      label ?? (typeof children === 'string' ? children : value)

    // NodeStore에 meta로 등록 (useNode 내부에서 자동 등록/해제)
    const { ref, domId } = useNode<ComboboxRole, ComboboxOptionMeta>({
      role: 'option',
      id: optionId,
      meta: { value, label: displayLabel, disabled },
    })

    const highlighted = isHighlighted(highlightedOptionId, optionId)
    const selected = isSelected(selectedValue, value)

    return (
      <li
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'option',
            id: domId,
            'aria-selected': selected,
            'aria-disabled': disabled || undefined,
            'data-part': 'option',
            'data-highlighted': highlighted || undefined,
            'data-disabled': disabled || undefined,
            onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
            onClick: () => {
              if (disabled) return
              selectOption({
                id: optionId,
                value,
                label: displayLabel,
                disabled,
              })
              focusInput()
            },
            onMouseEnter: () => {
              if (disabled) return
              const enabled = getEnabledOptions()
              const idx = enabled.findIndex((o) => o.id === optionId)
              if (idx >= 0) highlight.set(idx)
            },
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
  const { isOpen, getFilteredOptions } = useComboboxContext()

  if (!isOpen || getFilteredOptions().length > 0) {
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
  Control,
  Input,
  Trigger,
  Positioner,
  Listbox,
  Option,
  NoResults,
}

export default Combobox
