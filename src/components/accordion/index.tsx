import { useControllableState } from '@radix-ui/react-use-controllable-state'
import {
  createContext,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
} from 'react'
import { cn } from '../../utils/cn'

const AccordionContext = createContext<
  | {
      values: string[]
      expandItem: (value: string) => void
      collapseItem: (value: string) => void
      isDisabled: boolean
      animationDuration: `${number}ms`
    }
  | undefined
>(undefined)

export type RootProps = {
  children: React.ReactNode
  value?: string[]
  onValueChange?: (value: string[]) => void
  defaultValue?: string[]
  multiple?: boolean
  collapsible?: boolean
  disabled?: boolean
  animationDuration?: `${number}ms`
} & React.ComponentPropsWithoutRef<'div'>

export function Root({
  value: controlledValue,
  onValueChange,
  defaultValue: controlledDefaultValue,
  multiple = false,
  collapsible = true,
  children,
  disabled = false,
  animationDuration = '300ms',
  ...rest
}: RootProps) {
  const [values, setValues] = useControllableState({
    prop: controlledValue,
    onChange: onValueChange,
    defaultProp: controlledDefaultValue ?? [],
  })

  const expandItem = (value: string) => {
    if (disabled) {
      return
    }
    if (values.includes(value)) {
      return
    }
    if (multiple) {
      setValues((prev) => [...prev, value])
    } else {
      setValues([value])
    }
  }

  const collapseItem = (value: string) => {
    if (disabled) {
      return
    }
    if (!values.includes(value)) {
      return
    }
    if (!collapsible && !multiple) {
      return
    }
    setValues((prev) => prev.filter((v) => v !== value))
  }

  const dataProps = {
    'data-expanded': values.length > 0 ? 'true' : 'false',
    'data-disabled': disabled ? 'true' : 'false',
  }

  return (
    <AccordionContext.Provider
      value={{
        values,
        expandItem,
        collapseItem,
        isDisabled: disabled,
        animationDuration,
      }}
    >
      <div {...dataProps} {...rest}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

function useAccordionContext() {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error('useAccordionContext must be used within a Accordion.Root')
  }
  return context
}

const AccordionItemContext = createContext<
  | {
      value: string
      isExpanded: boolean
      triggerId: string
      panelId: string
      isDisabled: boolean
    }
  | undefined
>(undefined)

export type ItemProps = {
  value: string
  triggerId?: string
  panelId?: string
  disabled?: boolean
} & ComponentPropsWithoutRef<'section'>
export function Item({
  children,
  value,
  triggerId,
  panelId,
  disabled = false,
  ...rest
}: ItemProps) {
  const { values, isDisabled: isRootDisabled } = useAccordionContext()

  const itemId = useId()

  const isExpanded = values.includes(value)
  const isDisabled = isRootDisabled || disabled

  return (
    <AccordionItemContext.Provider
      value={{
        value,
        isExpanded,
        triggerId: triggerId ?? `${itemId}-${value}-trigger`,
        panelId: panelId ?? `${itemId}-${value}-panel`,
        isDisabled,
      }}
    >
      <section data-disabled={isDisabled ? 'true' : 'false'} {...rest}>
        {children}
      </section>
    </AccordionItemContext.Provider>
  )
}

function useAccordionItemContext() {
  const context = useContext(AccordionItemContext)
  if (!context) {
    throw new Error(
      'useAccordionItemContext must be used within a Accordion.Item',
    )
  }
  return context
}

export type TriggerProps = {
  children: React.ReactNode
} & ComponentPropsWithoutRef<'button'>
export function Trigger({
  children,
  onClick,
  className,
  style,
  ...rest
}: TriggerProps) {
  const { expandItem, collapseItem, animationDuration } = useAccordionContext()
  const { value, isExpanded, triggerId, panelId, isDisabled } =
    useAccordionItemContext()

  const dataProps = {
    'data-expanded': isExpanded ? 'true' : 'false',
    'data-disabled': isDisabled ? 'true' : 'false',
  }

  return (
    <h3 {...dataProps}>
      <button
        id={triggerId}
        disabled={isDisabled}
        onClick={(event) => {
          if (isExpanded) {
            collapseItem(value)
          } else {
            expandItem(value)
          }
          onClick?.(event)
        }}
        aria-expanded={isExpanded ? 'true' : 'false'}
        aria-controls={panelId}
        className={cn('transition-all', className)}
        style={
          {
            ...style,
            '--tw-duration': animationDuration,
          } as React.CSSProperties
        }
        {...dataProps}
        {...rest}
      >
        {children}
      </button>
    </h3>
  )
}

export type PanelProps = {
  children: React.ReactNode
} & ComponentPropsWithoutRef<'div'>
export function Panel({ children, className, ...rest }: PanelProps) {
  const { animationDuration } = useAccordionContext()
  const { isExpanded, triggerId, panelId, isDisabled } =
    useAccordionItemContext()

  const dataProps = {
    'data-expanded': isExpanded ? 'true' : 'false',
    'data-disabled': isDisabled ? 'true' : 'false',
  }

  return (
    <div
      className={cn(
        'grid overflow-hidden transition-[grid-template-rows] ease-in-out',
        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
      style={
        {
          '--tw-duration': animationDuration,
        } as React.CSSProperties
      }
    >
      <div className="overflow-hidden">
        <div
          id={panelId}
          className={className}
          aria-labelledby={triggerId}
          {...dataProps}
          {...rest}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

const Accordion = {
  Root,
  Item,
  Trigger,
  Panel,
}

export default Accordion
