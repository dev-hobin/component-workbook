import { useState } from 'react'
import Combobox from './index'

const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'blueberry', label: 'Blueberry' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'grape', label: 'Grape' },
  { value: 'kiwi', label: 'Kiwi' },
  { value: 'lemon', label: 'Lemon' },
  { value: 'mango', label: 'Mango' },
  { value: 'orange', label: 'Orange' },
  { value: 'peach', label: 'Peach' },
  { value: 'pear', label: 'Pear' },
  { value: 'strawberry', label: 'Strawberry' },
  { value: 'watermelon', label: 'Watermelon' },
]

const countries = [
  { value: 'kr', label: 'South Korea' },
  { value: 'us', label: 'United States' },
  { value: 'jp', label: 'Japan' },
  { value: 'cn', label: 'China' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'it', label: 'Italy' },
  { value: 'es', label: 'Spain' },
  { value: 'au', label: 'Australia' },
]

// ============================================
// 1. Basic Example (autocomplete="list")
// ============================================

export function BasicExample() {
  const [value, setValue] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">1. Basic Combobox (autocomplete="list")</h3>
      <p className="text-sm text-gray-600">
        Type to filter options. Use arrow keys to navigate, Enter to select.
      </p>

      <div className="w-64">
        <Combobox.Root value={value} onValueChange={setValue}>
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Select a fruit
          </Combobox.Label>
          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search fruits..."
            />
            <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-600">
              <ChevronDownIcon />
            </Combobox.Trigger>
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {fruits.map((fruit) => (
                <Combobox.Option
                  key={fruit.value}
                  value={fruit.value}
                  label={fruit.label}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 aria-selected:bg-blue-100 aria-selected:font-medium"
                >
                  {fruit.label}
                </Combobox.Option>
              ))}
              <Combobox.NoResults>
                <div className="px-3 py-2 text-sm text-gray-500">
                  No fruits found
                </div>
              </Combobox.NoResults>
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="text-sm text-gray-600">
        Selected: <strong>{value ?? 'None'}</strong>
      </div>
    </div>
  )
}

// ============================================
// 2. Open on Focus
// ============================================

export function OpenOnFocusExample() {
  const [value, setValue] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">2. openOnFocus</h3>
      <p className="text-sm text-gray-600">
        The dropdown opens automatically when the input is focused.
      </p>

      <div className="w-64">
        <Combobox.Root value={value} onValueChange={setValue} openOnFocus>
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Select a country
          </Combobox.Label>
          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Click to open..."
            />
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {countries.map((country) => (
                <Combobox.Option
                  key={country.value}
                  value={country.value}
                  label={country.label}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 aria-selected:bg-blue-100"
                >
                  {country.label}
                </Combobox.Option>
              ))}
              <Combobox.NoResults>
                <div className="px-3 py-2 text-sm text-gray-500">
                  No countries found
                </div>
              </Combobox.NoResults>
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="text-sm text-gray-600">
        Selected: <strong>{value ?? 'None'}</strong>
      </div>
    </div>
  )
}

// ============================================
// 3. Autocomplete None (Select Only)
// ============================================

export function AutocompleteNoneExample() {
  const [value, setValue] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">3. autocomplete="none" (Select Only)</h3>
      <p className="text-sm text-gray-600">
        All options are always shown regardless of input. Good for short lists.
      </p>

      <div className="w-64">
        <Combobox.Root
          value={value}
          onValueChange={setValue}
          autocomplete="none"
          openOnFocus
        >
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </Combobox.Label>
          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select priority..."
            />
            <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-600">
              <ChevronDownIcon />
            </Combobox.Trigger>
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              <Combobox.Option
                value="low"
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-green-50 data-[highlighted]:text-green-700"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Low
                </span>
              </Combobox.Option>
              <Combobox.Option
                value="medium"
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-yellow-50 data-[highlighted]:text-yellow-700"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Medium
                </span>
              </Combobox.Option>
              <Combobox.Option
                value="high"
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-orange-50 data-[highlighted]:text-orange-700"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  High
                </span>
              </Combobox.Option>
              <Combobox.Option
                value="urgent"
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Urgent
                </span>
              </Combobox.Option>
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="text-sm text-gray-600">
        Selected: <strong>{value ?? 'None'}</strong>
      </div>
    </div>
  )
}

