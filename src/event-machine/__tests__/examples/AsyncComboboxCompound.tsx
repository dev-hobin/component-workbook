/**
 * Phase 4 검증: Async Combobox - Compound Component 패턴
 *
 * 검증 항목:
 * 1. Context를 통한 state 공유
 * 2. 렌더링 중 다른 컴포넌트 상태 변경 없음 확인
 * 3. effect에서 setState 호출 시 React 규칙 준수
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type ChangeEvent,
} from 'react'
import { createEventMachine, useEventMachine, type Send } from '../../index'

// ============================================
// Types
// ============================================

type State = 'idle' | 'loading' | 'open'

type Item = {
  id: string
  label: string
}

type Events = {
  INPUT_CHANGE: { value: string }
  FETCH_SUCCESS: { items: Item[] }
  FETCH_ERROR: { error: string }
  SELECT: { item: Item }
  CLOSE: undefined
}

type MachineContext = {
  state: State
  setState: (s: State) => void
  inputValue: string
  setInputValue: (v: string) => void
  items: Item[]
  setItems: (items: Item[]) => void
  selectedItem: Item | null
  setSelectedItem: (item: Item | null) => void
}

// ============================================
// Machine
// ============================================

const comboboxMachine = createEventMachine<{
  input: MachineContext
  events: Events
  actions: 'handleInput' | 'handleFetchSuccess' | 'handleFetchError' | 'handleSelect' | 'handleClose'
  state: State
}>({
  states: {
    idle: {
      on: { INPUT_CHANGE: 'handleInput' },
    },
    loading: {
      on: {
        INPUT_CHANGE: 'handleInput',
        FETCH_SUCCESS: 'handleFetchSuccess',
        FETCH_ERROR: 'handleFetchError',
      },
    },
    open: {
      on: {
        INPUT_CHANGE: 'handleInput',
        SELECT: 'handleSelect',
        CLOSE: 'handleClose',
      },
    },
  },

  effects: [
    {
      watch: (ctx) => ctx.inputValue,
      change: (ctx, _prev, inputValue, { send }) => {
        if (!inputValue) {
          ctx.setState('idle')
          ctx.setItems([])
          return
        }

        ctx.setState('loading')

        const controller = new AbortController()

        const fetchItems = async () => {
          await new Promise((r) => setTimeout(r, 300))
          if (controller.signal.aborted) return

          const mockItems: Item[] = [
            { id: '1', label: `${inputValue} - Option 1` },
            { id: '2', label: `${inputValue} - Option 2` },
            { id: '3', label: `${inputValue} - Option 3` },
          ]

          send('FETCH_SUCCESS', { items: mockItems })
        }

        fetchItems().catch(() => {})

        return () => controller.abort()
      },
    },
  ],

  actions: {
    handleInput: (ctx, payload) => {
      if (!payload) return
      ctx.setInputValue(payload.value)
    },
    handleFetchSuccess: (ctx, payload) => {
      if (!payload) return
      ctx.setItems(payload.items)
      ctx.setState('open')
    },
    handleFetchError: (ctx) => {
      ctx.setItems([])
      ctx.setState('idle')
    },
    handleSelect: (ctx, payload) => {
      if (!payload) return
      ctx.setSelectedItem(payload.item)
      ctx.setInputValue(payload.item.label)
      ctx.setItems([])
      ctx.setState('idle')
    },
    handleClose: (ctx) => {
      ctx.setItems([])
      ctx.setState('idle')
    },
  },
})

// ============================================
// Compound Component Context
// ============================================

type ComboboxContextValue = {
  state: State
  inputValue: string
  items: Item[]
  selectedItem: Item | null
  send: Send<Events>
  inputRef: React.RefObject<HTMLInputElement | null>
}

const ComboboxContext = createContext<ComboboxContextValue | null>(null)

function useCombobox() {
  const ctx = useContext(ComboboxContext)
  if (!ctx) throw new Error('useCombobox must be used within Combobox.Root')
  return ctx
}

// ============================================
// Compound Components
// ============================================

function Root({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>('idle')
  const [inputValue, setInputValue] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { send } = useEventMachine(comboboxMachine, {
    state,
    setState,
    inputValue,
    setInputValue,
    items,
    setItems,
    selectedItem,
    setSelectedItem,
  })

  return (
    <ComboboxContext.Provider
      value={{ state, inputValue, items, selectedItem, send, inputRef }}
    >
      <div style={{ position: 'relative', maxWidth: 300 }}>{children}</div>
    </ComboboxContext.Provider>
  )
}

function Input() {
  const { inputValue, state, send, inputRef } = useCombobox()

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      send('INPUT_CHANGE', { value: e.target.value })
    },
    [send]
  )

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="Search..."
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: 16,
          border: '1px solid #ccc',
          borderRadius: 4,
          boxSizing: 'border-box',
        }}
      />
      {state === 'loading' && (
        <span
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 12,
            color: '#666',
          }}
        >
          Loading...
        </span>
      )}
    </div>
  )
}

function List({ children }: { children: ReactNode }) {
  const { state, items } = useCombobox()

  if (state !== 'open' || items.length === 0) return null

  return (
    <ul
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        margin: 0,
        padding: 0,
        listStyle: 'none',
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderTop: 'none',
        borderRadius: '0 0 4px 4px',
        maxHeight: 200,
        overflow: 'auto',
        zIndex: 10,
      }}
    >
      {children}
    </ul>
  )
}

function Item({ item }: { item: Item }) {
  const { send } = useCombobox()

  return (
    <li
      onClick={() => send('SELECT', { item })}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid #eee',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f0f0f0'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white'
      }}
    >
      {item.label}
    </li>
  )
}

function Selected() {
  const { selectedItem } = useCombobox()

  if (!selectedItem) return null

  return (
    <div style={{ marginTop: 10, fontSize: 14, color: '#666' }}>
      Selected: {selectedItem.label}
    </div>
  )
}

function StateIndicator() {
  const { state } = useCombobox()

  const colors: Record<State, string> = {
    idle: '#f5f5f5',
    loading: '#fff3cd',
    open: '#d4edda',
  }

  return (
    <span
      style={{
        padding: '4px 8px',
        backgroundColor: colors[state],
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      State: {state}
    </span>
  )
}

// ============================================
// Export
// ============================================

export const Combobox = {
  Root,
  Input,
  List,
  Item,
  Selected,
  StateIndicator,
}

// ============================================
// Test Component
// ============================================

export function AsyncComboboxCompoundTest() {
  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h3>Async Combobox - Compound Component</h3>

      <div
        style={{
          marginBottom: 15,
          padding: 12,
          backgroundColor: '#e7f3ff',
          borderRadius: 6,
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <strong>검증 항목:</strong>
        <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>Context를 통한 state 공유</li>
          <li>Input, List, Item이 같은 state 참조</li>
          <li>effect에서 setState → React 에러 없음</li>
          <li>렌더링 중 다른 컴포넌트 상태 변경 없음</li>
          <li>race condition 처리 (빠른 입력)</li>
        </ol>
        <p style={{ margin: '10px 0 0', color: '#666' }}>
          콘솔에서 "Cannot update a component while rendering" 에러 확인
        </p>
      </div>

      <Combobox.Root>
        <div style={{ marginBottom: 10 }}>
          <Combobox.StateIndicator />
        </div>
        <Combobox.Input />
        <Combobox.List>
          <ComboboxItems />
        </Combobox.List>
        <Combobox.Selected />
      </Combobox.Root>
    </div>
  )
}

// items를 렌더링하는 별도 컴포넌트 (Context 사용)
function ComboboxItems() {
  const { items } = useCombobox()
  return (
    <>
      {items.map((item) => (
        <Combobox.Item key={item.id} item={item} />
      ))}
    </>
  )
}

export default AsyncComboboxCompoundTest
