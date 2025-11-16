import MenuPrimitives, {
  type RootProps,
  type TriggerProps,
  type PositionerProps,
  type PositionerArrowProps,
  type ContentProps,
  type ActionItemProps,
  type LinkItemProps,
  type PortalProps,
} from '.'
import { cn } from '../../utils/cn'

export function Root(props: RootProps) {
  return <MenuPrimitives.Root {...props} />
}

export function Trigger({ className, ...rest }: TriggerProps) {
  return (
    <MenuPrimitives.Trigger
      className={cn(
        'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors',
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

export function Content({ className, ...rest }: ContentProps) {
  return (
    <MenuPrimitives.Content
      className={cn(
        'bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px]',
        className,
      )}
      {...rest}
    />
  )
}

export function PositionerArrow({ className, ...rest }: PositionerArrowProps) {
  return (
    <MenuPrimitives.PositionerArrow
      className={cn(
        'bg-white border border-gray-200 border-b-white border-r-white',
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
        'w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors',
        'data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700',
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
        'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors no-underline',
        'data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700',
        className,
      )}
      {...rest}
    />
  )
}

export function Portal({ ...rest }: PortalProps) {
  return <MenuPrimitives.Portal {...rest} />
}

const Menu = {
  Root,
  Trigger,
  Positioner,
  PositionerArrow,
  Content,
  ActionItem,
  LinkItem,
  Portal,
}

export default Menu