// ============================================
// 4. Disabled Options
// ============================================

export function DisabledOptionsExample() {
  const [value, setValue] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">4. Disabled Options</h3>
      <p className="text-sm text-gray-600">
        Some options can be disabled and won't be selectable or navigable.
      </p>

      <div className="w-64">
        <Combobox.Root value={value} onValueChange={setValue} openOnFocus>
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Subscription Plan
          </Combobox.Label>
          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select a plan..."
            />
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              <Combobox.Option
                value="free"
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50"
              >
                <div>
                  <div className="font-medium">Free</div>
                  <div className="text-xs text-gray-500">$0/month</div>
                </div>
              </Combobox.Option>
              <Combobox.Option
                value="pro"
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50"
              >
                <div>
                  <div className="font-medium">Pro</div>
                  <div className="text-xs text-gray-500">$9.99/month</div>
                </div>
              </Combobox.Option>
              <Combobox.Option
                value="enterprise"
                disabled
                className="px-3 py-2 cursor-not-allowed opacity-50 data-[disabled]:bg-gray-50"
              >
                <div>
                  <div className="font-medium">Enterprise</div>
                  <div className="text-xs text-gray-500">
                    Contact sales (Coming soon)
                  </div>
                </div>
              </Combobox.Option>
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="text-sm text-gray-600">
        Selected: <strong>{value ?? 'None'}</strong>
      </div>
    </div>
  )
}

// ============================================
// 5. Controlled Input & Value
// ============================================

export function ControlledInputExample() {
  const [value, setValue] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">5. Controlled Input & Value</h3>
      <p className="text-sm text-gray-600">
        Both the selected value and input value are controlled externally.
      </p>

      <div className="w-64">
        <Combobox.Root
          value={value}
          onValueChange={setValue}
          inputValue={inputValue}
          onInputValueChange={setInputValue}
        >
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Search fruits
          </Combobox.Label>
          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Type to search..."
            />
            <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 hover:text-gray-600">
              <ChevronDownIcon />
            </Combobox.Trigger>
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {fruits.map((fruit) => (
                <Combobox.Option
                  key={fruit.value}
                  value={fruit.value}
                  label={fruit.label}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50"
                >
                  {fruit.label}
                </Combobox.Option>
              ))}
              <Combobox.NoResults>
                <div className="px-3 py-2 text-sm text-gray-500">
                  No fruits found
                </div>
              </Combobox.NoResults>
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <div>
          Input value: <strong>"{inputValue}"</strong>
        </div>
        <div>
          Selected: <strong>{value ?? 'None'}</strong>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setInputValue('')}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Clear Input
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(null)
            setInputValue('')
          }}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Reset All
        </button>
      </div>
    </div>
  )
}

// ============================================
// 6. Controlled Open State
// ============================================

export function ControlledOpenExample() {
  const [value, setValue] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">6. Controlled Open State</h3>
      <p className="text-sm text-gray-600">
        The open state is controlled externally. Useful for custom open/close logic.
      </p>

      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Close
        </button>
        <span className="text-sm text-gray-500 self-center">
          isOpen: {open ? 'true' : 'false'}
        </span>
      </div>

      <div className="w-64">
        <Combobox.Root
          value={value}
          onValueChange={setValue}
          open={open}
          onOpenChange={setOpen}
        >
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Select a fruit
          </Combobox.Label>
          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Type or use buttons..."
            />
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {fruits.slice(0, 5).map((fruit) => (
                <Combobox.Option
                  key={fruit.value}
                  value={fruit.value}
                  label={fruit.label}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50"
                >
                  {fruit.label}
                </Combobox.Option>
              ))}
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="text-sm text-gray-600">
        Selected: <strong>{value ?? 'None'}</strong>
      </div>
    </div>
  )
}

// ============================================
// 7. closeOnSelect={false} (Keep Open)
// ============================================

