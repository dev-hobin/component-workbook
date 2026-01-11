import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tabs from '../index'

// ============================================
// Test Utilities
// ============================================

function SimpleTabs({
  defaultValue = 'tab-1',
  orientation = 'horizontal',
  activationMode = 'automatic',
  disabled = false,
  loop = true,
  onValueChange,
}: {
  defaultValue?: string
  orientation?: 'horizontal' | 'vertical'
  activationMode?: 'automatic' | 'manual'
  disabled?: boolean
  loop?: boolean
  onValueChange?: (value: string) => void
}) {
  return (
    <Tabs.Root
      defaultValue={defaultValue}
      orientation={orientation}
      activationMode={activationMode}
      disabled={disabled}
      loop={loop}
      onValueChange={onValueChange}
    >
      <Tabs.List>
        <Tabs.Trigger value="tab-1">Trigger 1</Tabs.Trigger>
        <Tabs.Trigger value="tab-2">Trigger 2</Tabs.Trigger>
        <Tabs.Trigger value="tab-3" disabled>
          Trigger 3 (Disabled)
        </Tabs.Trigger>
        <Tabs.Trigger value="tab-4">Trigger 4</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="tab-1">Content 1</Tabs.Content>
      <Tabs.Content value="tab-2">Content 2</Tabs.Content>
      <Tabs.Content value="tab-3">Content 3</Tabs.Content>
      <Tabs.Content value="tab-4">Content 4</Tabs.Content>
    </Tabs.Root>
  )
}

function ControlledTabs() {
  const [value, setValue] = useState('tab-1')
  return (
    <>
      <div data-testid="current-value">{value}</div>
      <Tabs.Root value={value} onValueChange={setValue}>
        <Tabs.List>
          <Tabs.Trigger value="tab-1">Trigger 1</Tabs.Trigger>
          <Tabs.Trigger value="tab-2">Trigger 2</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab-1">Content 1</Tabs.Content>
        <Tabs.Content value="tab-2">Content 2</Tabs.Content>
      </Tabs.Root>
    </>
  )
}

// ============================================
// Basic Rendering
// ============================================

