import { useState } from 'react'
import Tabs from '../components/tabs/styled'

export default function TabsPage() {
  const [controlledValue, setControlledValue] = useState('tab-1')

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tabs</h1>
        <p className="mt-2 text-gray-600">
          A set of layered sections of content that display one panel at a time.
        </p>
      </div>

      {/* Basic Example (Horizontal) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Basic (Horizontal, Automatic)
        </h2>
        <p className="text-sm text-gray-600">
          Arrow keys navigate and automatically activate tabs.
        </p>
        <Tabs.Root defaultValue="account">
          <Tabs.List>
            <Tabs.Trigger value="account">Account</Tabs.Trigger>
            <Tabs.Trigger value="password">Password</Tabs.Trigger>
            <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="account">
            <h3 className="font-semibold mb-2">Account Settings</h3>
            <p>Manage your account information and preferences here.</p>
          </Tabs.Content>
          <Tabs.Content value="password">
            <h3 className="font-semibold mb-2">Password Settings</h3>
            <p>Change your password and security settings.</p>
          </Tabs.Content>
          <Tabs.Content value="settings">
            <h3 className="font-semibold mb-2">General Settings</h3>
            <p>Configure general application settings.</p>
          </Tabs.Content>
        </Tabs.Root>
      </section>

      {/* Vertical Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Vertical Orientation
        </h2>
        <p className="text-sm text-gray-600">
          Uses Arrow Up/Down for navigation instead of Left/Right.
        </p>
        <Tabs.Root defaultValue="overview" orientation="vertical" className="flex gap-4">
          <Tabs.List className="flex-col border-b-0 border-r border-gray-200">
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
            <Tabs.Trigger value="reports">Reports</Tabs.Trigger>
          </Tabs.List>
          <div className="flex-1">
            <Tabs.Content value="overview" className="mt-0">
              <h3 className="font-semibold mb-2">Dashboard Overview</h3>
              <p>View your dashboard metrics at a glance.</p>
            </Tabs.Content>
            <Tabs.Content value="analytics" className="mt-0">
              <h3 className="font-semibold mb-2">Analytics</h3>
              <p>Deep dive into your data with analytics tools.</p>
            </Tabs.Content>
            <Tabs.Content value="reports" className="mt-0">
              <h3 className="font-semibold mb-2">Reports</h3>
              <p>Generate and view detailed reports.</p>
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </section>

      {/* Manual Activation Mode */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Manual Activation Mode
        </h2>
        <p className="text-sm text-gray-600">
          Arrow keys only move focus. Press Enter or Space to activate.
        </p>
        <Tabs.Root defaultValue="tab-a" activationMode="manual">
          <Tabs.List>
            <Tabs.Trigger value="tab-a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="tab-b">Tab B</Tabs.Trigger>
            <Tabs.Trigger value="tab-c">Tab C</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab-a">
            <p>Content for Tab A. Use arrow keys to move focus, then press Enter to activate.</p>
          </Tabs.Content>
          <Tabs.Content value="tab-b">
            <p>Content for Tab B.</p>
          </Tabs.Content>
          <Tabs.Content value="tab-c">
            <p>Content for Tab C.</p>
          </Tabs.Content>
        </Tabs.Root>
      </section>

      {/* Disabled Tabs */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Disabled Tabs</h2>
        <p className="text-sm text-gray-600">
          Disabled tabs are skipped during keyboard navigation.
        </p>
        <Tabs.Root defaultValue="enabled-1">
          <Tabs.List>
            <Tabs.Trigger value="enabled-1">Enabled 1</Tabs.Trigger>
            <Tabs.Trigger value="disabled" disabled>
              Disabled
            </Tabs.Trigger>
            <Tabs.Trigger value="enabled-2">Enabled 2</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="enabled-1">
            <p>First enabled tab. Arrow Right will skip the disabled tab.</p>
          </Tabs.Content>
          <Tabs.Content value="disabled">
            <p>This content is inaccessible.</p>
          </Tabs.Content>
          <Tabs.Content value="enabled-2">
            <p>Second enabled tab. Arrow Left will skip the disabled tab.</p>
          </Tabs.Content>
        </Tabs.Root>
      </section>

      {/* Controlled Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Controlled</h2>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Current value:{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">
              {JSON.stringify(controlledValue)}
            </code>
          </p>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setControlledValue('tab-1')}
              className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 rounded"
            >
              Tab 1
            </button>
            <button
              onClick={() => setControlledValue('tab-2')}
              className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 rounded"
            >
              Tab 2
            </button>
            <button
              onClick={() => setControlledValue('tab-3')}
              className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 rounded"
            >
              Tab 3
            </button>
          </div>
        </div>
        <Tabs.Root value={controlledValue} onValueChange={setControlledValue}>
          <Tabs.List>
            <Tabs.Trigger value="tab-1">Tab 1</Tabs.Trigger>
            <Tabs.Trigger value="tab-2">Tab 2</Tabs.Trigger>
            <Tabs.Trigger value="tab-3">Tab 3</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tab-1">
            <p>Content for Tab 1. Control the state externally with buttons above.</p>
          </Tabs.Content>
          <Tabs.Content value="tab-2">
            <p>Content for Tab 2.</p>
          </Tabs.Content>
          <Tabs.Content value="tab-3">
            <p>Content for Tab 3.</p>
          </Tabs.Content>
        </Tabs.Root>
      </section>

      {/* No Loop Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">No Loop</h2>
        <p className="text-sm text-gray-600">
          When loop is false, navigation stops at the first/last tab.
        </p>
        <Tabs.Root defaultValue="first" loop={false}>
          <Tabs.List>
            <Tabs.Trigger value="first">First</Tabs.Trigger>
            <Tabs.Trigger value="middle">Middle</Tabs.Trigger>
            <Tabs.Trigger value="last">Last</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="first">
            <p>First tab. Arrow Left does nothing here.</p>
          </Tabs.Content>
          <Tabs.Content value="middle">
            <p>Middle tab.</p>
          </Tabs.Content>
          <Tabs.Content value="last">
            <p>Last tab. Arrow Right does nothing here.</p>
          </Tabs.Content>
        </Tabs.Root>
      </section>

      {/* With Indicator Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">With Indicator</h2>
        <p className="text-sm text-gray-600">
          Animated indicator follows the active tab.
        </p>
        <Tabs.Root defaultValue="home">
          <Tabs.List>
            <Tabs.Trigger value="home">Home</Tabs.Trigger>
            <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
            <Tabs.Trigger value="messages">Messages</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content value="home">
            <p>Home content. Watch the indicator slide as you switch tabs.</p>
          </Tabs.Content>
          <Tabs.Content value="profile">
            <p>Profile content.</p>
          </Tabs.Content>
          <Tabs.Content value="messages">
            <p>Messages content.</p>
          </Tabs.Content>
        </Tabs.Root>
      </section>

      {/* Keyboard Navigation Info */}
      <section className="p-4 bg-gray-800 text-white rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Keyboard Navigation</h2>
        <ul className="text-sm space-y-1 text-gray-300">
          <li>
            <kbd className="bg-gray-700 px-1 rounded">Tab</kbd> - Enter/exit tab list
          </li>
          <li>
            <kbd className="bg-gray-700 px-1 rounded">Arrow Left/Right</kbd> - Navigate tabs (horizontal)
          </li>
          <li>
            <kbd className="bg-gray-700 px-1 rounded">Arrow Up/Down</kbd> - Navigate tabs (vertical)
          </li>
          <li>
            <kbd className="bg-gray-700 px-1 rounded">Home</kbd> - Focus first tab
          </li>
          <li>
            <kbd className="bg-gray-700 px-1 rounded">End</kbd> - Focus last tab
          </li>
          <li>
            <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> /{' '}
            <kbd className="bg-gray-700 px-1 rounded">Space</kbd> - Activate tab (manual mode only)
          </li>
        </ul>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h3 className="font-semibold mb-1">Activation Modes</h3>
          <ul className="text-sm space-y-1 text-gray-300">
            <li>
              <strong>Automatic</strong> (default): Tab activates on focus
            </li>
            <li>
              <strong>Manual</strong>: Tab activates only on Enter/Space
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
