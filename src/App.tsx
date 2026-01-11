import { useState } from 'react'
import Accordion from './components/accordion'

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

function App() {
  const [controlledValue, setControlledValue] = useState<string[]>(['item-1'])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto space-y-12">
        <h1 className="text-3xl font-bold text-gray-900">Accordion Component</h1>

        {/* Basic Example */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Basic (Uncontrolled)</h2>
          <Accordion.Root
            defaultValue={['item-1']}
            className="space-y-2"
          >
            <Accordion.Item value="item-1" className="border border-gray-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left font-medium text-gray-900 transition-colors">
                What is React?
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-gray-50 text-gray-700 data-[state=closed]:hidden">
                React is a JavaScript library for building user interfaces. It lets you compose complex UIs from small and isolated pieces of code called "components".
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="item-2" className="border border-gray-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left font-medium text-gray-900 transition-colors">
                What is TypeScript?
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-gray-50 text-gray-700 data-[state=closed]:hidden">
                TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="item-3" className="border border-gray-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left font-medium text-gray-900 transition-colors">
                What is Tailwind CSS?
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-gray-50 text-gray-700 data-[state=closed]:hidden">
                Tailwind CSS is a utility-first CSS framework that provides low-level utility classes to build custom designs without writing CSS.
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>
        </section>

        {/* Multiple Example */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Multiple (Allow multiple open)</h2>
          <Accordion.Root
            defaultValue={['m-1', 'm-2']}
            multiple
            className="space-y-2"
          >
            <Accordion.Item value="m-1" className="border border-blue-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 text-left font-medium text-blue-900 transition-colors">
                Section 1
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-white text-gray-700 data-[state=closed]:hidden">
                This accordion allows multiple items to be open at the same time.
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="m-2" className="border border-blue-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 text-left font-medium text-blue-900 transition-colors">
                Section 2
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-white text-gray-700 data-[state=closed]:hidden">
                Try opening this while Section 1 is still open!
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="m-3" className="border border-blue-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 text-left font-medium text-blue-900 transition-colors">
                Section 3
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-white text-gray-700 data-[state=closed]:hidden">
                All three can be open simultaneously!
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>
        </section>

        {/* Non-collapsible Example */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Non-collapsible (Always one open)</h2>
          <Accordion.Root
            defaultValue={['nc-1']}
            collapsible={false}
            className="space-y-2"
          >
            <Accordion.Item value="nc-1" className="border border-green-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-green-50 hover:bg-green-100 text-left font-medium text-green-900 transition-colors data-[state=open]:bg-green-100">
                Always One Open - Item 1
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-white text-gray-700 data-[state=closed]:hidden">
                You cannot close all items. At least one must remain open.
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="nc-2" className="border border-green-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-green-50 hover:bg-green-100 text-left font-medium text-green-900 transition-colors data-[state=open]:bg-green-100">
                Always One Open - Item 2
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-white text-gray-700 data-[state=closed]:hidden">
                Click to switch. The previous one will close automatically.
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>
        </section>

        {/* Disabled Example */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Disabled Items</h2>
          <Accordion.Root
            defaultValue={['d-1']}
            className="space-y-2"
          >
            <Accordion.Item value="d-1" className="border border-gray-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left font-medium text-gray-900 transition-colors">
                Enabled Item
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-gray-50 text-gray-700 data-[state=closed]:hidden">
                This item works normally.
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="d-2" disabled className="border border-gray-200 rounded-lg overflow-hidden opacity-50">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-white text-left font-medium text-gray-400 cursor-not-allowed">
                Disabled Item (cannot interact)
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-gray-50 text-gray-700 data-[state=closed]:hidden">
                You should not see this.
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="d-3" className="border border-gray-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left font-medium text-gray-900 transition-colors">
                Another Enabled Item
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-gray-50 text-gray-700 data-[state=closed]:hidden">
                Keyboard navigation skips the disabled item above.
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>
        </section>

        {/* Controlled Example */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Controlled</h2>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              Current value: <code className="bg-gray-100 px-2 py-1 rounded">{JSON.stringify(controlledValue)}</code>
            </p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setControlledValue(['item-1'])}
                className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 rounded"
              >
                Open Item 1
              </button>
              <button
                onClick={() => setControlledValue(['item-2'])}
                className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 rounded"
              >
                Open Item 2
              </button>
              <button
                onClick={() => setControlledValue([])}
                className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-800 rounded"
              >
                Close All
              </button>
            </div>
          </div>
          <Accordion.Root
            value={controlledValue}
            onValueChange={setControlledValue}
            className="space-y-2"
          >
            <Accordion.Item value="item-1" className="border border-purple-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 text-left font-medium text-purple-900 transition-colors data-[state=open]:bg-purple-100">
                Controlled Item 1
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-white text-gray-700 data-[state=closed]:hidden">
                State is controlled externally via useState.
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="item-2" className="border border-purple-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 text-left font-medium text-purple-900 transition-colors data-[state=open]:bg-purple-100">
                Controlled Item 2
                <Accordion.ItemIndicator className="transition-transform duration-200 data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="px-4 py-3 bg-white text-gray-700 data-[state=closed]:hidden">
                Use the buttons above to control the accordion programmatically.
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>
        </section>

        {/* Animation Example using usePresence */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">With Animation (usePresence)</h2>
          <p className="text-sm text-gray-600">
            Uses <code className="bg-gray-200 px-1 rounded">data-transition</code> from usePresence:
            starting → idle → ending
          </p>
          <style>{`
            .animated-content {
              display: grid;
              grid-template-rows: 0fr;
              opacity: 0;
              transition: grid-template-rows 300ms ease-out, opacity 300ms ease-out;
            }
            /* 열리는 중 - 시작 상태 명시 */
            .animated-content[data-state="open"][data-transition="starting"] {
              grid-template-rows: 0fr;
              opacity: 0;
            }
            /* 열린 상태 + idle */
            .animated-content[data-state="open"][data-transition="idle"] {
              grid-template-rows: 1fr;
              opacity: 1;
            }
            /* 닫히는 중 */
            .animated-content[data-transition="ending"] {
              grid-template-rows: 0fr;
              opacity: 0;
            }
            .animated-content > div {
              overflow: hidden;
            }
          `}</style>
          <Accordion.Root
            defaultValue={['anim-1']}
            className="space-y-2"
          >
            <Accordion.Item value="anim-1" className="border border-orange-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 text-left font-medium text-orange-900 transition-colors">
                Animated Item 1
                <Accordion.ItemIndicator className="transition-transform duration-300 ease-out data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="animated-content">
                <div>
                  <div className="px-4 py-3 bg-white text-gray-700">
                    This content animates using <strong>usePresence</strong>.
                    <br /><br />
                    Check the <code>data-transition</code> attribute in DevTools:
                    <br />• <code>starting</code> → opening animation
                    <br />• <code>idle</code> → fully open
                    <br />• <code>ending</code> → closing animation (stays mounted until done)
                  </div>
                </div>
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="anim-2" className="border border-orange-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 text-left font-medium text-orange-900 transition-colors">
                Animated Item 2
                <Accordion.ItemIndicator className="transition-transform duration-300 ease-out data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="animated-content">
                <div>
                  <div className="px-4 py-3 bg-white text-gray-700">
                    The key is that <code>usePresence</code> keeps the element mounted
                    during the exit animation (<code>data-transition="ending"</code>).
                    <br /><br />
                    Without usePresence, the element would unmount immediately
                    and you wouldn't see the closing animation.
                  </div>
                </div>
              </Accordion.ItemContent>
            </Accordion.Item>

            <Accordion.Item value="anim-3" className="border border-orange-200 rounded-lg overflow-hidden">
              <Accordion.ItemTrigger className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 text-left font-medium text-orange-900 transition-colors">
                Animated Item 3 (longer content)
                <Accordion.ItemIndicator className="transition-transform duration-300 ease-out data-[state=open]:rotate-180">
                  <ChevronIcon />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="animated-content">
                <div>
                  <div className="px-4 py-3 bg-white text-gray-700">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    <br /><br />
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
                    nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
                    reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
                    pariatur.
                    <br /><br />
                    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
                    officia deserunt mollit anim id est laborum.
                  </div>
                </div>
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>
        </section>

        {/* Keyboard Navigation Info */}
        <section className="p-4 bg-gray-800 text-white rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Keyboard Navigation</h2>
          <ul className="text-sm space-y-1 text-gray-300">
            <li><kbd className="bg-gray-700 px-1 rounded">Enter</kbd> / <kbd className="bg-gray-700 px-1 rounded">Space</kbd> - Toggle focused item</li>
            <li><kbd className="bg-gray-700 px-1 rounded">Arrow Down</kbd> / <kbd className="bg-gray-700 px-1 rounded">Arrow Up</kbd> - Navigate between triggers</li>
            <li><kbd className="bg-gray-700 px-1 rounded">Home</kbd> - Focus first trigger</li>
            <li><kbd className="bg-gray-700 px-1 rounded">End</kbd> - Focus last trigger</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default App
