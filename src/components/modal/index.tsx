import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { createFocusTrap, type FocusTrap } from 'focus-trap'
import { useMachine, type Send } from 'controlled-machine/react'

import { modalMachine, type ModalEvents, type ModalComputed } from './machine'
import { usePresence } from '../../hooks/use-presence'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'
import { DismissableLayer } from '../../primitives/dismissable-layer'

// ============================================
// Types
// ============================================

type ModalContextValue = {
  open: boolean
  send: Send<ModalEvents>
  computed: ModalComputed
  triggerRef: RefObject<HTMLButtonElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  initialFocusRef: RefObject<HTMLElement | null>
  setInitialFocusRef: (ref: RefObject<HTMLElement | null>) => void
  closeOnEscape: boolean
  titleId: string
  descriptionId: string
  contentId: string
}

// ============================================
// Contexts
// ============================================

const ModalContext = createContext<ModalContextValue | null>(null)

function useModalContext() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('Modal components must be used within Modal.Root')
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  closeOnEscape?: boolean
  closeOnBackdropClick?: boolean
}

export function Root({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  closeOnEscape = true,
  closeOnBackdropClick = true,
}: RootProps) {
  const id = useId()
  const titleId = `${id}-title`
  const descriptionId = `${id}-description`
  const contentId = `${id}-content`

  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const initialFocusRefState = useRef<RefObject<HTMLElement | null>>({ current: null })

  // Focus trap & scroll lock state
  const trapRef = useRef<FocusTrap | null>(null)
  const prevOverflowRef = useRef<string>('')

  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  // DOM helpers for machine effects (Shell이 타이밍 책임)
  const activateFocusTrap = useCallback(() => {
    // DOM 렌더링 대기 후 포커스 트랩 활성화
    requestAnimationFrame(() => {
      const contentElement = contentRef.current
      if (!contentElement) return

      try {
        const trap = createFocusTrap(contentElement, {
          initialFocus: initialFocusRefState.current?.current ?? undefined,
          fallbackFocus: contentElement,
          escapeDeactivates: false,
          clickOutsideDeactivates: false,
          returnFocusOnDeactivate: false,
          allowOutsideClick: true,
        })
        trap.activate()
        trapRef.current = trap
      } catch {
        // focus-trap 활성화 실패 시 무시 (테스트 환경 등)
      }
    })
  }, [])

  const deactivateFocusTrap = useCallback(() => {
    trapRef.current?.deactivate()
    trapRef.current = null
    triggerRef.current?.focus()
  }, [])

  const lockScroll = useCallback(() => {
    prevOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }, [])

  const unlockScroll = useCallback(() => {
    document.body.style.overflow = prevOverflowRef.current
  }, [])

  const { send, computed } = useMachine(modalMachine, {
    input: {
      open,
      onOpenChange: setOpen,
      closeOnEscape,
      closeOnBackdropClick,
    },
    actions: {
      // DOM actions override
      lockScroll,
      unlockScroll,
      activateFocusTrap,
      deactivateFocusTrap,
    },
  })

  const setInitialFocusRef = useCallback((ref: RefObject<HTMLElement | null>) => {
    initialFocusRefState.current = ref
  }, [])

  const contextValue: ModalContextValue = {
    open,
    send,
    computed,
    triggerRef,
    contentRef,
    initialFocusRef: initialFocusRefState.current,
    setInitialFocusRef,
    closeOnEscape,
    titleId,
    descriptionId,
    contentId,
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
    const { open, send, triggerRef, contentId } = useModalContext()

    const handleClick = () => {
      send('OPEN')
    }

    return (
      <button
        ref={composeRefs(forwardedRef, triggerRef)}
        {...mergeProps(
          {
            type: 'button',
            'aria-haspopup': 'dialog' as const,
            'aria-expanded': open,
            'aria-controls': open ? contentId : undefined,
            'data-part': 'trigger',
            'data-state': open ? 'open' : 'closed',
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
// Portal
// ============================================

export type PortalProps = {
  children: React.ReactNode
  container?: Element | DocumentFragment
}

export function Portal({ children, container = document.body }: PortalProps) {
  return createPortal(children, container)
}

// ============================================
// Backdrop
// ============================================

export type BackdropProps = ComponentPropsWithoutRef<'div'>

export const Backdrop = forwardRef<HTMLDivElement, BackdropProps>(
  ({ ...rest }, forwardedRef) => {
    const { open, send } = useModalContext()

    const elementRef = useRef<HTMLDivElement>(null)

    const { isPresent, transitionState } = usePresence({
      isVisible: open,
      resolveElement: () => elementRef.current,
    })

    const handleClick = () => {
      send('BACKDROP_CLICK')
    }

    if (!isPresent) {
      return null
    }

    return (
      <div
        ref={composeRefs(forwardedRef, elementRef)}
        {...mergeProps(
          {
            'aria-hidden': true,
            'data-part': 'backdrop',
            'data-state': open ? 'open' : 'closed',
            'data-transition': transitionState,
            onClick: handleClick,
          },
          rest,
        )}
      />
    )
  },
)

// ============================================
// Content
// ============================================

export type ContentProps = {
  initialFocusRef?: RefObject<HTMLElement | null>
} & ComponentPropsWithoutRef<'div'>

export const Content = forwardRef<HTMLDivElement, ContentProps>(
  ({ children, initialFocusRef, ...rest }, forwardedRef) => {
    const {
      open,
      send,
      contentRef,
      setInitialFocusRef,
      closeOnEscape,
      titleId,
      descriptionId,
      contentId,
    } = useModalContext()

    const elementRef = useRef<HTMLDivElement>(null)

    const { isPresent, transitionState } = usePresence({
      isVisible: open,
      resolveElement: () => elementRef.current,
    })

    // initialFocusRef를 Root에 전달하여 machine effects에서 사용
    useEffect(() => {
      if (initialFocusRef) {
        setInitialFocusRef(initialFocusRef)
      }
    }, [initialFocusRef, setInitialFocusRef])

    // Escape 키 핸들러 - DismissableLayer가 topmost일 때만 호출됨
    const handleEscapeKeyDown = useCallback(() => {
      send('ESCAPE_KEY')
    }, [send])

    if (!isPresent) {
      return null
    }

    return (
      <DismissableLayer
        isActive={open}
        dismissOnEscape={closeOnEscape}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <div
          ref={composeRefs(forwardedRef, elementRef, contentRef)}
          {...mergeProps(
            {
              role: 'dialog',
              id: contentId,
              'aria-modal': true,
              'aria-labelledby': titleId,
              'aria-describedby': descriptionId,
              tabIndex: -1,
              'data-part': 'content',
              'data-state': open ? 'open' : 'closed',
              'data-transition': transitionState,
            },
            rest,
          )}
        >
          {children}
        </div>
      </DismissableLayer>
    )
  },
)

// ============================================
// Title
// ============================================

export type TitleProps = ComponentPropsWithoutRef<'h2'>

export const Title = forwardRef<HTMLHeadingElement, TitleProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { titleId } = useModalContext()

    return (
      <h2
        ref={forwardedRef}
        {...mergeProps(
          {
            id: titleId,
            'data-part': 'title',
          },
          rest,
        )}
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
    const { descriptionId } = useModalContext()

    return (
      <p
        ref={forwardedRef}
        {...mergeProps(
          {
            id: descriptionId,
            'data-part': 'description',
          },
          rest,
        )}
      >
        {children}
      </p>
    )
  },
)

// ============================================
// Close
// ============================================

export type CloseProps = ComponentPropsWithoutRef<'button'>

export const Close = forwardRef<HTMLButtonElement, CloseProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { send } = useModalContext()

    const handleClick = () => {
      send('CLOSE')
    }

    return (
      <button
        ref={forwardedRef}
        {...mergeProps(
          {
            type: 'button',
            'data-part': 'close',
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
// Export
// ============================================

const Modal = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Content,
  Title,
  Description,
  Close,
}

export default Modal