describe('Tabs', () => {
  describe('Rendering', () => {
    it('renders all triggers', () => {
      render(<SimpleTabs />)

      expect(screen.getByText('Trigger 1')).toBeInTheDocument()
      expect(screen.getByText('Trigger 2')).toBeInTheDocument()
      expect(screen.getByText('Trigger 3 (Disabled)')).toBeInTheDocument()
      expect(screen.getByText('Trigger 4')).toBeInTheDocument()
    })

    it('renders with defaultValue selected', () => {
      render(<SimpleTabs defaultValue="tab-2" />)

      const trigger1 = screen.getByText('Trigger 1')
      expect(trigger1).toHaveAttribute('aria-selected', 'false')

      const trigger2 = screen.getByText('Trigger 2')
      expect(trigger2).toHaveAttribute('aria-selected', 'true')
    })

    it('renders data-part attributes on all components', () => {
      render(<SimpleTabs />)

      expect(document.querySelector('[data-part="root"]')).toBeInTheDocument()
      expect(document.querySelector('[data-part="list"]')).toBeInTheDocument()
      expect(document.querySelector('[data-part="trigger"]')).toBeInTheDocument()
      expect(document.querySelector('[data-part="content"]')).toBeInTheDocument()
    })

    it('renders data-state attributes correctly', () => {
      render(<SimpleTabs defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      expect(trigger1).toHaveAttribute('data-state', 'active')

      const trigger2 = screen.getByText('Trigger 2')
      expect(trigger2).toHaveAttribute('data-state', 'inactive')
    })

    it('renders data-orientation on root and list', () => {
      render(<SimpleTabs orientation="vertical" />)

      const root = document.querySelector('[data-part="root"]')
      expect(root).toHaveAttribute('data-orientation', 'vertical')

      const list = screen.getByRole('tablist')
      expect(list).toHaveAttribute('data-orientation', 'vertical')
    })
  })

  // ============================================
  // Click Interactions
  // ============================================

  describe('Click Interactions', () => {
    it('switches tab on click', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      expect(trigger1).toHaveAttribute('aria-selected', 'true')
      expect(trigger2).toHaveAttribute('aria-selected', 'false')

      await user.click(trigger2)

      expect(trigger1).toHaveAttribute('aria-selected', 'false')
      expect(trigger2).toHaveAttribute('aria-selected', 'true')
    })

    it('does not activate disabled tab', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger3 = screen.getByText('Trigger 3 (Disabled)')

      expect(trigger3).toBeDisabled()

      await user.click(trigger3)

      expect(trigger1).toHaveAttribute('aria-selected', 'true')
      expect(trigger3).toHaveAttribute('aria-selected', 'false')
    })

    it('does not activate any tab when root is disabled', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs disabled={true} />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      expect(trigger1).toBeDisabled()
      expect(trigger2).toBeDisabled()

      await user.click(trigger2)
      expect(trigger1).toHaveAttribute('aria-selected', 'true')
    })
  })

  // ============================================
  // Keyboard Interactions - Horizontal
  // ============================================

  describe('Keyboard Interactions (Horizontal)', () => {
    it('navigates with ArrowRight', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs orientation="horizontal" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger1.focus()
      expect(document.activeElement).toBe(trigger1)

      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(trigger2)
    })

    it('navigates with ArrowLeft', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs orientation="horizontal" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger2.focus()
      expect(document.activeElement).toBe(trigger2)

      await user.keyboard('{ArrowLeft}')
      expect(document.activeElement).toBe(trigger1)
    })

    it('skips disabled tabs during navigation', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs orientation="horizontal" />)

      const trigger2 = screen.getByText('Trigger 2')
      const trigger4 = screen.getByText('Trigger 4')

      trigger2.focus()

      // ArrowRight should skip disabled tab-3 and go to tab-4
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(trigger4)
    })

    it('wraps focus from last to first when loop=true', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs orientation="horizontal" loop={true} />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger4 = screen.getByText('Trigger 4')

      trigger4.focus()

      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(trigger1)
    })

    it('does not wrap when loop=false', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs orientation="horizontal" loop={false} />)

      const trigger4 = screen.getByText('Trigger 4')

      trigger4.focus()

      await user.keyboard('{ArrowRight}')
      // Should stay on trigger4
      expect(document.activeElement).toBe(trigger4)
    })

    it('navigates to first tab with Home', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs orientation="horizontal" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger4 = screen.getByText('Trigger 4')

      trigger4.focus()

      await user.keyboard('{Home}')
      expect(document.activeElement).toBe(trigger1)
    })

    it('navigates to last enabled tab with End', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs orientation="horizontal" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger4 = screen.getByText('Trigger 4')

      trigger1.focus()

      await user.keyboard('{End}')
      expect(document.activeElement).toBe(trigger4)
    })
  })

  // ============================================
  // Keyboard Interactions - Vertical
  // ============================================

  describe('Keyboard Interactions (Vertical)', () => {
    it('navigates with ArrowDown', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs orientation="vertical" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger1.focus()

      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(trigger2)
    })

    it('navigates with ArrowUp', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs orientation="vertical" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger2.focus()

      await user.keyboard('{ArrowUp}')
      expect(document.activeElement).toBe(trigger1)
    })

    it('does not navigate with ArrowLeft/Right in vertical mode', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs orientation="vertical" />)

      const trigger1 = screen.getByText('Trigger 1')

      trigger1.focus()

      await user.keyboard('{ArrowRight}')
      // Should stay on trigger1
      expect(document.activeElement).toBe(trigger1)
    })
  })

  // ============================================
  // Activation Modes
  // ============================================

  describe('Activation Modes', () => {
    it('activates tab on focus in automatic mode', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs activationMode="automatic" defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger1.focus()
      await user.keyboard('{ArrowRight}')

      // In automatic mode, tab should be activated when focused
      expect(trigger2).toHaveAttribute('aria-selected', 'true')
      expect(trigger1).toHaveAttribute('aria-selected', 'false')
    })

    it('does not activate tab on focus in manual mode', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs activationMode="manual" defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger1.focus()
      await user.keyboard('{ArrowRight}')

      // In manual mode, focus moves but selection stays
      expect(document.activeElement).toBe(trigger2)
      expect(trigger1).toHaveAttribute('aria-selected', 'true')
      expect(trigger2).toHaveAttribute('aria-selected', 'false')
    })

    it('activates focused tab with Enter in manual mode', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs activationMode="manual" defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger1.focus()
      await user.keyboard('{ArrowRight}')

      // Focus is on trigger2, but trigger1 is still selected
      expect(trigger1).toHaveAttribute('aria-selected', 'true')

      // Press Enter to activate
      await user.keyboard('{Enter}')
      expect(trigger2).toHaveAttribute('aria-selected', 'true')
      expect(trigger1).toHaveAttribute('aria-selected', 'false')
    })

    it('activates focused tab with Space in manual mode', async () => {
      const user = userEvent.setup()
      render(<SimpleTabs activationMode="manual" defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      trigger1.focus()
      await user.keyboard('{ArrowRight}')

      await user.keyboard(' ')
      expect(trigger2).toHaveAttribute('aria-selected', 'true')
    })
  })

  // ============================================
  // Controlled Mode
  // ============================================

  describe('Controlled Mode', () => {
    it('works in controlled mode', async () => {
      const user = userEvent.setup()
      render(<ControlledTabs />)

      const currentValue = screen.getByTestId('current-value')
      expect(currentValue).toHaveTextContent('tab-1')

      const trigger2 = screen.getByText('Trigger 2')
      await user.click(trigger2)

      expect(currentValue).toHaveTextContent('tab-2')
    })

    it('calls onValueChange callback', async () => {
      const user = userEvent.setup()
      const onValueChange = vi.fn()
      render(<SimpleTabs onValueChange={onValueChange} />)

      const trigger2 = screen.getByText('Trigger 2')
      await user.click(trigger2)

      expect(onValueChange).toHaveBeenCalledWith('tab-2')
    })
  })

  // ============================================
  // ARIA Attributes
  // ============================================

  describe('ARIA Attributes', () => {
    it('tablist has role="tablist"', () => {
      render(<SimpleTabs />)

      const tablist = screen.getByRole('tablist')
      expect(tablist).toBeInTheDocument()
    })

    it('tablist has aria-orientation', () => {
      render(<SimpleTabs orientation="horizontal" />)

      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveAttribute('aria-orientation', 'horizontal')
    })

    it('triggers have role="tab"', () => {
      render(<SimpleTabs />)

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)
    })

    it('active trigger has aria-selected="true"', () => {
      render(<SimpleTabs defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      expect(trigger1).toHaveAttribute('aria-selected', 'true')
      expect(trigger2).toHaveAttribute('aria-selected', 'false')
    })

    it('active trigger has tabindex="0", others have tabindex="-1"', () => {
      render(<SimpleTabs defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      const trigger2 = screen.getByText('Trigger 2')

      expect(trigger1).toHaveAttribute('tabindex', '0')
      expect(trigger2).toHaveAttribute('tabindex', '-1')
    })

    it('trigger has aria-controls linking to panel', () => {
      render(<SimpleTabs defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      const ariaControls = trigger1.getAttribute('aria-controls')

      expect(ariaControls).toBeTruthy()
      expect(document.getElementById(ariaControls!)).toBeInTheDocument()
    })

    it('panel has role="tabpanel"', () => {
      render(<SimpleTabs defaultValue="tab-1" />)

      const panels = screen.getAllByRole('tabpanel')
      expect(panels.length).toBeGreaterThan(0)
    })

    it('panel has aria-labelledby linking to trigger', () => {
      render(<SimpleTabs defaultValue="tab-1" />)

      const trigger1 = screen.getByText('Trigger 1')
      const triggerId = trigger1.getAttribute('id')

      const panel = screen.getByRole('tabpanel')
      expect(panel).toHaveAttribute('aria-labelledby', triggerId)
    })

    it('panel has tabindex="0"', () => {
      render(<SimpleTabs defaultValue="tab-1" />)

      const panel = screen.getByRole('tabpanel')
      expect(panel).toHaveAttribute('tabindex', '0')
    })

    it('disabled trigger has aria-disabled', () => {
      render(<SimpleTabs />)

      const trigger3 = screen.getByText('Trigger 3 (Disabled)')
      expect(trigger3).toHaveAttribute('aria-disabled', 'true')
    })
  })

  // ============================================
  // Indicator
  // ============================================

  describe('Indicator', () => {
    it('renders Indicator with correct data-part', () => {
      render(
        <Tabs.Root defaultValue="tab-1">
          <Tabs.List>
            <Tabs.Trigger value="tab-1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab-2">Tab 2</Tabs.Trigger>
            <Tabs.Indicator data-testid="indicator" />
          </Tabs.List>
          <Tabs.Content value="tab-1">Content 1</Tabs.Content>
          <Tabs.Content value="tab-2">Content 2</Tabs.Content>
        </Tabs.Root>,
      )

      const indicator = screen.getByTestId('indicator')
      expect(indicator).toHaveAttribute('data-part', 'indicator')
      expect(indicator).toHaveAttribute('aria-hidden', 'true')
    })

    it('Indicator has data-orientation', () => {
      render(
        <Tabs.Root defaultValue="tab-1" orientation="vertical">
          <Tabs.List>
            <Tabs.Trigger value="tab-1">Tab 1</Tabs.Trigger>
            <Tabs.Indicator data-testid="indicator" />
          </Tabs.List>
          <Tabs.Content value="tab-1">Content 1</Tabs.Content>
        </Tabs.Root>,
      )

      const indicator = screen.getByTestId('indicator')
      expect(indicator).toHaveAttribute('data-orientation', 'vertical')
    })
  })
})
