import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'
import { createPortal } from 'react-dom'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import type * as focusTrapLib from 'focus-trap'
import { useMachine, type Send } from 'controlled-machine/react'

import { modalMachine, type ModalEvents } from './machine'
import { usePresence } from '../../hooks/use-presence'
import { useStableCallback } from '../../hooks/use-stable-callback'
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

type ModalRole =
  | 'trigger'
  | 'close-trigger'
  | 'content'
  | 'backdrop'
  | 'title'
  | 'description'

type ModalMeta = object

type ModalContextValue = {
  modalId: string
  isOpen: boolean
  send: Send<ModalEvents>
  store: NodeStore<ModalRole, ModalMeta>
}

// ============================================
// Contexts
// ============================================

const ModalContext = createContext<ModalContextValue | null>(null)

function useModalContext() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('Modal 컴포넌트는 Modal.Root 안에서 사용해야 합니다.')
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  initialFocus?: HTMLElement | (() => HTMLElement | null)
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
}

export function Root(props: RootProps) {
  return (
    <NodeStoreProvider<ModalRole, ModalMeta>>
      <RootInner {...props} />
    </NodeStoreProvider>
  )
}

function RootInner({
  children,
  open: openProp,
  onOpenChange,
  defaultOpen = false,
  initialFocus,
  closeOnOutsideClick = false,
  closeOnEscape = true,
}: RootProps) {
  const store = useNodeStore<ModalRole, ModalMeta>()
  const modalId = useId()

  const [isOpen = false, setOpen] = useControllableState({
    prop: openProp,
    onChange: onOpenChange,
    defaultProp: defaultOpen,
  })

  // Effect state refs (exposed via getter/setter to keep machine React-agnostic)
  const trapRef = useRef<focusTrapLib.FocusTrap | null>(null)
  const prevOverflowRef = useRef<string>('')

  // Initial focus callback
  const getInitialFocusElement = useStableCallback(() => {
    if (typeof initialFocus === 'function') {
      return initialFocus()
    }
    return initialFocus
  })

  // Event machine (state 기능 활용)
  const { send } = useMachine(modalMachine, {
    state: isOpen ? 'open' : 'closed',
    onOpenChange: setOpen,
    closeOnEscape,
    closeOnOutsideClick,
    getContentElement: () => store.getElement(modalId, 'content'),
    getInitialFocusElement,
    getTrap: () => trapRef.current,
    onTrapChange: (trap: focusTrapLib.FocusTrap | null) => {
      trapRef.current = trap
    },
    getPrevOverflow: () => prevOverflowRef.current,
    onPrevOverflowChange: (overflow: string) => {
      prevOverflowRef.current = overflow
    },
  })

  const contextValue: ModalContextValue = {
    modalId,
    isOpen,
    send,
    store,
  }

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  )
}

// ============================================
// Trigger
// ============================================

export type TriggerProps = ComponentPropsWithoutRef<'button'>

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { modalId, send } = useModalContext()

    const { ref, domId } = useNode<ModalRole>({
      role: 'trigger',
      id: modalId,
    })

    const handleClick = () => {
      send('OPEN')
    }

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            type: 'button',
            id: domId,
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
// CloseTrigger
// ============================================

export type CloseTriggerProps = ComponentPropsWithoutRef<'button'>

export const CloseTrigger = forwardRef<HTMLButtonElement, CloseTriggerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { modalId, send } = useModalContext()

    const { ref, domId } = useNode<ModalRole>({
      role: 'close-trigger',
      id: modalId,
    })

    const handleClick = () => {
      send('CLOSE')
    }

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            type: 'button',
            id: domId,
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
// Content
// ============================================

export type ContentProps = ComponentPropsWithoutRef<'div'>

export const Content = forwardRef<HTMLDivElement, ContentProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { modalId, isOpen, store } = useModalContext()

    const { ref, domId, elementRef } = useNode<ModalRole>({
      role: 'content',
      id: modalId,
    })

    const { isPresent, transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => elementRef.current,
    })

    // store에서 title/description element의 id 구독
    const titleId = useStoreSubscribe(
      store,
      (s) => s.getElement(modalId, 'title')?.id || null,
    )
    const descriptionId = useStoreSubscribe(
      store,
      (s) => s.getElement(modalId, 'description')?.id || null,
    )

    if (!isPresent) {
      return null
    }

    return (
      <div
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            role: 'dialog',
            id: domId,
            'aria-modal': true,
            'aria-labelledby': titleId ?? undefined,
            'aria-describedby': descriptionId ?? undefined,
            'data-state': isOpen ? 'open' : 'closed',
            'data-transition': transitionState,
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
// Backdrop
// ============================================

export type BackdropProps = ComponentPropsWithoutRef<'div'>

export const Backdrop = forwardRef<HTMLDivElement, BackdropProps>(
  ({ ...rest }, forwardedRef) => {
    const { modalId, isOpen, send } = useModalContext()

    const { ref, domId, elementRef } = useNode<ModalRole>({
      role: 'backdrop',
      id: modalId,
    })

    const { isPresent, transitionState } = usePresence({
      isVisible: isOpen,
      resolveElement: () => elementRef.current,
    })

    const handleClick = () => {
      send('OUTSIDE_CLICK')
    }

    if (!isPresent) {
      return null
    }

    return (
      <div
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            id: domId,
            onClick: handleClick,
            'data-state': isOpen ? 'open' : 'closed',
            'data-transition': transitionState,
          },
          rest,
        )}
      />
    )
  },
)

// ============================================
// Title
// ============================================

export type TitleProps = ComponentPropsWithoutRef<'h2'>

export const Title = forwardRef<HTMLHeadingElement, TitleProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { modalId } = useModalContext()

    const { ref, domId } = useNode<ModalRole>({
      role: 'title',
      id: modalId,
    })

    return (
      <h2
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps({ id: domId }, rest)}
      >
        {children}
      </h2>
    )
  },
)

// ============================================
// Description
// ============================================

export type DescriptionProps = ComponentPropsWithoutRef<'p'>

export const Description = forwardRef<HTMLParagraphElement, DescriptionProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { modalId } = useModalContext()

    const { ref, domId } = useNode<ModalRole>({
      role: 'description',
      id: modalId,
    })

    return (
      <p
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps({ id: domId }, rest)}
      >
        {children}
      </p>
    )
  },
)

// ============================================
// Portal
// ============================================

export type PortalProps = {
  children: React.ReactNode
  container?: Element | DocumentFragment
  key?: React.Key | null
}

export function Portal({
  children,
  container = document.body,
  key,
}: PortalProps) {
  return createPortal(children, container, key)
}

// ============================================
// Export
// ============================================

const Modal = {
  Root,
  Trigger,
  CloseTrigger,
  Content,
  Backdrop,
  Title,
  Description,
  Portal,
}

export default Modal
