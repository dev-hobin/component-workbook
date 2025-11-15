import { useControllableState } from '@radix-ui/react-use-controllable-state'
import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
} from 'react'
import { type ComponentPropsWithoutRef } from 'react'
import { createPortal } from 'react-dom'
import * as focusTrap from 'focus-trap'
import { useStableCallback } from '../../hooks/useStableCallback'
import { usePresence } from '../../hooks/usePresence'

function isFocusInside(containers: (HTMLElement | null)[]): boolean {
  const activeElement = document.activeElement
  if (!activeElement) return false

  return containers
    .filter((container): container is HTMLElement => Boolean(container))
    .some((container) => container.contains(activeElement))
}

const ModalContext = createContext<
  | {
      open: boolean
      openModal: () => void
      closeModal: () => void
      idRules: {
        rootId: string
        backdropId: string
        contentId: string
        titleId: string
        descriptionId: string
        triggerId: string
        closeTriggerId: string
      }
      closeOnOutsideClick: boolean
    }
  | undefined
>(undefined)

function useModalContext() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModalContext must be used within a Modal.Root')
  }
  return context
}

export type RootProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  children: React.ReactNode
  idRules?: {
    rootId?: string
    backdropId?: string
    contentId?: string
    titleId?: string
    descriptionId?: string
    triggerId?: string
    closeTriggerId?: string
  }
  initialFocus?: HTMLElement | (() => HTMLElement | null)
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
}
export function Root({
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  defaultOpen: defaultOpenProp = false,
  idRules,
  initialFocus,
  closeOnOutsideClick = false,
  closeOnEscape = true,
}: RootProps) {
  const defaultId = useId()
  const rootId = idRules?.rootId ?? defaultId
  const backdropId = idRules?.backdropId ?? `${rootId}-backdrop`
  const contentId = idRules?.contentId ?? `${rootId}-content`
  const titleId = idRules?.titleId ?? `${rootId}-title`
  const descriptionId = idRules?.descriptionId ?? `${rootId}-description`
  const triggerId = idRules?.triggerId ?? `${rootId}-trigger`
  const closeTriggerId = idRules?.closeTriggerId ?? `${rootId}-close-trigger`

  const [open, setOpen] = useControllableState({
    prop: openProp,
    onChange: onOpenChangeProp,
    defaultProp: defaultOpenProp,
  })

  const { isPresent: isContentPresent } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(contentId),
  })

  const openModal = () => {
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
  }

  const closeModalStableCallback = useStableCallback(closeModal)
  useEffect(() => {
    if (!isContentPresent || !closeOnEscape) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      if (
        !isFocusInside([
          document.getElementById(backdropId),
          document.getElementById(contentId),
        ])
      ) {
        return
      }

      closeModalStableCallback()
    }

    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [
    backdropId,
    closeModalStableCallback,
    closeOnEscape,
    contentId,
    isContentPresent,
  ])

  const initialFocusCallback = useStableCallback(() => {
    if (typeof initialFocus === 'function') {
      return initialFocus()
    }

    return initialFocus
  })
  useEffect(() => {
    if (!isContentPresent) {
      return
    }

    const contentEl = document.getElementById(contentId)
    if (!contentEl) {
      return
    }

    const trap = focusTrap
      .createFocusTrap(contentEl, {
        initialFocus: initialFocusCallback() ?? undefined,
        allowOutsideClick: closeOnOutsideClick,
        escapeDeactivates: closeOnEscape,
      })
      .activate()

    return () => {
      trap.deactivate()
    }
  }, [
    isContentPresent,
    initialFocusCallback,
    closeOnOutsideClick,
    closeOnEscape,
    contentId,
  ])

  useLayoutEffect(() => {
    if (!open) {
      return
    }

    const overflowStyle = getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflowStyle
    }
  }, [open])

  return (
    <ModalContext.Provider
      value={{
        open,
        openModal,
        closeModal,
        idRules: {
          rootId,
          backdropId,
          contentId,
          titleId,
          descriptionId,
          triggerId,
          closeTriggerId,
        },
        closeOnOutsideClick,
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export type TriggerProps = ComponentPropsWithoutRef<'button'>
export function Trigger({ onClick, ...rest }: TriggerProps) {
  const { openModal, idRules } = useModalContext()

  return (
    <button
      id={idRules.triggerId}
      type="button"
      onClick={(event) => {
        openModal()
        onClick?.(event)
      }}
      {...rest}
    />
  )
}

export type CloseTriggerProps = ComponentPropsWithoutRef<'button'>
export function CloseTrigger({ onClick, ...rest }: CloseTriggerProps) {
  const { closeModal, idRules } = useModalContext()

  return (
    <button
      id={idRules.closeTriggerId}
      type="button"
      onClick={(event) => {
        closeModal()
        onClick?.(event)
      }}
      {...rest}
    />
  )
}

export type ContentProps = ComponentPropsWithoutRef<'div'>
export function Content(props: ContentProps) {
  const { open, idRules } = useModalContext()
  const [ariaIds, setAriaIds] = useState<{
    titleId: string | undefined
    descriptionId: string | undefined
  }>({
    titleId: undefined,
    descriptionId: undefined,
  })

  const { isPresent, transitionState } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(idRules.contentId),
  })

  useLayoutEffect(() => {
    if (!isPresent) {
      return
    }

    const isTitleExist = !!document.getElementById(idRules.titleId)
    const isDescriptionExist = !!document.getElementById(idRules.descriptionId)

    setAriaIds({
      titleId: isTitleExist ? idRules.titleId : undefined,
      descriptionId: isDescriptionExist ? idRules.descriptionId : undefined,
    })
  }, [idRules.titleId, idRules.descriptionId, isPresent])

  if (!isPresent) {
    return null
  }

  return (
    <div
      id={idRules.contentId}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaIds.titleId}
      aria-describedby={ariaIds.descriptionId}
      data-state={open ? 'open' : 'closed'}
      data-transition={transitionState}
      {...props}
    />
  )
}

export type BackdropProps = ComponentPropsWithoutRef<'div'>
export function Backdrop({ onClick, ...rest }: BackdropProps) {
  const { closeModal, open, idRules, closeOnOutsideClick } = useModalContext()

  const { isPresent, transitionState } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(idRules.backdropId),
  })

  if (!isPresent) {
    return null
  }

  return (
    <div
      id={idRules.backdropId}
      onClick={(event) => {
        if (closeOnOutsideClick) {
          closeModal()
        }
        onClick?.(event)
      }}
      data-state={open ? 'open' : 'closed'}
      data-transition={transitionState}
      {...rest}
    />
  )
}

export type TitleProps = ComponentPropsWithoutRef<'h2'>
export function Title(props: TitleProps) {
  const { idRules } = useModalContext()
  return <h2 id={idRules.titleId} {...props} />
}

export type DescriptionProps = ComponentPropsWithoutRef<'p'>
export function Description(props: DescriptionProps) {
  const { idRules } = useModalContext()
  return <p id={idRules.descriptionId} {...props} />
}

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
