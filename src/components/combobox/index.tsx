import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'
import { DismissableLayer } from '../../primitives/dismissable-layer'

import { useIdMap, createIdMapKey, type IdMap } from '../../primitives/id-map'
import {
  createElementRegistry,
  type ElementRegistry,
} from '../../primitives/element-registry'
import { RegistrationProvider } from '../../primitives/registration-context'
import { useRegister } from '../../primitives/use-register'

// ============================================
// Types
// ============================================

export type OptionValue = string
export type AutocompleteMode = 'none' | 'list' | 'inline' | 'both'

type ComboboxMeta = {
  value: string
  label: string
  disabled: boolean
}

type ComboboxContextValue = {
  comboboxId: string
  idMap: IdMap
  registry: ElementRegistry<ComboboxMeta>
  isOpen: boolean
  inputValue: string
  selectedValue: string | null
  highlightedValue: OptionValue | null
  autocomplete: AutocompleteMode
  openOnFocus: boolean
  loop: boolean
  // 행동 단위 액션
  open: () => void
  openLast: () => void
  close: () => void
  setInputValue: (value: string) => void
  selectOption: (value: string) => void
  setHighlightedValue: (value: OptionValue | null) => void
  focusInput: () => void
}

// ============================================
// Helper Functions
// ============================================

function getFilteredOptions(
  registry: ElementRegistry<ComboboxMeta>,
  inputValue: string,
  autocomplete: AutocompleteMode,
) {
  const options = registry.getEntriesByRoleInDomOrder('option')

  if (autocomplete === 'none') {
    return options
  }

  if (!inputValue.trim()) {
    return options
  }

  const lowerInput = inputValue.toLowerCase()
  return options.filter((entry) =>
    entry.meta.label.toLowerCase().includes(lowerInput),
  )
}

function getEnabledOptions(
  registry: ElementRegistry<ComboboxMeta>,
  inputValue: string,
  autocomplete: AutocompleteMode,
) {
  return getFilteredOptions(registry, inputValue, autocomplete).filter(
    (entry) => !entry.meta.disabled,
  )
}

export function isHighlighted(
  highlightedValue: OptionValue | null,
  optionValue: OptionValue,
): boolean {
  return highlightedValue === optionValue
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

export function Root({
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
  const [idMap, idActions] = useIdMap()

  const registryRef = useRef<ElementRegistry<ComboboxMeta>>(null!)
  if (!registryRef.current) {
    registryRef.current = createElementRegistry<ComboboxMeta>()
  }
  const registry = registryRef.current

  const comboboxId = 'combobox'

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

  const [highlightedValue, setHighlightedValue] = useState<OptionValue | null>(null)

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedValue) {
      requestAnimationFrame(() => {
        const element = registry.getElement(highlightedValue, 'option')
        element?.scrollIntoView({ block: 'nearest' })
      })
    }
  }, [highlightedValue, registry])

  // ── 행동 단위 액션 ──

  const open = useCallback(() => {
    setIsOpen(true)
    // highlight first after registry is populated
    requestAnimationFrame(() => {
      const enabled = getEnabledOptions(registry, inputValue, autocomplete)
      setHighlightedValue(enabled.length > 0 ? enabled[0].value : null)
    })
  }, [setIsOpen, registry, inputValue, autocomplete])

  const openLast = useCallback(() => {
    setIsOpen(true)
    requestAnimationFrame(() => {
      const enabled = getEnabledOptions(registry, inputValue, autocomplete)
      setHighlightedValue(enabled.length > 0 ? enabled[enabled.length - 1].value : null)
    })
  }, [setIsOpen, registry, inputValue, autocomplete])

  const close = useCallback(() => {
    setIsOpen(false)
    setHighlightedValue(null)
  }, [setIsOpen])

  const selectOption = useCallback(
    (optionValue: string) => {
      const entry = registry.getEntry(optionValue, 'option')
      if (!entry || entry.meta.disabled) return

      setSelectedValue(optionValue)
      onSelect?.(optionValue)

      if (clearOnSelect) {
        setInputValue('')
      } else {
        setInputValue(entry.meta.label)
      }

      if (closeOnSelect) {
        close()
      } else {
        setHighlightedValue(null)
      }
    },
    [registry, setSelectedValue, onSelect, clearOnSelect, closeOnSelect, setInputValue, close],
  )

  // Focus input helper
  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      const element = registry.getElement(comboboxId, 'input')
      ;(element as HTMLInputElement | null)?.focus()
    })
  }, [registry, comboboxId])

  const contextValue: ComboboxContextValue = {
    comboboxId,
    idMap,
    registry,
    isOpen,
    inputValue,
    selectedValue: selectedValue ?? null,
    highlightedValue,
    autocomplete,
    openOnFocus,
    loop,
    open,
    openLast,
    close,
    setInputValue,
    selectOption,
    setHighlightedValue,
    focusInput,
  }

  return (
    <RegistrationProvider idActions={idActions} registry={registry}>
      <ComboboxContext.Provider value={contextValue}>
        {children}
      </ComboboxContext.Provider>
    </RegistrationProvider>
  )
}

// ============================================
// Label
// ============================================

