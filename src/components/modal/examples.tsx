import { useState } from 'react'
import Modal from './styled'

export function UncontrolledExample() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Modal.Root>
          <Modal.Trigger>Open Modal</Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Content>
              <Modal.Title>Modal Title</Modal.Title>
              <Modal.Description>
                This is an uncontrolled modal. The modal state is managed
                internally.
              </Modal.Description>
              <div className="mt-4 space-y-2">
                <input
                  type="text"
                  placeholder="First input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Second input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Modal.CloseTrigger>Cancel</Modal.CloseTrigger>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Confirm
                </button>
              </div>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </div>
    </div>
  )
}

export function ControlledExample() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Modal is {open ? 'open' : 'closed'}
          </p>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {open ? 'Close' : 'Open'} Modal
          </button>
        </div>
        <Modal.Root open={open} onOpenChange={setOpen}>
          <Modal.Trigger>Open Modal</Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Content>
              <Modal.Title>Controlled Modal</Modal.Title>
              <Modal.Description>
                This is a controlled modal. The state is managed externally.
              </Modal.Description>
              <div className="mt-6 flex justify-end gap-2">
                <Modal.CloseTrigger>Close</Modal.CloseTrigger>
              </div>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </div>
    </div>
  )
}

export function CloseOnOutsideClickExample() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Modal.Root closeOnOutsideClick>
          <Modal.Trigger>Open Modal (Click Outside to Close)</Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Content>
              <Modal.Title>Close on Outside Click</Modal.Title>
              <Modal.Description>
                Click on the backdrop to close this modal.
              </Modal.Description>
              <div className="mt-6 flex justify-end">
                <Modal.CloseTrigger>Close</Modal.CloseTrigger>
              </div>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </div>
    </div>
  )
}

export function CustomInitialFocusExample() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Modal.Root
          initialFocus={() => document.getElementById('initial-focus-input')}
        >
          <Modal.Trigger>Open Modal (Custom Focus)</Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Content>
              <Modal.Title>Custom Initial Focus</Modal.Title>
              <Modal.Description>
                The second input will receive focus when the modal opens.
              </Modal.Description>
              <div className="mt-4 space-y-2">
                <input
                  type="text"
                  placeholder="First input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  id="initial-focus-input"
                  type="text"
                  placeholder="This input gets focus (second input)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Third input"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="mt-6 flex justify-end">
                <Modal.CloseTrigger>Close</Modal.CloseTrigger>
              </div>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </div>
    </div>
  )
}

export function NestedModalExample() {
  // First Modal Settings
  const [firstCloseOnOutsideClick, setFirstCloseOnOutsideClick] =
    useState(false)
  const [firstCloseOnEscape, setFirstCloseOnEscape] = useState(true)

  // Nested Modal Settings
  const [nestedCloseOnOutsideClick, setNestedCloseOnOutsideClick] =
    useState(false)
  const [nestedCloseOnEscape, setNestedCloseOnEscape] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                First Modal Settings
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={firstCloseOnOutsideClick}
                    onChange={(e) =>
                      setFirstCloseOnOutsideClick(e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Close on Outside Click</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={firstCloseOnEscape}
                    onChange={(e) => setFirstCloseOnEscape(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Close on Escape</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                Nested Modal Settings
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={nestedCloseOnOutsideClick}
                    onChange={(e) =>
                      setNestedCloseOnOutsideClick(e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Close on Outside Click</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={nestedCloseOnEscape}
                    onChange={(e) => setNestedCloseOnEscape(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Close on Escape</span>
                </label>
              </div>
            </div>
          </div>

          {/* Modal Demo */}
          <div className="flex items-center justify-center">
            <Modal.Root
              closeOnOutsideClick={firstCloseOnOutsideClick}
              closeOnEscape={firstCloseOnEscape}
            >
              <Modal.Trigger>Open First Modal</Modal.Trigger>
              <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Content>
                  <Modal.Title>First Modal</Modal.Title>
                  <Modal.Description>
                    This is the first modal. You can open a nested modal from
                    here. Try adjusting the settings in the control panel.
                  </Modal.Description>
                  <div className="mt-4 space-y-2">
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>
                        Close on Outside Click:{' '}
                        {firstCloseOnOutsideClick ? 'Enabled' : 'Disabled'}
                      </div>
                      <div>
                        Close on Escape:{' '}
                        {firstCloseOnEscape ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Modal.Root
                      closeOnOutsideClick={nestedCloseOnOutsideClick}
                      closeOnEscape={nestedCloseOnEscape}
                    >
                      <Modal.Trigger className="w-full">
                        Open Nested Modal
                      </Modal.Trigger>
                      <Modal.Portal>
                        <Modal.Backdrop className="z-60" />
                        <Modal.Content className="max-w-sm p-4 z-70">
                          <Modal.Title>Nested Modal</Modal.Title>
                          <Modal.Description>
                            This is a nested modal. Notice how the backdrop is
                            darker. Each modal can have different settings.
                          </Modal.Description>
                          <div className="mt-4 space-y-2">
                            <div className="text-xs text-gray-500 space-y-1">
                              <div>
                                Close on Outside Click:{' '}
                                {nestedCloseOnOutsideClick
                                  ? 'Enabled'
                                  : 'Disabled'}
                              </div>
                              <div>
                                Close on Escape:{' '}
                                {nestedCloseOnEscape ? 'Enabled' : 'Disabled'}
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 flex justify-end gap-2">
                            <Modal.CloseTrigger>
                              Close Nested
                            </Modal.CloseTrigger>
                          </div>
                        </Modal.Content>
                      </Modal.Portal>
                    </Modal.Root>
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                    <Modal.CloseTrigger>Close First</Modal.CloseTrigger>
                  </div>
                </Modal.Content>
              </Modal.Portal>
            </Modal.Root>
          </div>
        </div>
      </div>
    </div>
  )
}
