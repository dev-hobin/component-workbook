import Modal from './index'

export function Example() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Modal.Root>
          <Modal.Trigger>Trigger</Modal.Trigger>
          <Modal.Portal>
            <Modal.Content>
              <Modal.Title>Title</Modal.Title>
              <Modal.Description>Description</Modal.Description>
              <Modal.CloseTrigger>Close</Modal.CloseTrigger>
            </Modal.Content>
          </Modal.Portal>
        </Modal.Root>
      </div>
    </div>
  )
}
