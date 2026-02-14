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
import { createFocusTrap, type FocusTrap } from 'focus-trap'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import { usePresence } from '../../hooks/use-presence'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'
import { DismissableLayer } from '../../primitives/dismissable-layer'

// ============================================
// Types
// ============================================

type ModalContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: RefObject<HTMLButtonElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  initialFocusRef: RefObject<HTMLElement | null>
  setInitialFocusRef: (ref: RefObject<HTMLElement | null>) => void
  closeOnEscape: boolean
  closeOnBackdropClick: boolean
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

  const trapRef = useRef<FocusTrap | null>(null)
  const prevOverflowRef = useRef<string>('')

  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  // Focus trap + scroll lock as direct useEffect
  useEffect(() => {
    if (!open) return

    // Lock scroll
    prevOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Activate focus trap after DOM renders
    const rafId = requestAnimationFrame(() => {
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

    return () => {
      cancelAnimationFrame(rafId)
      trapRef.current?.deactivate()
      trapRef.current = null
      document.body.style.overflow = prevOverflowRef.current
      triggerRef.current?.focus()
    }
  }, [open])

  const setInitialFocusRef = useCallback((ref: RefObject<HTMLElement | null>) => {
    initialFocusRefState.current = ref
  }, [])

  const contextValue: ModalContextValue = {
    open,
    setOpen,
    triggerRef,
    contentRef,
    initialFocusRef: initialFocusRefState.current,
    setInitialFocusRef,
    closeOnEscape,
    closeOnBackdropClick,
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
    const { open, setOpen, triggerRef, contentId } = useModalContext()

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
            onClick: () => setOpen(true),
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
    const { open, setOpen, closeOnBackdropClick } = useModalContext()

    const elementRef = useRef<HTMLDivElement>(null)

    const { isPresent, transitionState } = usePresence({
      isVisible: open,
      resolveElement: () => elementRef.current,
    })

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
            onClick: () => {
              if (closeOnBackdropClick) setOpen(false)
            },
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
      setOpen,
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

    useEffect(() => {
      if (initialFocusRef) {
        setInitialFocusRef(initialFocusRef)
      }
    }, [initialFocusRef, setInitialFocusRef])

    const handleEscapeKeyDown = useCallback(() => {
      if (closeOnEscape) {
        setOpen(false)
      }
    }, [closeOnEscape, setOpen])

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
    const { setOpen } = useModalContext()

    return (
      <button
        ref={forwardedRef}
        {...mergeProps(
          {
            type: 'button',
            'data-part': 'close',
            onClick: () => setOpen(false),
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
