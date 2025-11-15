import { useControllableState } from '@radix-ui/react-use-controllable-state'
import React, { createContext, useContext } from 'react'
import { type ComponentPropsWithoutRef } from 'react'
import { createPortal } from 'react-dom'

const ModalContext = createContext<
  { open: boolean; openModal: () => void; closeModal: () => void } | undefined
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
}
export function Root({
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  defaultOpen: defaultOpenProp = false,
}: RootProps) {
  const [open, setOpen] = useControllableState({
    prop: openProp,
    onChange: onOpenChangeProp,
    defaultProp: defaultOpenProp,
  })

  const openModal = () => {
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
  }

  return (
    <ModalContext.Provider value={{ open, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  )
}

export type TriggerProps = ComponentPropsWithoutRef<'button'>
export function Trigger({ onClick, ...rest }: TriggerProps) {
  const { openModal } = useModalContext()

  return (
    <button
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
  const { closeModal } = useModalContext()

  return (
    <button
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
  const { open } = useModalContext()

  if (!open) {
    return null
  }

  return <div role="dialog" aria-modal="true" {...props} />
}

export type BackdropProps = ComponentPropsWithoutRef<'div'>
export function Backdrop(props: BackdropProps) {
  const { open } = useModalContext()

  if (!open) {
    return null
  }

  return <div {...props} />
}

export type TitleProps = ComponentPropsWithoutRef<'h2'>
export function Title(props: TitleProps) {
  return <h2 {...props} />
}

export type DescriptionProps = ComponentPropsWithoutRef<'p'>
export function Description(props: DescriptionProps) {
  return <p {...props} />
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
