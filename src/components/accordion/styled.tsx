import AccordionPrimitives, {
  type RootProps,
  type ItemProps,
  type TriggerProps,
  type PanelProps,
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

export function Trigger({ className, ...rest }: TriggerProps) {
  return (
    <AccordionPrimitives.Trigger
      className={cn(
        'w-full text-left px-6 py-4 bg-white border border-gray-200 rounded-lg ease-in-out hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 data-[expanded=true]:bg-gray-50 data-[expanded=true]:border-gray-300 data-[expanded=true]:rounded-b-none data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
}

export function Panel({ className, ...rest }: PanelProps) {
  return (
    <AccordionPrimitives.Panel
      className={cn(
        'px-6 py-4 border-x border-b border-gray-200 rounded-b-lg bg-white text-gray-700 leading-relaxed',
        className,
      )}
      {...rest}
    />
  )
}

const Accordion = {
  Root,
  Item,
  Trigger,
  Panel,
}

export default Accordion
