import ModalPrimitives, {
  type RootProps,
  type TriggerProps,
  type CloseTriggerProps,
  type ContentProps,
  type BackdropProps,
  type TitleProps,
  type DescriptionProps,
  type PortalProps,
} from '.'
import { cn } from '../../utils/cn'

export function Root(props: RootProps) {
  return <ModalPrimitives.Root {...props} />
}

export function Trigger({ className, ...rest }: TriggerProps) {
  return (
    <ModalPrimitives.Trigger
      className={cn(
        'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors',
        className,
      )}
      {...rest}
    />
  )
}

export function CloseTrigger({ className, ...rest }: CloseTriggerProps) {
  return (
    <ModalPrimitives.CloseTrigger
      className={cn(
        'px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors',
        className,
      )}
      {...rest}
    />
  )
}

export function Backdrop({ className, ...rest }: BackdropProps) {
  return (
    <ModalPrimitives.Backdrop
      className={cn(
        'fixed inset-0 bg-black/50 z-40 transition-opacity duration-150',
        // Enter animation (starting)
        'data-[transition=starting]:opacity-0',
        // Idle state (fully visible)
        'data-[transition=idle]:opacity-100',
        // Exit animation (ending)
        'data-[transition=ending]:opacity-0',
        className,
      )}
      {...rest}
    />
  )
}

export function Content({ className, ...rest }: ContentProps) {
  return (
    <ModalPrimitives.Content
      className={cn(
        'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 z-50',
        'max-h-[90vh] overflow-y-auto',
        'focus:outline-none',
        'transition-all duration-200 ease-out',
        // Enter animation (starting)
        'data-[transition=starting]:opacity-0',
        'data-[transition=starting]:scale-95',
        'data-[transition=starting]:-translate-y-2',
        // Idle state (fully visible)
        'data-[transition=idle]:opacity-100',
        'data-[transition=idle]:scale-100',
        'data-[transition=idle]:translate-y-0',
        // Exit animation (ending)
        'data-[transition=ending]:opacity-0',
        'data-[transition=ending]:scale-95',
        'data-[transition=ending]:-translate-y-2',
        'data-[transition=ending]:duration-150',
        'data-[transition=ending]:ease-in',
        className,
      )}
      {...rest}
    />
  )
}

export function Title({ className, ...rest }: TitleProps) {
  return (
    <ModalPrimitives.Title
      className={cn('text-lg font-semibold text-gray-900 mb-2', className)}
      {...rest}
    />
  )
}

export function Description({ className, ...rest }: DescriptionProps) {
  return (
    <ModalPrimitives.Description
      className={cn('text-sm text-gray-600 mb-4', className)}
      {...rest}
    />
  )
}

export function Portal({ ...rest }: PortalProps) {
  return <ModalPrimitives.Portal {...rest} />
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
