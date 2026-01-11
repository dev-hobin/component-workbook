import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Accordion from '../index'

// ============================================
// Test Utilities
// ============================================

function SimpleAccordion({
  defaultValue = [],
  multiple = false,
  collapsible = true,
  disabled = false,
  onValueChange,
}: {
  defaultValue?: string[]
  multiple?: boolean
  collapsible?: boolean
  disabled?: boolean
  onValueChange?: (value: string[]) => void
}) {
  return (
    <Accordion.Root
      defaultValue={defaultValue}
      multiple={multiple}
      collapsible={collapsible}
      disabled={disabled}
      onValueChange={onValueChange}
    >
      <Accordion.Item value="item-1">
        <Accordion.ItemTrigger>Trigger 1</Accordion.ItemTrigger>
        <Accordion.ItemContent>Content 1</Accordion.ItemContent>
      </Accordion.Item>
      <Accordion.Item value="item-2">
        <Accordion.ItemTrigger>Trigger 2</Accordion.ItemTrigger>
        <Accordion.ItemContent>Content 2</Accordion.ItemContent>
      </Accordion.Item>
      <Accordion.Item value="item-3" disabled>
        <Accordion.ItemTrigger>Trigger 3 (Disabled)</Accordion.ItemTrigger>
        <Accordion.ItemContent>Content 3</Accordion.ItemContent>
      </Accordion.Item>
    </Accordion.Root>
  )
}

function ControlledAccordion() {
  const [value, setValue] = useState<string[]>(['item-1'])
  return (
    <>
      <div data-testid="current-value">{JSON.stringify(value)}</div>
      <Accordion.Root value={value} onValueChange={setValue}>
        <Accordion.Item value="item-1">
          <Accordion.ItemTrigger>Trigger 1</Accordion.ItemTrigger>
          <Accordion.ItemContent>Content 1</Accordion.ItemContent>
        </Accordion.Item>
        <Accordion.Item value="item-2">
          <Accordion.ItemTrigger>Trigger 2</Accordion.ItemTrigger>
          <Accordion.ItemContent>Content 2</Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>
    </>
  )
}

// ============================================
// Basic Rendering
// ============================================

