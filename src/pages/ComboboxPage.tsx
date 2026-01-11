import {
  BasicExample,
  OpenOnFocusExample,
  AutocompleteNoneExample,
  DisabledOptionsExample,
  ControlledInputExample,
  ControlledOpenExample,
  KeepOpenExample,
  ClearOnSelectExample,
  NoLoopExample,
  OnSelectExample,
} from '../components/combobox/examples'

export default function ComboboxPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Combobox</h1>
        <p className="mt-2 text-gray-600">
          W3C APG compliant combobox with keyboard navigation and autocomplete.
        </p>
      </div>

      {/* Basic Example */}
      <section className="space-y-4">
        <BasicExample />
      </section>

      {/* Open on Focus Example */}
      <section className="space-y-4">
        <OpenOnFocusExample />
      </section>

      {/* Autocomplete None Example */}
      <section className="space-y-4">
        <AutocompleteNoneExample />
      </section>

      {/* Disabled Options Example */}
      <section className="space-y-4">
        <DisabledOptionsExample />
      </section>

      {/* Controlled Input Example */}
      <section className="space-y-4">
        <ControlledInputExample />
      </section>

      {/* Controlled Open Example */}
      <section className="space-y-4">
        <ControlledOpenExample />
      </section>

      {/* Keep Open Example */}
      <section className="space-y-4">
        <KeepOpenExample />
      </section>

      {/* Clear on Select Example */}
      <section className="space-y-4">
        <ClearOnSelectExample />
      </section>

      {/* No Loop Example */}
      <section className="space-y-4">
        <NoLoopExample />
      </section>

      {/* On Select Callback Example */}
      <section className="space-y-4">
        <OnSelectExample />
      </section>

      {/* Keyboard Navigation Info */}
      <section className="p-4 bg-gray-800 text-white rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Keyboard Navigation</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-300 mb-1">Navigation</h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Down</kbd> / <kbd className="bg-gray-700 px-1 rounded">Up</kbd> - Navigate options
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Home</kbd> - First option
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">End</kbd> - Last option
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Alt + Down</kbd> - Open dropdown
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-300 mb-1">Selection</h3>
            <ul className="text-sm space-y-1 text-gray-400">
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> - Select highlighted option
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Tab</kbd> - Select and move focus
              </li>
              <li>
                <kbd className="bg-gray-700 px-1 rounded">Escape</kbd> - Close dropdown
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
