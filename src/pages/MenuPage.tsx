import { useState } from 'react'
import Menu from '../components/menu/styled'

export default function MenuPage() {
  const [lastAction, setLastAction] = useState<string | null>(null)

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Menu</h1>
        <p className="mt-2 text-gray-600">
          A dropdown menu with keyboard navigation and nested submenu support.
        </p>
      </div>

      {/* Basic Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Basic Menu</h2>
        <p className="text-sm text-gray-600">
          Click or use keyboard to open. Navigate with arrow keys.
        </p>
        <Menu.Root>
          <Menu.Trigger>Actions</Menu.Trigger>
          <Menu.Portal>
            <Menu.Content>
              <Menu.Item onSelect={() => setLastAction('Edit')}>Edit</Menu.Item>
              <Menu.Item onSelect={() => setLastAction('Duplicate')}>
                Duplicate
              </Menu.Item>
              <Menu.Separator />
              <Menu.Item onSelect={() => setLastAction('Archive')}>
                Archive
              </Menu.Item>
              <Menu.Item onSelect={() => setLastAction('Delete')} disabled>
                Delete (disabled)
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
        {lastAction && (
          <p className="text-sm text-gray-600">
            Last action: <code className="bg-gray-100 px-2 py-1 rounded">{lastAction}</code>
          </p>
        )}
      </section>

      {/* Nested Submenu */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Nested Submenu</h2>
        <p className="text-sm text-gray-600">
          Use ArrowRight to open submenu, ArrowLeft to close.
        </p>
        <Menu.Root>
          <Menu.Trigger>Share</Menu.Trigger>
          <Menu.Portal>
            <Menu.Content>
              <Menu.Item onSelect={() => setLastAction('Copy Link')}>
                Copy Link
              </Menu.Item>
              <Menu.Separator />
              <Menu.Sub>
                <Menu.SubTrigger>Social Media</Menu.SubTrigger>
                <Menu.Portal>
                  <Menu.SubContent>
                    <Menu.Item onSelect={() => setLastAction('Twitter')}>
                      Twitter
                    </Menu.Item>
                    <Menu.Item onSelect={() => setLastAction('Facebook')}>
                      Facebook
                    </Menu.Item>
                    <Menu.Item onSelect={() => setLastAction('LinkedIn')}>
                      LinkedIn
                    </Menu.Item>
                  </Menu.SubContent>
                </Menu.Portal>
              </Menu.Sub>
              <Menu.Sub>
                <Menu.SubTrigger>Email</Menu.SubTrigger>
                <Menu.Portal>
                  <Menu.SubContent>
                    <Menu.Item onSelect={() => setLastAction('Gmail')}>
                      Gmail
                    </Menu.Item>
                    <Menu.Item onSelect={() => setLastAction('Outlook')}>
                      Outlook
                    </Menu.Item>
                  </Menu.SubContent>
                </Menu.Portal>
              </Menu.Sub>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </section>

      {/* Deep Nesting (3+ levels) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Deep Nesting (3+ Levels)</h2>
        <p className="text-sm text-gray-600">
          Escape closes only the current level. Test nested Escape behavior.
        </p>
        <Menu.Root>
          <Menu.Trigger>Categories</Menu.Trigger>
          <Menu.Portal>
            <Menu.Content>
              <Menu.Sub>
                <Menu.SubTrigger>Electronics</Menu.SubTrigger>
                <Menu.Portal>
                  <Menu.SubContent>
                    <Menu.Sub>
                      <Menu.SubTrigger>Computers</Menu.SubTrigger>
                      <Menu.Portal>
                        <Menu.SubContent>
                          <Menu.Sub>
                            <Menu.SubTrigger>Laptops</Menu.SubTrigger>
                            <Menu.Portal>
                              <Menu.SubContent>
                                <Menu.Item onSelect={() => setLastAction('MacBook')}>
                                  MacBook
                                </Menu.Item>
                                <Menu.Item onSelect={() => setLastAction('ThinkPad')}>
                                  ThinkPad
                                </Menu.Item>
                                <Menu.Item onSelect={() => setLastAction('XPS')}>
                                  Dell XPS
                                </Menu.Item>
                              </Menu.SubContent>
                            </Menu.Portal>
                          </Menu.Sub>
                          <Menu.Item onSelect={() => setLastAction('Desktops')}>
                            Desktops
                          </Menu.Item>
                        </Menu.SubContent>
                      </Menu.Portal>
                    </Menu.Sub>
                    <Menu.Item onSelect={() => setLastAction('Phones')}>
                      Phones
                    </Menu.Item>
                    <Menu.Item onSelect={() => setLastAction('Tablets')}>
                      Tablets
                    </Menu.Item>
                  </Menu.SubContent>
                </Menu.Portal>
              </Menu.Sub>
              <Menu.Sub>
                <Menu.SubTrigger>Clothing</Menu.SubTrigger>
                <Menu.Portal>
                  <Menu.SubContent>
                    <Menu.Item onSelect={() => setLastAction('Shirts')}>
                      Shirts
                    </Menu.Item>
                    <Menu.Item onSelect={() => setLastAction('Pants')}>
                      Pants
                    </Menu.Item>
                  </Menu.SubContent>
                </Menu.Portal>
              </Menu.Sub>
              <Menu.Item onSelect={() => setLastAction('Books')}>Books</Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </section>

      {/* Character Search */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Character Search</h2>
        <p className="text-sm text-gray-600">
          Type a letter to jump to matching item (e.g., 'A' for Apple).
        </p>
        <Menu.Root>
          <Menu.Trigger>Fruits</Menu.Trigger>
          <Menu.Portal>
            <Menu.Content>
              <Menu.Item onSelect={() => setLastAction('Apple')}>Apple</Menu.Item>
              <Menu.Item onSelect={() => setLastAction('Apricot')}>Apricot</Menu.Item>
              <Menu.Item onSelect={() => setLastAction('Banana')}>Banana</Menu.Item>
              <Menu.Item onSelect={() => setLastAction('Blueberry')}>Blueberry</Menu.Item>
              <Menu.Item onSelect={() => setLastAction('Cherry')}>Cherry</Menu.Item>
              <Menu.Item onSelect={() => setLastAction('Coconut')}>Coconut</Menu.Item>
              <Menu.Item onSelect={() => setLastAction('Grape')}>Grape</Menu.Item>
              <Menu.Item onSelect={() => setLastAction('Mango')}>Mango</Menu.Item>
              <Menu.Item onSelect={() => setLastAction('Orange')}>Orange</Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </section>

      {/* Keyboard Navigation Info */}
      <section className="p-4 bg-gray-800 text-white rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Keyboard Navigation</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-300 mb-1">Menu Button</h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> /{' '}
                <kbd className="bg-gray-700 px-1 rounded">Space</kbd> /{' '}
                <kbd className="bg-gray-700 px-1 rounded">Down</kbd> - Open menu,
                focus first
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Up</kbd> - Open menu,
                focus last
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-300 mb-1">Menu Items</h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Up</kbd> /{' '}
                <kbd className="bg-gray-700 px-1 rounded">Down</kbd> - Navigate
                items
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Home</kbd> /{' '}
                <kbd className="bg-gray-700 px-1 rounded">End</kbd> - First /
                Last item
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> /{' '}
                <kbd className="bg-gray-700 px-1 rounded">Space</kbd> - Select
                item
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Escape</kbd> - Close
                menu
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">A-Z</kbd> - Jump to
                matching item
              </li>
            </ul>
          </div>
          <div className="col-span-2">
            <h3 className="font-semibold text-gray-300 mb-1">Submenu</h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Right</kbd> /{' '}
                <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> - Open
                submenu
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Left</kbd> - Close
                submenu, return to parent
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Escape</kbd> - Close
                current level only (not all)
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
