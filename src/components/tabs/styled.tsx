import TabsPrimitives, {
  type RootProps,
  type ListProps,
  type TriggerProps,
  type ContentProps,
  type IndicatorProps,
} from '.'
import { cn } from '../../utils/cn'

export function Root({ className, ...rest }: RootProps) {
  return <TabsPrimitives.Root className={cn('w-full', className)} {...rest} />
}

export function List({ className, ...rest }: ListProps) {
  return (
    <TabsPrimitives.List
      className={cn(
        'flex border-b border-gray-200 data-[orientation=vertical]:flex-col data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-r',
        className,
      )}
      {...rest}
    />
  )
}

export function Trigger({ className, ...rest }: TriggerProps) {
  return (
    <TabsPrimitives.Trigger
      className={cn(
        'px-4 py-2 text-sm font-medium border-b-2 border-transparent transition-colors',
        'hover:text-gray-700 hover:border-gray-300',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'data-[state=active]:text-blue-600 data-[state=active]:border-blue-600',
        'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
}

export function Content({ className, ...rest }: ContentProps) {
  return (
    <TabsPrimitives.Content
      className={cn(
        'mt-4 p-4 text-gray-700 leading-relaxed',
        'data-[state=inactive]:hidden',
        className,
      )}
      {...rest}
    />
  )
}

export function Indicator({ className, ...rest }: IndicatorProps) {
  return (
    <TabsPrimitives.Indicator
      className={cn(
        'bg-blue-600 transition-all duration-200 ease-out',
        'data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:bottom-0',
        'data-[orientation=vertical]:w-0.5 data-[orientation=vertical]:left-0',
        className,
      )}
      {...rest}
    />
  )
}

const Tabs = {
  Root,
  List,
  Trigger,
  Content,
  Indicator,
}

export default Tabs
