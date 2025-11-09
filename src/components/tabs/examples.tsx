import { useState } from 'react'
import Tabs from './styled'

export function UncontrolledExample() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Uncontrolled Tabs (Horizontal)
          </h2>
          <Tabs.Root defaultValue="account" orientation="horizontal">
            <Tabs.List>
              <Tabs.Tab value="account">Account</Tabs.Tab>
              <Tabs.Tab value="password">Password</Tabs.Tab>
              <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
              <Tabs.Tab value="advanced" disabled>
                Advanced (Disabled)
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="account">
              <h3 className="font-semibold mb-2">Account Settings</h3>
              <p>Manage your account information and preferences here.</p>
              <ul className="mt-4 list-disc list-inside space-y-1">
                <li>Email address</li>
                <li>Username</li>
                <li>Profile picture</li>
              </ul>
            </Tabs.Panel>
            <Tabs.Panel value="password">
              <h3 className="font-semibold mb-2">Password Settings</h3>
              <p>Change your password and security settings.</p>
              <form className="mt-4 space-y-2">
                <div>
                  <label className="block text-sm">Current Password</label>
                  <input
                    type="password"
                    className="mt-1 px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm">New Password</label>
                  <input
                    type="password"
                    className="mt-1 px-3 py-2 border rounded"
                  />
                </div>
              </form>
            </Tabs.Panel>
            <Tabs.Panel value="notifications">
              <h3 className="font-semibold mb-2">Notification Preferences</h3>
              <p>Configure how and when you receive notifications.</p>
              <div className="mt-4 space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  Email notifications
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  Push notifications
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  SMS notifications
                </label>
              </div>
            </Tabs.Panel>
            <Tabs.Panel value="advanced">
              <p>This panel is disabled.</p>
            </Tabs.Panel>
          </Tabs.Root>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">
            Uncontrolled Tabs (Vertical)
          </h2>
          <Tabs.Root
            defaultValue="overview"
            orientation="vertical"
            className="flex gap-4"
          >
            <Tabs.List className="shrink-0">
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
              <Tabs.Tab value="reports">Reports</Tabs.Tab>
            </Tabs.List>
            <div className="flex-1">
              <Tabs.Panel value="overview">
                <h3 className="font-semibold mb-2">Dashboard Overview</h3>
                <p>
                  View your dashboard metrics and key information at a glance.
                </p>
              </Tabs.Panel>
              <Tabs.Panel value="analytics">
                <h3 className="font-semibold mb-2">Analytics</h3>
                <p>Deep dive into your data with advanced analytics tools.</p>
              </Tabs.Panel>
              <Tabs.Panel value="reports">
                <h3 className="font-semibold mb-2">Reports</h3>
                <p>Generate and view detailed reports on your activities.</p>
              </Tabs.Panel>
            </div>
          </Tabs.Root>
        </div>
      </div>
    </div>
  )
}

export function ControlledExample() {
  const [activeTab, setActiveTab] = useState<string | number>('general')
  const [secondTabGroup, setSecondTabGroup] = useState<string | number>('tab-1')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Controlled Tabs</h2>
          <p className="text-sm text-gray-600 mb-4">
            Current active tab:{' '}
            <span className="font-semibold">{activeTab}</span>
          </p>
          <Tabs.Root
            value={activeTab}
            onValueChange={setActiveTab}
            orientation="horizontal"
          >
            <Tabs.List>
              <Tabs.Tab value="general">General</Tabs.Tab>
              <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
              <Tabs.Tab value="accessibility">Accessibility</Tabs.Tab>
              <Tabs.Tab value="privacy">Privacy</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="general">
              <h3 className="font-semibold mb-2">General Settings</h3>
              <p>Configure general application settings and preferences.</p>
              <div className="mt-4">
                <button
                  onClick={() => setActiveTab('appearance')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Go to Appearance Tab (Programmatically)
                </button>
              </div>
            </Tabs.Panel>
            <Tabs.Panel value="appearance">
              <h3 className="font-semibold mb-2">Appearance Settings</h3>
              <p>Customize the look and feel of your application.</p>
              <div className="mt-4 space-y-2">
                <label className="flex items-center">
                  <input type="radio" name="theme" className="mr-2" />
                  Light mode
                </label>
                <label className="flex items-center">
                  <input type="radio" name="theme" className="mr-2" />
                  Dark mode
                </label>
                <label className="flex items-center">
                  <input type="radio" name="theme" className="mr-2" />
                  System preference
                </label>
              </div>
            </Tabs.Panel>
            <Tabs.Panel value="accessibility">
              <h3 className="font-semibold mb-2">Accessibility Options</h3>
              <p>
                Configure accessibility features to enhance your experience.
              </p>
              <div className="mt-4 space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  High contrast mode
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  Reduce motion
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  Screen reader optimizations
                </label>
              </div>
            </Tabs.Panel>
            <Tabs.Panel value="privacy">
              <h3 className="font-semibold mb-2">Privacy & Security</h3>
              <p>Manage your privacy settings and data preferences.</p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data collection
                  </label>
                  <select className="w-full px-3 py-2 border rounded">
                    <option>Minimal</option>
                    <option>Standard</option>
                    <option>Enhanced</option>
                  </select>
                </div>
                <button
                  onClick={() => setActiveTab('general')}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Back to General
                </button>
              </div>
            </Tabs.Panel>
          </Tabs.Root>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">
            Multiple Controlled Tab Groups
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                First group active tab:{' '}
                <span className="font-semibold">{activeTab}</span>
              </p>
              <Tabs.Root
                value={activeTab}
                onValueChange={setActiveTab}
                orientation="horizontal"
              >
                <Tabs.List>
                  <Tabs.Tab value="general">General</Tabs.Tab>
                  <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="general">First Group - General</Tabs.Panel>
                <Tabs.Panel value="appearance">
                  First Group - Appearance
                </Tabs.Panel>
              </Tabs.Root>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Second group active tab:{' '}
                <span className="font-semibold">{secondTabGroup}</span>
              </p>
              <Tabs.Root
                value={secondTabGroup}
                onValueChange={setSecondTabGroup}
                orientation="horizontal"
              >
                <Tabs.List>
                  <Tabs.Tab value="tab-1">Tab 1</Tabs.Tab>
                  <Tabs.Tab value="tab-2">Tab 2</Tabs.Tab>
                  <Tabs.Tab value="tab-3">Tab 3</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="tab-1">
                  Second Group - Tab 1 Content
                </Tabs.Panel>
                <Tabs.Panel value="tab-2">
                  Second Group - Tab 2 Content
                </Tabs.Panel>
                <Tabs.Panel value="tab-3">
                  Second Group - Tab 3 Content
                </Tabs.Panel>
              </Tabs.Root>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
