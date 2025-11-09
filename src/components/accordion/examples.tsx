import { useState } from 'react'
import Accordion from './styled'

export function UncontrolledExample() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Accordion.Root defaultValue={['item-1']}>
          <Accordion.Item value="item-1">
            <Accordion.Trigger>Accordion Item 1</Accordion.Trigger>
            <Accordion.Panel>
              This is the content for the first accordion item. You can put any
              content here, including other components or rich text.
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="item-2">
            <Accordion.Trigger>Accordion Item 2</Accordion.Trigger>
            <Accordion.Panel>
              This is the content for the second accordion item. The accordion
              allows you to organize content in a collapsible format.
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="item-3">
            <Accordion.Trigger>Accordion Item 3</Accordion.Trigger>
            <Accordion.Panel>
              This is the content for the third accordion item. Users can expand
              or collapse these sections as needed.
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      </div>
    </div>
  )
}

export function ControlledExample() {
  const [expandedItems, setExpandedItems] = useState<string[]>(['item-1'])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <Accordion.Root value={expandedItems} onValueChange={setExpandedItems}>
          <Accordion.Item value="item-1">
            <Accordion.Trigger>Accordion Item 1</Accordion.Trigger>
            <Accordion.Panel>
              This is the content for the first accordion item. You can put any
              content here, including other components or rich text.
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="item-2">
            <Accordion.Trigger>Accordion Item 2</Accordion.Trigger>
            <Accordion.Panel>
              This is the content for the second accordion item. The accordion
              allows you to organize content in a collapsible format.
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="item-3">
            <Accordion.Trigger>Accordion Item 3</Accordion.Trigger>
            <Accordion.Panel>
              This is the content for the third accordion item. Users can expand
              or collapse these sections as needed.
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      </div>
    </div>
  )
}
