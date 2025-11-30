import MenuPrimitives, {
  type RootProps,
  type SubRootProps,
  type TriggerProps,
  type SubTriggerProps,
  type PositionerProps,
  type PositionerArrowProps,
  type ContentProps,
  type SubContentProps,
  type ActionItemProps,
  type LinkItemProps,
  type PortalProps,
} from './menu'
import { cn } from '../../utils/cn'

export function Root(props: RootProps) {
  return <MenuPrimitives.Root {...props} />
}

export function SubRoot(props: SubRootProps) {
  return <MenuPrimitives.SubRoot {...props} />
}

export function Trigger({ className, ...rest }: TriggerProps) {
  return (
    <MenuPrimitives.Trigger
      className={cn(
        'px-4 py-2 bg-white border border-gray-200 rounded-md',
        'hover:bg-gray-50 hover:border-gray-300',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'aria-expanded:bg-gray-50 aria-expanded:border-gray-300',
        'transition-colors',
        className,
      )}
      {...rest}
    />
  )
}

export function SubTrigger({ className, ...rest }: SubTriggerProps) {
  return (
    <MenuPrimitives.SubTrigger
      className={cn(
        'w-full text-left px-4 py-2 text-sm text-gray-700',
        'hover:bg-gray-100',
        'focus:outline-none focus:bg-gray-100',
        'aria-expanded:bg-gray-100',
        'transition-colors',
        className,
      )}
      {...rest}
    />
  )
}

export function Positioner({ className, ...rest }: PositionerProps) {
  return (
    <MenuPrimitives.Positioner className={cn('z-50', className)} {...rest} />
  )
}

export function PositionerArrow({ className, ...rest }: PositionerArrowProps) {
  return (
    <MenuPrimitives.PositionerArrow
      className={cn(
        'bg-white border border-gray-200',
        'pointer-events-none',
        className,
      )}
      {...rest}
    />
  )
}

export function Content({ className, ...rest }: ContentProps) {
  return (
    <MenuPrimitives.Content
      className={cn(
        'bg-white border border-gray-200 rounded-md shadow-lg',
        'py-1 min-w-32',
        'focus:outline-none',
        'relative z-10',
        className,
      )}
      {...rest}
    />
  )
}

export function SubContent({ className, ...rest }: SubContentProps) {
  return (
    <MenuPrimitives.SubContent
      className={cn(
        'bg-white border border-gray-200 rounded-md shadow-lg',
        'py-1 min-w-32',
        'focus:outline-none',
        'relative z-10',
        className,
      )}
      {...rest}
    />
  )
}

export function ActionItem({ className, ...rest }: ActionItemProps) {
  return (
    <MenuPrimitives.ActionItem
      className={cn(
        'w-full text-left px-4 py-2 text-sm text-gray-700',
        'hover:bg-gray-100',
        'focus:outline-none focus:bg-gray-100',
        'data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700',
        'transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
}

export function LinkItem({ className, ...rest }: LinkItemProps) {
  return (
    <MenuPrimitives.LinkItem
      className={cn(
        'w-full text-left px-4 py-2 text-sm text-gray-700 block',
        'hover:bg-gray-100',
        'focus:outline-none focus:bg-gray-100',
        'data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700',
        'transition-colors',
        'no-underline',
        className,
      )}
      {...rest}
    />
  )
}

export function Portal(props: PortalProps) {
  return <MenuPrimitives.Portal {...props} />
}

const Menu = {
  Root,
  SubRoot,
  Trigger,
  SubTrigger,
  Positioner,
  PositionerArrow,
  Content,
  SubContent,
  ActionItem,
  LinkItem,
  Portal,
}

export default Menu
