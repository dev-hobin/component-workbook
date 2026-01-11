import TreePrimitives, {
  type RootProps,
  type ItemProps,
  type ItemLabelProps,
  type ItemGroupProps,
  type ItemIndicatorProps,
  useItemContext,
} from '.'
import { cn } from '../../utils/cn'

export function Root({ className, ...rest }: RootProps) {
  return (
    <TreePrimitives.Root
      className={cn(
        'bg-white border border-gray-200 rounded-md',
        'py-2 min-w-[200px]',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className,
      )}
      {...rest}
    />
  )
}

export function Item({ className, ...rest }: ItemProps) {
  return (
    <TreePrimitives.Item
      className={cn('group', className)}
      {...rest}
    />
  )
}

export function ItemLabel({ className, children, ...rest }: ItemLabelProps) {
  return (
    <TreePrimitives.ItemLabel
      className={cn(
        'flex items-center gap-2 py-1.5 text-sm text-gray-700',
        'cursor-default select-none',
        'focus:outline-none',
        'data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700',
        'data-[selected]:font-medium',
        'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
        'transition-colors',
        // Indentation based on depth (uses --tree-depth CSS variable from Item)
        'pl-[calc(0.75rem+var(--tree-depth,0)*1rem)]',
        className,
      )}
      {...rest}
    >
      <ItemIndicator />
      {children}
    </TreePrimitives.ItemLabel>
  )
}

function ItemGroupImpl({ className, children, ...rest }: ItemGroupProps) {
  return (
    <TreePrimitives.ItemGroup
      className={cn(
        'overflow-hidden',
        // Height animation using grid
        'grid transition-[grid-template-rows] duration-200 ease-out',
        'data-[state=open]:grid-rows-[1fr]',
        'data-[state=closed]:grid-rows-[0fr]',
        // Starting animation
        'data-[transition=starting]:grid-rows-[0fr]',
        // Idle state
        'data-[transition=idle]:grid-rows-[1fr]',
        // Ending animation
        'data-[transition=ending]:grid-rows-[0fr]',
        className,
      )}
      {...rest}
    >
      <div className="min-h-0">{children}</div>
    </TreePrimitives.ItemGroup>
  )
}
ItemGroupImpl.displayName = 'TreeItemGroup'
export const ItemGroup = ItemGroupImpl

export function ItemIndicator({ className, ...rest }: ItemIndicatorProps) {
  const { hasChildren, isExpanded } = useItemContext()

  // Leaf node: 동일한 크기의 빈 spacer 렌더링 (정렬 유지)
  if (!hasChildren) {
    return <div className={cn('w-4 h-4 flex-shrink-0', className)} {...rest} />
  }

  return (
    <TreePrimitives.ItemIndicator
      className={cn(
        'w-4 h-4 flex-shrink-0',
        'transition-transform duration-200',
        isExpanded && 'rotate-90',
        className,
      )}
      {...rest}
    >
      <svg
        className="w-full h-full"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </TreePrimitives.ItemIndicator>
  )
}

// File icon component for leaf nodes
export function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-4 h-4 flex-shrink-0 text-gray-400', className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  )
}

// Folder icon component for branch nodes
export function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-4 h-4 flex-shrink-0 text-yellow-500', className)}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
    </svg>
  )
}

const Tree = {
  Root,
  Item,
  ItemLabel,
  ItemGroup,
  ItemIndicator,
  FileIcon,
  FolderIcon,
}

export default Tree
