import PaginationPrimitives, {
  type RootProps,
  type PreviousTriggerProps,
  type NextTriggerProps,
  type PagesProps,
} from '.'
import { cn } from '../../utils/cn'

export function Root({ className, ...rest }: RootProps) {
  return (
    <PaginationPrimitives.Root
      className={cn('flex items-center justify-center gap-2', className)}
      {...rest}
    />
  )
}

export function PreviousTrigger({ className, ...rest }: PreviousTriggerProps) {
  return (
    <PaginationPrimitives.PreviousTrigger
      className={cn(
        'px-3 py-2 text-sm font-medium border border-gray-300 rounded-md',
        'hover:bg-gray-50 hover:border-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300',
        className,
      )}
      {...rest}
    />
  )
}

export function NextTrigger({ className, ...rest }: NextTriggerProps) {
  return (
    <PaginationPrimitives.NextTrigger
      className={cn(
        'px-3 py-2 text-sm font-medium border border-gray-300 rounded-md',
        'hover:bg-gray-50 hover:border-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300',
        className,
      )}
      {...rest}
    />
  )
}

export function Pages({ className, action, ...rest }: PagesProps) {
  return (
    <PaginationPrimitives.Pages
      className={cn(
        'flex items-center gap-1 list-none p-0 m-0',
        // 페이지 버튼 스타일
        '[&_button]:min-w-10 [&_button]:h-10',
        '[&_button]:flex [&_button]:items-center [&_button]:justify-center',
        '[&_button]:px-2 [&_button]:text-sm [&_button]:font-medium',
        '[&_button]:border [&_button]:border-transparent',
        '[&_button]:rounded-md [&_button]:transition-colors',
        '[&_button]:bg-white [&_button]:cursor-pointer',
        '[&_button:hover:not([data-current])]:bg-gray-50',
        '[&_button:hover:not([data-current])]:border-gray-300',
        '[&_button:focus]:outline-none [&_button:focus]:ring-2',
        '[&_button:focus]:ring-blue-500 [&_button:focus]:ring-offset-2',
        '[&_button[data-current]]:bg-blue-600',
        '[&_button[data-current]]:text-white',
        '[&_button[data-current]]:border-blue-600',
        '[&_button[data-current]:hover]:bg-blue-700',
        '[&_button[data-current]:hover]:border-blue-700',
        // 링크 스타일
        '[&_a]:min-w-10 [&_a]:h-10',
        '[&_a]:flex [&_a]:items-center [&_a]:justify-center',
        '[&_a]:px-2 [&_a]:text-sm [&_a]:font-medium',
        '[&_a]:border [&_a]:border-transparent',
        '[&_a]:rounded-md [&_a]:transition-colors',
        '[&_a]:bg-white [&_a]:no-underline',
        '[&_a:hover:not([data-current])]:bg-gray-50',
        '[&_a:hover:not([data-current])]:border-gray-300',
        '[&_a:focus]:outline-none [&_a:focus]:ring-2',
        '[&_a:focus]:ring-blue-500 [&_a:focus]:ring-offset-2',
        '[&_a[data-current]]:bg-blue-600',
        '[&_a[data-current]]:text-white',
        '[&_a[data-current]]:border-blue-600',
        '[&_a[data-current]:hover]:bg-blue-700',
        '[&_a[data-current]:hover]:border-blue-700',
        // ellipsis 스타일
        '[&_[data-type=ellipsis]]:px-2 [&_[data-type=ellipsis]]:text-gray-500',
        className,
      )}
      ellipsis={<span className="px-2 text-gray-500">...</span>}
      action={action}
      {...rest}
    />
  )
}

const Pagination = {
  Root,
  PreviousTrigger,
  NextTrigger,
  Pages,
}

export default Pagination
