import TabsPrimitives, {
  type RootProps,
  type ListProps,
  type TabProps,
  type PanelProps,
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

export function Tab({ className, ...rest }: TabProps) {
  return (
    <TabsPrimitives.Tab
      className={cn(
        'px-4 py-2 text-sm font-medium border-b-2 border-transparent transition-colors',
        'hover:text-gray-700 hover:border-gray-300',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'data-[active=true]:text-blue-600 data-[active=true]:border-blue-600',
        'data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
}

export function Panel({ className, ...rest }: PanelProps) {
  return (
    <TabsPrimitives.Panel
      className={cn('mt-4 p-4 text-gray-700 leading-relaxed', className)}
      {...rest}
    />
  )
}

const Tabs = {
  Root,
  List,
  Tab,
  Panel,
}

export default Tabs
