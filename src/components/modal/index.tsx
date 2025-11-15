import React from 'react'
import { type ComponentPropsWithoutRef } from 'react'
import { createPortal } from 'react-dom'

export type RootProps = {
  children: React.ReactNode
}
export function Root({ children, ...rest }: RootProps) {
  return <React.Fragment {...rest}>{children}</React.Fragment>
}

export type TriggerProps = ComponentPropsWithoutRef<'button'>
export function Trigger(props: TriggerProps) {
  return <button type="button" {...props} />
}

export type CloseTriggerProps = ComponentPropsWithoutRef<'button'>
export function CloseTrigger(props: CloseTriggerProps) {
  return <button type="button" {...props} />
}

export type ContentProps = ComponentPropsWithoutRef<'div'>
export function Content(props: ContentProps) {
  return <div {...props} />
}

export type BackdropProps = ComponentPropsWithoutRef<'div'>
export function Backdrop(props: BackdropProps) {
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
