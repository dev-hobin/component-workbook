import AccordionPrimitives, {
  type RootProps,
  type ItemProps,
  type ItemTriggerProps,
  type ItemContentProps,
  type ItemIndicatorProps,
} from '.'
import { cn } from '../../utils/cn'

export function Root({ className, ...rest }: RootProps) {
  return (
    <AccordionPrimitives.Root
      className={cn('space-y-2', className)}
      {...rest}
    />
  )
}

export function Item({ className, ...rest }: ItemProps) {
  return <AccordionPrimitives.Item className={cn(className)} {...rest} />
}

export function ItemTrigger({ className, ...rest }: ItemTriggerProps) {
  return (
    <AccordionPrimitives.ItemTrigger
      className={cn(
        'w-full text-left px-6 py-4 bg-white border border-gray-200 rounded-lg ease-in-out hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 data-[state=open]:bg-gray-50 data-[state=open]:border-gray-300 data-[state=open]:rounded-b-none data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
}

export function ItemContent({ className, ...rest }: ItemContentProps) {
  return (
    <AccordionPrimitives.ItemContent
      className={cn(
        'px-6 py-4 border-x border-b border-gray-200 rounded-b-lg bg-white text-gray-700 leading-relaxed',
        className,
      )}
      {...rest}
    />
  )
}

export function ItemIndicator({ className, ...rest }: ItemIndicatorProps) {
  return (
    <AccordionPrimitives.ItemIndicator
      className={cn(
        'transition-transform duration-200 data-[state=open]:rotate-180',
        className,
      )}
      {...rest}
    />
  )
}

const Accordion = {
  Root,
  Item,
  ItemTrigger,
  ItemContent,
  ItemIndicator,
}

export default Accordion