describe('Accordion', () => {
  describe('Rendering', () => {
    it('renders all items', () => {
      render(<SimpleAccordion />)

      expect(screen.getByText('Trigger 1')).toBeInTheDocument()
      expect(screen.getByText('Trigger 2')).toBeInTheDocument()
      expect(screen.getByText('Trigger 3 (Disabled)')).toBeInTheDocument()
    })

    it('renders with defaultValue expanded', () => {
      render(<SimpleAccordion defaultValue={['item-1']} />)

      const trigger1 = screen.getByText('Trigger 1')
      expect(trigger1).toHaveAttribute('aria-expanded', 'true')

      const trigger2 = screen.getByText('Trigger 2')
      expect(trigger2).toHaveAttribute('aria-expanded', 'false')
    })

    it('renders data-part attributes on all components', () => {
      render(<SimpleAccordion defaultValue={['item-1']} />)

      expect(document.querySelector('[data-part="root"]')).toBeInTheDocument()
      expect(document.querySelector('[data-part="item"]')).toBeInTheDocument()
      expect(
        document.querySelector('[data-part="trigger"]'),
      ).toBeInTheDocument()
      expect(
        document.querySelector('[data-part="content"]'),
      ).toBeInTheDocument()
    })

    it('renders data-state attributes correctly', () => {
      render(<SimpleAccordion defaultValue={['item-1']} />)

      const trigger1 = screen.getByText('Trigger 1')
      expect(trigger1).toHaveAttribute('data-state', 'open')

      const trigger2 = screen.getByText('Trigger 2')
      expect(trigger2).toHaveAttribute('data-state', 'closed')
    })
  })

  // ============================================
  // Click Interactions
  // ============================================

  describe('Click Interactions', () => {
    it('expands item on click', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger1 = screen.getByText('Trigger 1')
      expect(trigger1).toHaveAttribute('aria-expanded', 'false')

      await user.click(trigger1)
      expect(trigger1).toHaveAttribute('aria-expanded', 'true')
    })

    it('collapses item on click when collapsible=true', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion defaultValue={['item-1']} collapsible={true} />)

      const trigger1 = screen.getByText('Trigger 1')
      expect(trigger1).toHaveAttribute('aria-expanded', 'true')

      await user.click(trigger1)
      expect(trigger1).toHaveAttribute('aria-expanded', 'false')
    })

    it('does not collapse last item when collapsible=false', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion defaultValue={['item-1']} collapsible={false} />)

      const trigger1 = screen.getByText('Trigger 1')
      expect(trigger1).toHaveAttribute('aria-expanded', 'true')

      await user.click(trigger1)
      // Should still be expanded
      expect(trigger1).toHaveAttribute('aria-expanded', 'true')
    })

    it('closes other items when multiple=false', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion defaultValue={['item-1']} multiple={false} />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      expect(trigger1).toHaveAttribute('aria-expanded', 'true')
      expect(trigger2).toHaveAttribute('aria-expanded', 'false')

      await user.click(trigger2)

      expect(trigger1).toHaveAttribute('aria-expanded', 'false')
      expect(trigger2).toHaveAttribute('aria-expanded', 'true')
    })

    it('keeps other items open when multiple=true', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion defaultValue={['item-1']} multiple={true} />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      expect(trigger1).toHaveAttribute('aria-expanded', 'true')

      await user.click(trigger2)

      expect(trigger1).toHaveAttribute('aria-expanded', 'true')
      expect(trigger2).toHaveAttribute('aria-expanded', 'true')
    })

    it('does not toggle disabled item', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger3 = screen.getByText('Trigger 3 (Disabled)')
      expect(trigger3).toHaveAttribute('aria-expanded', 'false')
      expect(trigger3).toBeDisabled()

      await user.click(trigger3)
      expect(trigger3).toHaveAttribute('aria-expanded', 'false')
    })

    it('does not toggle any item when root is disabled', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion disabled={true} />)

      const trigger1 = screen.getByText('Trigger 1')
      expect(trigger1).toBeDisabled()

      await user.click(trigger1)
      expect(trigger1).toHaveAttribute('aria-expanded', 'false')
    })
  })

  // ============================================
  // Keyboard Interactions
  // ============================================

  describe('Keyboard Interactions', () => {
    it('toggles item with Enter key', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger1 = screen.getByText('Trigger 1')
      trigger1.focus()

      await user.keyboard('{Enter}')
      expect(trigger1).toHaveAttribute('aria-expanded', 'true')

      await user.keyboard('{Enter}')
      expect(trigger1).toHaveAttribute('aria-expanded', 'false')
    })

    it('toggles item with Space key', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger1 = screen.getByText('Trigger 1')
      trigger1.focus()

      await user.keyboard(' ')
      expect(trigger1).toHaveAttribute('aria-expanded', 'true')
    })

    it('navigates with ArrowDown', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger1.focus()
      expect(document.activeElement).toBe(trigger1)

      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(trigger2)
    })

    it('navigates with ArrowUp', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger2.focus()
      expect(document.activeElement).toBe(trigger2)

      await user.keyboard('{ArrowUp}')
      expect(document.activeElement).toBe(trigger1)
    })

    it('skips disabled items during navigation', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger2 = screen.getByText('Trigger 2')
      const trigger1 = screen.getByText('Trigger 1')

      trigger2.focus()

      // ArrowDown should skip disabled item-3 and wrap to item-1
      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(trigger1)
    })

    it('navigates to first item with Home', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger2.focus()

      await user.keyboard('{Home}')
      expect(document.activeElement).toBe(trigger1)
    })

    it('navigates to last enabled item with End', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger1.focus()

      // End should go to last enabled item (item-2, since item-3 is disabled)
      await user.keyboard('{End}')
      expect(document.activeElement).toBe(trigger2)
    })

    it('wraps focus from last to first', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger2.focus()

      // ArrowDown from item-2 should skip disabled item-3 and wrap to item-1
      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(trigger1)
    })

    it('wraps focus from first to last', async () => {
      const user = userEvent.setup()
      render(<SimpleAccordion />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger1.focus()

      // ArrowUp from item-1 should wrap to item-2 (last enabled)
      await user.keyboard('{ArrowUp}')
      expect(document.activeElement).toBe(trigger2)
    })
  })

  // ============================================
  // Controlled Mode
  // ============================================

  describe('Controlled Mode', () => {
    it('works in controlled mode', async () => {
      const user = userEvent.setup()
      render(<ControlledAccordion />)

      const currentValue = screen.getByTestId('current-value')
      expect(currentValue).toHaveTextContent('["item-1"]')

      const trigger2 = screen.getByText('Trigger 2')
      await user.click(trigger2)

      expect(currentValue).toHaveTextContent('["item-2"]')
    })

    it('calls onValueChange callback', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      render(<SimpleAccordion onValueChange={onValueChange} />)

      const trigger1 = screen.getByText('Trigger 1')
      await user.click(trigger1)

      expect(onValueChange).toHaveBeenCalledWith(['item-1'])
    })
  })

  // ============================================
  // ARIA Attributes
  // ============================================

  describe('ARIA Attributes', () => {
    it('has correct aria-expanded', () => {
      render(<SimpleAccordion defaultValue={['item-1']} />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      expect(trigger1).toHaveAttribute('aria-expanded', 'true')
      expect(trigger2).toHaveAttribute('aria-expanded', 'false')
    })

    it('has aria-controls linking to content', () => {
      render(<SimpleAccordion defaultValue={['item-1']} />)

      const trigger1 = screen.getByText('Trigger 1')
      const ariaControls = trigger1.getAttribute('aria-controls')

      expect(ariaControls).toBeTruthy()
      expect(document.getElementById(ariaControls!)).toBeInTheDocument()
    })

    it('content has aria-labelledby linking to trigger', () => {
      render(<SimpleAccordion defaultValue={['item-1']} />)

      const trigger1 = screen.getByText('Trigger 1')
      const triggerId = trigger1.getAttribute('id')

      const content = screen.getByText('Content 1').closest('[role="region"]')
      expect(content).toHaveAttribute('aria-labelledby', triggerId)
    })

    it('content has role="region"', () => {
      render(<SimpleAccordion defaultValue={['item-1']} />)

      const content = screen.getByText('Content 1').closest('[role="region"]')
      expect(content).toBeInTheDocument()
    })

    it('disabled trigger has aria-disabled', () => {
      render(<SimpleAccordion />)

      const trigger3 = screen.getByText('Trigger 3 (Disabled)')
      expect(trigger3).toHaveAttribute('aria-disabled', 'true')
    })
  })

  // ============================================
  // ItemIndicator
  // ============================================

  describe('ItemIndicator', () => {
    it('renders ItemIndicator with correct data-state', () => {
      render(
        <Accordion.Root defaultValue={['item-1']}>
          <Accordion.Item value="item-1">
            <Accordion.ItemTrigger>
              <Accordion.ItemIndicator data-testid="indicator-1">
                Icon
              </Accordion.ItemIndicator>
              Trigger 1
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>Content 1</Accordion.ItemContent>
          </Accordion.Item>
        </Accordion.Root>,
      )

      const indicator = screen.getByTestId('indicator-1')
      expect(indicator).toHaveAttribute('data-state', 'open')
      expect(indicator).toHaveAttribute('data-part', 'indicator')
      expect(indicator).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
