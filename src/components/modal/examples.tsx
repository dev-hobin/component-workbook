import Modal from './index'

export function Example() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Modal.Root
          initialFocus={() => document.getElementById('initial-focus')}
        >
          <Modal.Trigger>Trigger</Modal.Trigger>
          <Modal.Portal>
            <Modal.Backdrop className="fixed inset-0 bg-black/50" />
            <Modal.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 flex flex-col items-center justify-center bg-white">
              <Modal.Title>Title</Modal.Title>
              <Modal.Description>Description</Modal.Description>
              <input type="text" />
              <input id="initial-focus" type="text" />
              <input type="text" />
              <button type="button">Button</button>
              <Modal.CloseTrigger>Close</Modal.CloseTrigger>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </div>
    </div>
  )
}