export type LabelProps = ComponentPropsWithoutRef<'label'>

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, id: userDomId, ...rest }, forwardedRef) => {
    const { comboboxId, idMap } = useComboboxContext()

    const { ref, domId } = useRegister({
      value: comboboxId,
      role: 'label',
      id: userDomId,
    })

    const inputDomId = idMap.get(createIdMapKey(comboboxId, 'input'))

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
  ({ id: userDomId, ...rest }, forwardedRef) => {
    const {
      comboboxId,
      idMap,
      registry,
      isOpen,
      inputValue,
      highlightedValue,
      autocomplete,
      openOnFocus,
      open,
      openLast,
      close,
      setInputValue,
      selectOption,
      setHighlightedValue,
    } = useComboboxContext()

    const { ref, domId } = useRegister({
      value: comboboxId,
      role: 'input',
      id: userDomId,
    })

    const listboxDomId = idMap.get(createIdMapKey(comboboxId, 'listbox'))

    // Highlighted option의 domId
    const highlightedOptionDomId = highlightedValue
      ? idMap.get(createIdMapKey(highlightedValue, 'option'))
      : undefined

    // Keyboard handler
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          if (!isOpen) {
            open()
          } else {
            // Inline navigation
            const enabled = getEnabledOptions(registry, inputValue, autocomplete)
            if (enabled.length === 0) return

            const currentIndex = enabled.findIndex((e) => e.value === highlightedValue)
            let nextIndex: number
            if (currentIndex === -1) {
              nextIndex = 0
            } else {
              nextIndex = (currentIndex + 1) % enabled.length
            }
            setHighlightedValue(enabled[nextIndex].value)
          }
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          if (!isOpen) {
            openLast()
          } else {
            const enabled = getEnabledOptions(registry, inputValue, autocomplete)
            if (enabled.length === 0) return

            const currentIndex = enabled.findIndex((e) => e.value === highlightedValue)
            let prevIndex: number
            if (currentIndex === -1) {
              prevIndex = enabled.length - 1
            } else {
              prevIndex = (currentIndex - 1 + enabled.length) % enabled.length
            }
            setHighlightedValue(enabled[prevIndex].value)
          }
          break
        }
        case 'Enter':
          if (isOpen) {
            event.preventDefault()
            if (highlightedValue) {
              selectOption(highlightedValue)
            } else {
              close()
            }
          }
          break
        case 'Home':
          if (isOpen) {
            event.preventDefault()
            const enabled = getEnabledOptions(registry, inputValue, autocomplete)
            if (enabled.length > 0) {
              setHighlightedValue(enabled[0].value)
            }
          }
          break
        case 'End':
          if (isOpen) {
            event.preventDefault()
            const enabled = getEnabledOptions(registry, inputValue, autocomplete)
            if (enabled.length > 0) {
              setHighlightedValue(enabled[enabled.length - 1].value)
            }
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
        // Re-query after input value change
        requestAnimationFrame(() => {
          const enabled = getEnabledOptions(registry, newValue, autocomplete)
          setHighlightedValue(enabled.length > 0 ? enabled[0].value : null)
        })
      } else {
        setHighlightedValue(null)
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
            'aria-activedescendant': highlightedOptionDomId ?? undefined,
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
  ({ children, id: userDomId, ...rest }, forwardedRef) => {
    const { comboboxId, isOpen, registry, open, close } = useComboboxContext()

    const { ref, domId } = useRegister({
      value: comboboxId,
      role: 'trigger',
      id: userDomId,
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
              const inputEl = registry.getElement(comboboxId, 'input')
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
  ({ children, id: userDomId, ...rest }, forwardedRef) => {
    const { comboboxId, idMap, registry, isOpen, close } = useComboboxContext()

    const { ref, domId } = useRegister({
      value: comboboxId,
      role: 'listbox',
      id: userDomId,
    })

    const elementRef = useRef<HTMLUListElement>(null)

    const labelDomId = idMap.get(createIdMapKey(comboboxId, 'label'))

    // For DismissableLayer excludeRefs
    const inputRef = useRef<HTMLElement | null>(null)
    const triggerRef = useRef<HTMLElement | null>(null)

    const getExcludeRefs = useCallback(() => {
      inputRef.current = registry.getElement(comboboxId, 'input')
      triggerRef.current = registry.getElement(comboboxId, 'trigger')
      return [inputRef, triggerRef]
    }, [registry, comboboxId])

    const handleEscapeKeyDown = useCallback(() => {
      close()
    }, [close])

    const handlePointerDownOutside = useCallback(
      (event: PointerEvent) => {
        const target = event.target as Node | null
        if (!target) return

        const inputEl = registry.getElement(comboboxId, 'input')
        const triggerEl = registry.getElement(comboboxId, 'trigger')

        if (inputEl?.contains(target) || triggerEl?.contains(target)) {
          return
        }

        close()
      },
      [close, registry, comboboxId],
    )

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
          ref={composeRefs(forwardedRef, ref, elementRef)}
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
  ({ children, value, label, id: userDomId, disabled = false, ...rest }, forwardedRef) => {
    const { selectedValue, highlightedValue, setHighlightedValue, selectOption, focusInput } =
      useComboboxContext()

    const displayLabel =
      label ?? (typeof children === 'string' ? children : value)

    const { ref, domId } = useRegister<ComboboxMeta>({
      value,
      role: 'option',
      id: userDomId,
      meta: { value, label: displayLabel, disabled },
    })

    const highlighted = isHighlighted(highlightedValue, value)
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
              selectOption(value)
              focusInput()
            },
            onMouseEnter: () => {
              if (disabled) return
              setHighlightedValue(value)
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
  const { isOpen, registry, inputValue, autocomplete } = useComboboxContext()

  if (!isOpen || getFilteredOptions(registry, inputValue, autocomplete).length > 0) {
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
