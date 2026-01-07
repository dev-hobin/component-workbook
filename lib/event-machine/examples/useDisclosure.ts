/**
 * useDisclosure 예시
 * Event Machine으로 구현한 Disclosure 컴포넌트 훅
 */

import { useState, useMemo, useCallback } from 'react'
import { useEventMachine, EventMachine } from '../index'

// ============================================
// Types
// ============================================

type DisclosureContext = {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  disabled: boolean
  onOpen?: () => void
  onClose?: () => void
  onToggle?: (isOpen: boolean) => void
}

type UseDisclosureProps = {
  /** Controlled 모드 */
  isOpen?: boolean
  /** Uncontrolled 초기값 */
  defaultIsOpen?: boolean
  /** 열림 시 콜백 */
  onOpen?: () => void
  /** 닫힘 시 콜백 */
  onClose?: () => void
  /** 토글 시 콜백 */
  onToggle?: (isOpen: boolean) => void
  /** 비활성화 */
  disabled?: boolean
}

// ============================================
// Machine Definition
// ============================================

const disclosureMachine: EventMachine<DisclosureContext> = {
  on: {
    TOGGLE: [
      { when: (ctx) => ctx.disabled, do: 'noop' },
      { when: (ctx) => ctx.isOpen, do: 'close' },
      { do: 'open' },
    ],
    OPEN: [
      { when: (ctx) => ctx.disabled, do: 'noop' },
      { when: (ctx) => ctx.isOpen, do: 'noop' }, // 이미 열림
      { do: 'open' },
    ],
    CLOSE: [
      { when: (ctx) => !ctx.isOpen, do: 'noop' }, // 이미 닫힘
      { do: 'close' },
    ],
  },

  effects: [
    {
      watch: (ctx) => ctx.isOpen,
      enter: (ctx) => {
        ctx.onOpen?.()
        ctx.onToggle?.(true)
      },
      exit: (ctx) => {
        ctx.onClose?.()
        ctx.onToggle?.(false)
      },
    },
  ],

  actions: {
    noop: () => {},
    open: (ctx) => ctx.setIsOpen(true),
    close: (ctx) => ctx.setIsOpen(false),
  },
}

// ============================================
// Hook
// ============================================

export function useDisclosure(props: UseDisclosureProps = {}) {
  const {
    isOpen: controlledIsOpen,
    defaultIsOpen = false,
    onOpen,
    onClose,
    onToggle,
    disabled = false,
  } = props

  // Internal state (uncontrolled mode)
  const [internalIsOpen, setInternalIsOpen] = useState(defaultIsOpen)

  // Controlled vs Uncontrolled
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const setIsOpen = useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setInternalIsOpen(value)
      }
      // Controlled 모드에서는 부모가 상태 관리
    },
    [isControlled],
  )

  // Build context
  const ctx: DisclosureContext = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      disabled,
      onOpen,
      onClose,
      onToggle,
    }),
    [isOpen, setIsOpen, disabled, onOpen, onClose, onToggle],
  )

  // Event machine
  const send = useEventMachine(disclosureMachine, ctx)

  return {
    isOpen,
    isControlled,
    disabled,

    // Actions
    toggle: () => send('TOGGLE'),
    open: () => send('OPEN'),
    close: () => send('CLOSE'),
    send,

    // Props getters
    getButtonProps: () => ({
      'aria-expanded': isOpen,
      'aria-disabled': disabled || undefined,
      onClick: () => send('TOGGLE'),
    }),

    getContentProps: () => ({
      hidden: !isOpen,
    }),
  }
}

// ============================================
// Usage Example
// ============================================

/*
// Uncontrolled
function Example1() {
  const disclosure = useDisclosure({
    defaultIsOpen: false,
    onOpen: () => console.log('opened'),
    onClose: () => console.log('closed'),
  });

  return (
    <div>
      <button {...disclosure.getButtonProps()}>
        {disclosure.isOpen ? 'Close' : 'Open'}
      </button>
      <div {...disclosure.getContentProps()}>
        Content here
      </div>
    </div>
  );
}

// Controlled
function Example2() {
  const [isOpen, setIsOpen] = useState(false);
  
  const disclosure = useDisclosure({
    isOpen,
    onToggle: setIsOpen,
  });

  return (
    <div>
      <button onClick={disclosure.toggle}>Toggle</button>
      {disclosure.isOpen && <div>Content</div>}
    </div>
  );
}
*/