export function KeepOpenExample() {
  const [value, setValue] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">7. closeOnSelect=false (Keep Open)</h3>
      <p className="text-sm text-gray-600">
        Dropdown stays open after selection. Useful for multi-select or quick browsing.
      </p>

      <div className="w-64">
        <Combobox.Root
          value={value}
          onValueChange={(v) => {
            setValue(v)
            if (v) setHistory((h) => [...h, v])
          }}
          closeOnSelect={false}
          openOnFocus
        >
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Browse fruits
          </Combobox.Label>
          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Click multiple times..."
            />
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {fruits.slice(0, 6).map((fruit) => (
                <Combobox.Option
                  key={fruit.value}
                  value={fruit.value}
                  label={fruit.label}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50 aria-selected:bg-blue-100"
                >
                  {fruit.label}
                </Combobox.Option>
              ))}
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="text-sm text-gray-600">
        <div>Current: <strong>{value ?? 'None'}</strong></div>
        <div>History: {history.length > 0 ? history.join(' → ') : 'Empty'}</div>
      </div>
    </div>
  )
}

// ============================================
// 8. clearOnSelect (Tag Input Style)
// ============================================

export function ClearOnSelectExample() {
  const [tags, setTags] = useState<string[]>([])

  const availableFruits = fruits.filter((f) => !tags.includes(f.value))

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">8. clearOnSelect (Tag Input)</h3>
      <p className="text-sm text-gray-600">
        Input clears after selection. Perfect for adding multiple tags.
      </p>

      <div className="w-80">
        <Combobox.Root
          value={null}
          onSelect={(v) => {
            if (!tags.includes(v)) {
              setTags([...tags, v])
            }
          }}
          clearOnSelect
        >
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Add fruits
          </Combobox.Label>

          {/* Tags display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                >
                  {fruits.find((f) => f.value === tag)?.label}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="hover:text-blue-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Type to add..."
            />
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
              {availableFruits.map((fruit) => (
                <Combobox.Option
                  key={fruit.value}
                  value={fruit.value}
                  label={fruit.label}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50"
                >
                  {fruit.label}
                </Combobox.Option>
              ))}
              {availableFruits.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  All fruits added!
                </div>
              )}
              <Combobox.NoResults>
                <div className="px-3 py-2 text-sm text-gray-500">
                  No matching fruits
                </div>
              </Combobox.NoResults>
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="text-sm text-gray-600">
        Tags: {tags.length > 0 ? tags.join(', ') : 'None'}
      </div>
    </div>
  )
}

// ============================================
// 9. loop={false} (No Wrap Navigation)
// ============================================

export function NoLoopExample() {
  const [value, setValue] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">9. loop=false (No Wrap)</h3>
      <p className="text-sm text-gray-600">
        Arrow keys stop at first/last item instead of wrapping around.
      </p>

      <div className="w-64">
        <Combobox.Root
          value={value}
          onValueChange={setValue}
          loop={false}
          openOnFocus
        >
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Navigate with arrows (no loop)
          </Combobox.Label>
          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Try arrow keys..."
            />
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              {fruits.slice(0, 4).map((fruit) => (
                <Combobox.Option
                  key={fruit.value}
                  value={fruit.value}
                  label={fruit.label}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50"
                >
                  {fruit.label}
                </Combobox.Option>
              ))}
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="text-sm text-gray-600">
        Selected: <strong>{value ?? 'None'}</strong>
      </div>
    </div>
  )
}

// ============================================
// 10. onSelect Callback
// ============================================

export function OnSelectExample() {
  const [value, setValue] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">10. onSelect Callback</h3>
      <p className="text-sm text-gray-600">
        Fires when an option is selected. Useful for side effects.
      </p>

      <div className="w-64">
        <Combobox.Root
          value={value}
          onValueChange={setValue}
          onSelect={(v) => {
            const label = fruits.find((f) => f.value === v)?.label ?? v
            setLog((l) => [...l, `Selected: ${label} at ${new Date().toLocaleTimeString()}`])
          }}
          openOnFocus
        >
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Select with logging
          </Combobox.Label>
          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Select to log..."
            />
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
              {fruits.slice(0, 5).map((fruit) => (
                <Combobox.Option
                  key={fruit.value}
                  value={fruit.value}
                  label={fruit.label}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50"
                >
                  {fruit.label}
                </Combobox.Option>
              ))}
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="text-sm">
        <div className="font-medium text-gray-700 mb-1">Event Log:</div>
        <div className="bg-gray-100 rounded p-2 max-h-24 overflow-auto text-xs font-mono">
          {log.length > 0 ? (
            log.map((entry, i) => <div key={i}>{entry}</div>)
          ) : (
            <span className="text-gray-500">No events yet</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 11. defaultOpen
// ============================================

export function DefaultOpenExample() {
  const [value, setValue] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">11. defaultOpen</h3>
      <p className="text-sm text-gray-600">
        Dropdown is open by default when component mounts.
      </p>

      <div className="w-64">
        <Combobox.Root
          value={value}
          onValueChange={setValue}
          defaultOpen
        >
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
            Already open!
          </Combobox.Label>
          <div className="relative">
            <Combobox.Input
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search..."
            />
            <Combobox.Listbox className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              {fruits.slice(0, 4).map((fruit) => (
                <Combobox.Option
                  key={fruit.value}
                  value={fruit.value}
                  label={fruit.label}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 data-[highlighted]:bg-blue-50"
                >
                  {fruit.label}
                </Combobox.Option>
              ))}
            </Combobox.Listbox>
          </div>
        </Combobox.Root>
      </div>

      <div className="text-sm text-gray-600">
        Selected: <strong>{value ?? 'None'}</strong>
      </div>
    </div>
  )
}

// ============================================
// All Examples
// ============================================

export function ComboboxExamples() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Combobox - All Features
          </h1>
          <p className="text-gray-600">
            W3C APG compliant combobox with keyboard navigation and
            autocomplete.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <BasicExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <OpenOnFocusExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <AutocompleteNoneExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <DisabledOptionsExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <ControlledInputExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <ControlledOpenExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <KeepOpenExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <ClearOnSelectExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <NoLoopExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <OnSelectExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <DefaultOpenExample />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">
                  ↓ / ↑
                </kbd>
                <span className="text-gray-600">Navigate options</span>
              </div>
              <div className="flex justify-between">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">
                  Enter
                </kbd>
                <span className="text-gray-600">Select option</span>
              </div>
              <div className="flex justify-between">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
                <span className="text-gray-600">Close dropdown</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">
                  Home
                </kbd>
                <span className="text-gray-600">First option</span>
              </div>
              <div className="flex justify-between">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">End</kbd>
                <span className="text-gray-600">Last option</span>
              </div>
              <div className="flex justify-between">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">
                  Alt + ↓
                </kbd>
                <span className="text-gray-600">Open without selecting</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">API Reference</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Prop</th>
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Default</th>
                  <th className="text-left py-2">Description</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr className="border-b">
                  <td className="py-2 pr-4">value</td>
                  <td className="py-2 pr-4 text-gray-500">string | null</td>
                  <td className="py-2 pr-4">-</td>
                  <td className="py-2 font-sans">Selected value (controlled)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">inputValue</td>
                  <td className="py-2 pr-4 text-gray-500">string</td>
                  <td className="py-2 pr-4">""</td>
                  <td className="py-2 font-sans">Input text (controlled)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">open</td>
                  <td className="py-2 pr-4 text-gray-500">boolean</td>
                  <td className="py-2 pr-4">false</td>
                  <td className="py-2 font-sans">Open state (controlled)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">autocomplete</td>
                  <td className="py-2 pr-4 text-gray-500">"none" | "list" | "inline" | "both"</td>
                  <td className="py-2 pr-4">"list"</td>
                  <td className="py-2 font-sans">Autocomplete behavior</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">openOnFocus</td>
                  <td className="py-2 pr-4 text-gray-500">boolean</td>
                  <td className="py-2 pr-4">false</td>
                  <td className="py-2 font-sans">Open on input focus</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">closeOnSelect</td>
                  <td className="py-2 pr-4 text-gray-500">boolean</td>
                  <td className="py-2 pr-4">true</td>
                  <td className="py-2 font-sans">Close after selection</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">clearOnSelect</td>
                  <td className="py-2 pr-4 text-gray-500">boolean</td>
                  <td className="py-2 pr-4">false</td>
                  <td className="py-2 font-sans">Clear input after selection</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">loop</td>
                  <td className="py-2 pr-4 text-gray-500">boolean</td>
                  <td className="py-2 pr-4">true</td>
                  <td className="py-2 font-sans">Wrap keyboard navigation</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">onSelect</td>
                  <td className="py-2 pr-4 text-gray-500">(value: string) =&gt; void</td>
                  <td className="py-2 pr-4">-</td>
                  <td className="py-2 font-sans">Called on selection</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Icon Component
// ============================================

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
