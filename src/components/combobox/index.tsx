import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useMachine, type Send } from 'controlled-machine/react'

import {
  comboboxMachine,
  filterOptions,
  isHighlighted,
  isSelected,
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
import { DismissableLayer } from '../../primitives/dismissable-layer'
import type { NodeStore } from '../../primitives/node-store'

// ============================================
// Types
// ============================================

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
  store: NodeStore<ComboboxRole, ComboboxOptionMeta>
  send: Send<ComboboxEvents>
  getFilteredOptions: () => ComboboxOption[]
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

  // Internal state
  const [highlightedOptionId, setHighlightedOptionId] =
    useState<OptionId | null>(null)

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

  // Filtered options getter (지연 렌더링으로 인해 getter 필요)
  const getFilteredOptions = useCallback(
    () => filterOptions(getOptionsFromStore(), inputValue ?? '', autocomplete),
    [getOptionsFromStore, inputValue, autocomplete],
  )

  // Machine
  const { send } = useMachine(comboboxMachine, {
    input: {
      // State
      isOpen: isOpen ?? false,
      inputValue: inputValue ?? '',
      selectedValue: selectedValue ?? null,
      highlightedOptionId,

      // State change callbacks (선언적)
      onOpenChange: setIsOpen,
      onInputValueChange: setInputValue,
      onSelectedValueChange: setSelectedValue,
      onHighlightedOptionIdChange: setHighlightedOptionId,

      // Options
      autocomplete,
      openOnFocus,
      closeOnSelect,
      clearOnSelect,
      loop,

      // Callback
      onSelect,
    },
    actions: {
      // DOM actions override
      scrollOptionIntoView: () => {
        if (highlightedOptionId) {
          requestAnimationFrame(() => {
            const element = store.getElement(highlightedOptionId, 'option')
            element?.scrollIntoView({ block: 'nearest' })
          })
        }
      },
      focusInput: () => {
        requestAnimationFrame(() => {
          const element = store.getElement(comboboxId, 'input')
          ;(element as HTMLInputElement | null)?.focus()
        })
      },
    },
  })

  const contextValue: ComboboxContextValue = {
    comboboxId,
    isOpen: isOpen ?? false,
    inputValue: inputValue ?? '',
    selectedValue: selectedValue ?? null,
    highlightedOptionId,
    autocomplete,
    store,
    send,
    getFilteredOptions,
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
      store,
      send,
      getFilteredOptions,
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
      const options = getFilteredOptions()
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          send('HIGHLIGHT_NEXT', { options })
          break
        case 'ArrowUp':
          event.preventDefault()
          send('HIGHLIGHT_PREV', { options })
          break
        case 'Enter':
          if (isOpen) {
            event.preventDefault()
          }
          send('SELECT_HIGHLIGHTED', { options })
          break
        case 'Escape':
          // DismissableLayer에서 처리
          break
        case 'Home':
          if (isOpen) {
            event.preventDefault()
            send('HIGHLIGHT_FIRST', { options })
          }
          break
        case 'End':
          if (isOpen) {
            event.preventDefault()
            send('HIGHLIGHT_LAST', { options })
          }
          break
        case 'Tab':
          if (isOpen) {
            send('CLOSE')
          }
          break
      }
    }

    // Input handler
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      // INPUT_CHANGE 시점에는 새로운 inputValue로 필터링된 옵션이 필요
      // 하지만 아직 inputValue가 업데이트되지 않았으므로 새 값으로 필터링
      send('INPUT_CHANGE', { value: event.target.value, options: getFilteredOptions() })
    }

    // Focus handler
    const handleFocus = () => {
      send('INPUT_FOCUS', { options: getFilteredOptions() })
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
    const { comboboxId, isOpen, store, send, getFilteredOptions } =
      useComboboxContext()

    const { ref, domId } = useNode<ComboboxRole>({
      role: 'trigger',
      id: comboboxId,
    })

    const handleClick = () => {
      send('TOGGLE', { options: getFilteredOptions() })
      // Toggle 후 input으로 포커스
      const inputEl = store.getElement(comboboxId, 'input')
      ;(inputEl as HTMLInputElement | null)?.focus()
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
            'data-part': 'trigger',
            'data-state': isOpen ? 'open' : 'closed',
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
    const { comboboxId, isOpen, store, send } = useComboboxContext()

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
      send('CLOSE')
    }, [send])

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

        send('CLOSE')
      },
      [send, store, comboboxId],
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
    const { selectedValue, highlightedOptionId, send } = useComboboxContext()

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

    // Option 객체 생성 (event payload로 전달)
    const option: ComboboxOption = {
      id: optionId,
      value,
      label: displayLabel,
      disabled,
    }

    const handleClick = () => {
      if (disabled) return
      send('SELECT_OPTION', { option })
    }

    const handleMouseEnter = () => {
      if (disabled) return
      send('HIGHLIGHT', { option })
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
            'data-part': 'option',
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
