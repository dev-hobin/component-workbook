import { useState, useRef } from 'react'
import Modal from '../components/modal/styled'

export default function ModalPage() {
  const [controlledOpen, setControlledOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Modal</h1>
        <p className="mt-2 text-gray-600">
          A modal dialog component that opens on top of the main content.
        </p>
      </div>

      {/* Basic Example */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Basic Modal</h2>
        <p className="text-sm text-gray-600">
          Click to open. Press Escape or click backdrop to close.
        </p>
        <Modal.Root>
          <Modal.Trigger>Open Modal</Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Content>
              <Modal.Title>Basic Modal</Modal.Title>
              <Modal.Description>
                This is a basic modal dialog. It has a title, description, and close button.
              </Modal.Description>
              <div className="mt-6 flex justify-end">
                <Modal.Close>Close</Modal.Close>
              </div>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </section>

      {/* With Form */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Modal with Form</h2>
        <p className="text-sm text-gray-600">
          Modal with form inputs. Focus is trapped within the modal.
        </p>
        <Modal.Root>
          <Modal.Trigger>Open Form Modal</Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Content>
              <Modal.Title>Edit Profile</Modal.Title>
              <Modal.Description>
                Make changes to your profile here.
              </Modal.Description>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Modal.Close>Cancel</Modal.Close>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </section>

      {/* Custom Initial Focus */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Custom Initial Focus</h2>
        <p className="text-sm text-gray-600">
          Focus starts on a specific element when the modal opens.
        </p>
        <Modal.Root>
          <Modal.Trigger>Open with Custom Focus</Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Content initialFocusRef={inputRef}>
              <Modal.Title>Search</Modal.Title>
              <Modal.Description>
                The search input is focused when this modal opens.
              </Modal.Description>
              <div className="mt-4">
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Start typing to search..."
                />
              </div>
              <div className="mt-6 flex justify-end">
                <Modal.Close>Close</Modal.Close>
              </div>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </section>

      {/* Controlled */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Controlled</h2>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Open state:{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">
              {JSON.stringify(controlledOpen)}
            </code>
          </p>
          <button
            onClick={() => setControlledOpen(!controlledOpen)}
            className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 rounded"
          >
            Toggle Modal
          </button>
        </div>
        <Modal.Root open={controlledOpen} onOpenChange={setControlledOpen}>
          <Modal.Trigger>Open Controlled Modal</Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Content>
              <Modal.Title>Controlled Modal</Modal.Title>
              <Modal.Description>
                This modal state is controlled externally.
              </Modal.Description>
              <div className="mt-6 flex justify-end">
                <Modal.Close>Close</Modal.Close>
              </div>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </section>

      {/* Close Options */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Close Options</h2>
        <p className="text-sm text-gray-600">
          Disable Escape key or backdrop click closing.
        </p>
        <div className="flex gap-4">
          <Modal.Root closeOnEscape={false}>
            <Modal.Trigger>No Escape Close</Modal.Trigger>
            <Modal.Portal>
              <Modal.Backdrop />
              <Modal.Content>
                <Modal.Title>No Escape Close</Modal.Title>
                <Modal.Description>
                  Pressing Escape will not close this modal.
                </Modal.Description>
                <div className="mt-6 flex justify-end">
                  <Modal.Close>Close</Modal.Close>
                </div>
              </Modal.Content>
            </Modal.Portal>
          </Modal.Root>

          <Modal.Root closeOnBackdropClick={false}>
            <Modal.Trigger>No Backdrop Close</Modal.Trigger>
            <Modal.Portal>
              <Modal.Backdrop />
              <Modal.Content>
                <Modal.Title>No Backdrop Close</Modal.Title>
                <Modal.Description>
                  Clicking the backdrop will not close this modal.
                </Modal.Description>
                <div className="mt-6 flex justify-end">
                  <Modal.Close>Close</Modal.Close>
                </div>
              </Modal.Content>
            </Modal.Portal>
          </Modal.Root>
        </div>
      </section>

      {/* Confirmation Dialog */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Confirmation Dialog</h2>
        <p className="text-sm text-gray-600">
          A common pattern for confirming destructive actions.
        </p>
        <Modal.Root>
          <Modal.Trigger className="bg-red-600 hover:bg-red-700">
            Delete Account
          </Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Content>
              <Modal.Title className="text-red-600">Delete Account</Modal.Title>
              <Modal.Description>
                Are you sure you want to delete your account? This action cannot be undone.
              </Modal.Description>
              <div className="mt-6 flex justify-end gap-2">
                <Modal.Close>Cancel</Modal.Close>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </section>

      {/* Nested Modal */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Nested Modal</h2>
        <p className="text-sm text-gray-600">
          Modal inside another modal. Each has its own focus trap.
        </p>
        <Modal.Root>
          <Modal.Trigger>Open Outer Modal</Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Content>
              <Modal.Title>Outer Modal</Modal.Title>
              <Modal.Description>
                This is the outer modal. You can open another modal from here.
              </Modal.Description>
              <div className="mt-4">
                <Modal.Root>
                  <Modal.Trigger className="bg-green-600 hover:bg-green-700">
                    Open Inner Modal
                  </Modal.Trigger>
                  <Modal.Portal>
                    <Modal.Backdrop />
                    <Modal.Content>
                      <Modal.Title>Inner Modal</Modal.Title>
                      <Modal.Description>
                        This is the inner modal. Press Escape to close only this modal.
                      </Modal.Description>
                      <div className="mt-6 flex justify-end">
                        <Modal.Close>Close Inner</Modal.Close>
                      </div>
                    </Modal.Content>
                  </Modal.Portal>
                </Modal.Root>
              </div>
              <div className="mt-6 flex justify-end">
                <Modal.Close>Close Outer</Modal.Close>
              </div>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </section>

      {/* Keyboard Navigation Info */}
      <section className="p-4 bg-gray-800 text-white rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Keyboard Navigation</h2>
        <ul className="text-sm space-y-1 text-gray-300">
          <li>
            <kbd className="bg-gray-700 px-1 rounded">Tab</kbd> - Move focus to next element
          </li>
          <li>
            <kbd className="bg-gray-700 px-1 rounded">Shift + Tab</kbd> - Move focus to previous element
          </li>
          <li>
            <kbd className="bg-gray-700 px-1 rounded">Escape</kbd> - Close modal (if enabled)
          </li>
        </ul>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h3 className="font-semibold mb-1">Focus Management</h3>
          <ul className="text-sm space-y-1 text-gray-300">
            <li>Focus is trapped within the modal while open</li>
            <li>Tab cycles through focusable elements</li>
            <li>Focus returns to trigger when modal closes</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
