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

export function Pages({
  className,
  TruncationComponent,
  action,
  ...rest
}: PagesProps) {
  return (
    <PaginationPrimitives.Pages
      className={cn(
        'flex items-center gap-1 list-none p-0 m-0',
        // 페이지 아이템 공통 스타일
        '**:data-page-item:min-w-10 **:data-page-item:h-10',
        '**:data-page-item:flex **:data-page-item:items-center **:data-page-item:justify-center',
        '**:data-page-item:px-2 **:data-page-item:text-sm **:data-page-item:font-medium',
        '**:data-page-item:border **:data-page-item:border-transparent',
        '**:data-page-item:rounded-md **:data-page-item:transition-colors',
        '**:data-page-item:bg-white',
        "[&_[data-page-item]:hover:not([data-current-page='true'])]:bg-gray-50",
        "[&_[data-page-item]:hover:not([data-current-page='true'])]:border-gray-300",
        '[&_[data-page-item]:focus]:outline-none [&_[data-page-item]:focus]:ring-2',
        '[&_[data-page-item]:focus]:ring-blue-500 [&_[data-page-item]:focus]:ring-offset-2',
        "[&_[data-page-item][data-current-page='true']]:bg-blue-600",
        "[&_[data-page-item][data-current-page='true']]:text-white",
        "[&_[data-page-item][data-current-page='true']]:border-blue-600",
        "[&_[data-page-item][data-current-page='true']:hover]:bg-blue-700",
        "[&_[data-page-item][data-current-page='true']:hover]:border-blue-700",
        // 버튼 전용
        "**:data-[page-item='button']:cursor-pointer",
        // 링크 전용
        "**:data-[page-item='link']:no-underline",
        // Truncation
        "**:data-[previous-truncated='true']:flex **:data-[previous-truncated='true']:items-center",
        "**:data-[previous-truncated='true']:justify-center **:data-[previous-truncated='true']:px-2",
        "**:data-[previous-truncated='true']:text-gray-500",
        className,
      )}
      TruncationComponent={
        TruncationComponent ?? <span className="px-2 text-gray-500">...</span>
      }
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
