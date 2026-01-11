import MenuPrimitives, {
  type RootProps,
  type TriggerProps,
  type PortalProps,
  type ContentProps,
  type ItemProps,
  type SeparatorProps,
  type SubProps,
  type SubTriggerProps,
  type SubContentProps,
} from '.'
import { cn } from '../../utils/cn'

export function Root(props: RootProps) {
  return <MenuPrimitives.Root {...props} />
}

export function Trigger({ className, ...rest }: TriggerProps) {
  return (
    <MenuPrimitives.Trigger
      className={cn(
        'px-4 py-2 bg-white border border-gray-200 rounded-md',
        'hover:bg-gray-50 hover:border-gray-300',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'data-[state=open]:bg-gray-50 data-[state=open]:border-gray-300',
        'transition-colors',
        className,
      )}
      {...rest}
    />
  )
}

export function Portal(props: PortalProps) {
  return <MenuPrimitives.Portal {...props} />
}

export function Content({ className, ...rest }: ContentProps) {
  return (
    <MenuPrimitives.Content
      className={cn(
        'bg-white border border-gray-200 rounded-md shadow-lg',
        'py-1 min-w-[160px] flex flex-col',
        'focus:outline-none',
        'z-50',
        'transition-all duration-200 ease-out',
        // Enter animation (starting) - 위에서 아래로 나타남
        'data-[transition=starting]:opacity-0',
        'data-[transition=starting]:scale-95',
        'data-[transition=starting]:translate-y-[-8px]',
        // Idle state (fully visible)
        'data-[transition=idle]:opacity-100',
        'data-[transition=idle]:scale-100',
        'data-[transition=idle]:translate-y-0',
        // Exit animation (ending) - 위로 사라짐
        'data-[transition=ending]:opacity-0',
        'data-[transition=ending]:scale-95',
        'data-[transition=ending]:translate-y-[-8px]',
        'data-[transition=ending]:duration-150',
        'data-[transition=ending]:ease-in',
        className,
      )}
      {...rest}
    />
  )
}

export function Item({ className, ...rest }: ItemProps) {
  return (
    <MenuPrimitives.Item
      className={cn(
        'w-full text-left px-3 py-2 text-sm text-gray-700',
        'cursor-default select-none',
        'focus:outline-none',
        'data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700',
        'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
        'transition-colors',
        className,
      )}
      {...rest}
    />
  )
}

export function Separator({ className, ...rest }: SeparatorProps) {
  return (
    <MenuPrimitives.Separator
      className={cn('h-px bg-gray-200 my-1', className)}
      {...rest}
    />
  )
}

export function Sub(props: SubProps) {
  return <MenuPrimitives.Sub {...props} />
}

export function SubTrigger({ className, children, ...rest }: SubTriggerProps) {
  return (
    <MenuPrimitives.SubTrigger
      className={cn(
        'w-full text-left px-3 py-2 text-sm text-gray-700',
        'cursor-default select-none',
        'focus:outline-none',
        'data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700',
        'data-[state=open]:bg-blue-50',
        'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
        'flex items-center justify-between',
        'transition-colors',
        className,
      )}
      {...rest}
    >
      {children}
      <svg
        className="w-4 h-4 ml-2"
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
    </MenuPrimitives.SubTrigger>
  )
}

export function SubContent({ className, ...rest }: SubContentProps) {
  return (
    <MenuPrimitives.SubContent
      className={cn(
        'bg-white border border-gray-200 rounded-md shadow-lg',
        'py-1 min-w-[160px] flex flex-col',
        'focus:outline-none',
        'z-50',
        'transition-all duration-200 ease-out',
        // Enter animation (starting) - 왼쪽에서 오른쪽으로 나타남
        'data-[transition=starting]:opacity-0',
        'data-[transition=starting]:scale-95',
        'data-[transition=starting]:translate-x-[-8px]',
        // Idle state (fully visible)
        'data-[transition=idle]:opacity-100',
        'data-[transition=idle]:scale-100',
        'data-[transition=idle]:translate-x-0',
        // Exit animation (ending) - 왼쪽으로 사라짐
        'data-[transition=ending]:opacity-0',
        'data-[transition=ending]:scale-95',
        'data-[transition=ending]:translate-x-[-8px]',
        'data-[transition=ending]:duration-150',
        'data-[transition=ending]:ease-in',
        className,
      )}
      {...rest}
    />
  )
}

const Menu = {
  Root,
  Trigger,
  Portal,
  Content,
  Item,
  Separator,
  Sub,
  SubTrigger,
  SubContent,
}

export default Menu
