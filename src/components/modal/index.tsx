import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'
import { createPortal } from 'react-dom'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import * as focusTrap from 'focus-trap'

import {
  createModalState,
  deriveStatus,
  getEffectsOnStatusChange,
  handleOutsideClick,
  type ModalState,
  type ModalStatus,
  type ModalEffect,
} from './core'
import { usePresence } from '../../hooks/usePresence'
import { useStableCallback } from '../../hooks/useStableCallback'
import { useLatestRef } from '../../hooks/useLatestRef'
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
  state: ModalState
  setOpen: (open: boolean) => void
  store: ComponentStore<ModalRole, ModalMeta>
  runEffect: (effect: ModalEffect) => void
  initialFocus?: HTMLElement | (() => HTMLElement | null)
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
    <ComponentStoreProvider<ModalRole, ModalMeta>>
      <RootInner {...props} />
    </ComponentStoreProvider>
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
  const { store } = useComponentStore<ModalRole, ModalMeta>()
  const modalId = useId()

  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    onChange: onOpenChange,
    defaultProp: defaultOpen,
  })

  // Core state 생성
  const state: ModalState = useMemo(
    () => createModalState({ open, closeOnEscape, closeOnOutsideClick }),
    [open, closeOnEscape, closeOnOutsideClick],
  )

  // Status 파생 (원시값)
  const status: ModalStatus = deriveStatus(state)
  const prevStatusRef = useRef<ModalStatus>('idle')

  // Effect interpreter refs
  const trapRef = useRef<ReturnType<typeof focusTrap.createFocusTrap> | null>(
    null,
  )
  const prevOverflowRef = useRef<string>('')

  const initialFocusCallback = useStableCallback(() => {
    if (typeof initialFocus === 'function') {
      return initialFocus()
    }
    return initialFocus
  })

  const runEffect = useCallback(
    (effect: ModalEffect) => {
      switch (effect.type) {
        case 'ACTIVATE_FOCUS_TRAP': {
          requestAnimationFrame(() => {
            const contentEl = store.getElement(modalId, 'content')
            if (contentEl && !trapRef.current) {
              trapRef.current = focusTrap
                .createFocusTrap(contentEl, {
                  initialFocus: initialFocusCallback() ?? undefined,
                  fallbackFocus: contentEl,
                  allowOutsideClick: effect.context.closeOnOutsideClick,
                  escapeDeactivates: effect.context.closeOnEscape,
                  onDeactivate: () => setOpen(false),
                })
                .activate()
            }
          })
          break
        }
        case 'DEACTIVATE_FOCUS_TRAP':
          if (trapRef.current) {
            trapRef.current.deactivate()
            trapRef.current = null
          }
          break
        case 'LOCK_BODY_SCROLL':
          prevOverflowRef.current = getComputedStyle(document.body).overflow
          document.body.style.overflow = 'hidden'
          break
        case 'UNLOCK_BODY_SCROLL':
          document.body.style.overflow = prevOverflowRef.current
          break
        case 'CLOSE_MODAL':
          setOpen(false)
          break
      }
    },
    [initialFocusCallback, modalId, setOpen, store],
  )

  const runEffectRef = useLatestRef(runEffect)
  const contextRef = useLatestRef({ closeOnEscape, closeOnOutsideClick })

  // Status 전환 시 효과 실행
  useLayoutEffect(() => {
    const prevStatus = prevStatusRef.current
    const effects = getEffectsOnStatusChange(
      prevStatus,
      status,
      contextRef.current,
    )
    effects.forEach((e) => runEffectRef.current(e))
    prevStatusRef.current = status
  }, [status, contextRef, runEffectRef])

  // 언마운트 시 리소스 정리
  useEffect(() => {
    return () => {
      if (trapRef.current) {
        trapRef.current.deactivate({ onDeactivate: () => {} })
        trapRef.current = null
      }
      document.body.style.overflow = prevOverflowRef.current
      prevStatusRef.current = 'idle'
    }
  }, [])

  const contextValue = useMemo<ModalContextValue>(
    () => ({
      modalId,
      state,
      setOpen,
      store,
      runEffect,
      initialFocus,
    }),
    [modalId, state, setOpen, store, runEffect, initialFocus],
  )

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
    const { modalId, setOpen } = useModalContext()

    const { ref, domId } = useNode<ModalRole>({
      role: 'trigger',
      id: modalId,
    })

    const handleClick = useCallback(() => {
      setOpen(true)
    }, [setOpen])

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
    const { modalId, setOpen } = useModalContext()

    const { ref, domId } = useNode<ModalRole>({
      role: 'close-trigger',
      id: modalId,
    })

    const handleClick = useCallback(() => {
      setOpen(false)
    }, [setOpen])

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
    const { modalId, state, store } = useModalContext()

    const { ref, domId, elementRef } = useNode<ModalRole>({
      role: 'content',
      id: modalId,
    })

    const { isPresent, transitionState } = usePresence({
      isVisible: state.open,
      resolveElement: () => elementRef.current,
    })

    // store에서 title/description element의 id 구독
    const titleId = useComponentSubscribe(
      store,
      (s) => s.getElement(modalId, 'title')?.id || null,
    )
    const descriptionId = useComponentSubscribe(
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
            'data-state': state.open ? 'open' : 'closed',
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
    const { modalId, state, runEffect } = useModalContext()

    const { ref, domId, elementRef } = useNode<ModalRole>({
      role: 'backdrop',
      id: modalId,
    })

    const { isPresent, transitionState } = usePresence({
      isVisible: state.open,
      resolveElement: () => elementRef.current,
    })

    const handleClick = useCallback(() => {
      handleOutsideClick(state).forEach(runEffect)
    }, [state, runEffect])

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
            'data-state': state.open ? 'open' : 'closed',
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
