/**
 * Phase 4 검증: Async Combobox
 *
 * 새 기능 활용:
 * 1. effects에서 send 사용 (비동기 fetch 후 이벤트 발송)
 * 2. change cleanup (race condition 처리)
 * 3. states 구조 (idle, loading, open)
 */

import { useState, useCallback, useRef } from 'react'
import { createEventMachine, useEventMachine } from '../../index'

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
  FOCUS: undefined
  BLUR: undefined
}

type Context = {
  state: State
  setState: (s: State) => void
  inputValue: string
  setInputValue: (v: string) => void
  items: Item[]
  setItems: (items: Item[]) => void
  selectedItem: Item | null
  setSelectedItem: (item: Item | null) => void
  error: string | null
  setError: (e: string | null) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

// ============================================
// Machine
// ============================================

const comboboxMachine = createEventMachine<{
  input: Context
  events: Events
  actions:
    | 'handleInput'
    | 'handleFetchSuccess'
    | 'handleFetchError'
    | 'handleSelect'
    | 'handleClose'
    | 'handleFocus'
    | 'handleBlur'
    | 'noop'
  state: State
}>({
  // 전역 핸들러 (모든 state에서)
  on: {
    FOCUS: 'handleFocus',
    BLUR: 'handleBlur',
  },

  // state별 핸들러
  states: {
    idle: {
      on: {
        INPUT_CHANGE: 'handleInput',
      },
    },
    loading: {
      on: {
        INPUT_CHANGE: 'handleInput', // 입력 변경 시 재요청
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

  // inputValue 변경 시 fetch
  effects: [
    {
      watch: (ctx) => ctx.inputValue,
      change: (ctx, _prev, inputValue, { send }) => {
        // 빈 입력이면 idle로
        if (!inputValue) {
          ctx.setState('idle')
          ctx.setItems([])
          return
        }

        // loading 상태로 전환
        ctx.setState('loading')

        // AbortController로 race condition 처리
        const controller = new AbortController()

        // 가짜 API (300ms 딜레이)
        const fetchItems = async () => {
          await new Promise((r) => setTimeout(r, 300))

          // 취소됐으면 무시
          if (controller.signal.aborted) return

          // 가짜 데이터
          const mockItems: Item[] = [
            { id: '1', label: `${inputValue} - Option 1` },
            { id: '2', label: `${inputValue} - Option 2` },
            { id: '3', label: `${inputValue} - Option 3` },
          ]

          send('FETCH_SUCCESS', { items: mockItems })
        }

        fetchItems().catch((err) => {
          if (!controller.signal.aborted) {
            send('FETCH_ERROR', { error: err.message || 'Fetch failed' })
          }
        })

        // cleanup: 다음 change 전에 이전 요청 취소
        return () => controller.abort()
      },
    },
  ],

  actions: {
    handleInput: (ctx, payload) => {
      if (!payload) return
      ctx.setInputValue(payload.value)
      ctx.setError(null)
      // state 전환은 effect에서 처리
    },

    handleFetchSuccess: (ctx, payload) => {
      if (!payload) return
      ctx.setItems(payload.items)
      ctx.setState('open')
    },

    handleFetchError: (ctx, payload) => {
      if (!payload) return
      ctx.setError(payload.error)
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

    handleFocus: () => {
      // focus 시 특별한 동작 없음 (inputValue 변경 시 effect가 처리)
    },

    handleBlur: (ctx) => {
      // 약간의 딜레이 후 닫기 (클릭 허용)
      setTimeout(() => {
        if (ctx.state === 'open') {
          ctx.setItems([])
          ctx.setState('idle')
        }
      }, 150)
    },

    noop: () => {},
  },
})

// ============================================
// Component
// ============================================

export function AsyncCombobox() {
  const [state, setState] = useState<State>('idle')
  const [inputValue, setInputValue] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { send, state: machineState } = useEventMachine(comboboxMachine, {
    state,
    setState,
    inputValue,
    setInputValue,
    items,
    setItems,
    selectedItem,
    setSelectedItem,
    error,
    setError,
    inputRef,
  })

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      send('INPUT_CHANGE', { value: e.target.value })
    },
    [send],
  )

  const handleItemClick = useCallback(
    (item: Item) => {
      send('SELECT', { item })
    },
    [send],
  )

  const stateColors: Record<State, string> = {
    idle: '#f5f5f5',
    loading: '#fff3cd',
    open: '#d4edda',
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 400 }}>
      <h3>Async Combobox</h3>

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
        <strong>테스트 방법:</strong>
        <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>입력창에 아무 글자나 입력 → <b>Loading...</b> 표시 확인</li>
          <li>300ms 후 드롭다운 목록 표시 확인</li>
          <li>빠르게 여러 글자 입력 → race condition 없이 마지막 결과만 표시</li>
          <li>목록에서 항목 클릭 → 선택됨 표시</li>
          <li>입력 전체 삭제 → idle 상태로 복귀</li>
        </ol>
      </div>

      <div style={{ marginBottom: 10 }}>
        <span
          style={{
            padding: '4px 8px',
            backgroundColor: stateColors[state],
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          State: {machineState}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => send('FOCUS')}
          onBlur={() => send('BLUR')}
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
          <div
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
          </div>
        )}

        {state === 'open' && items.length > 0 && (
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
            {items.map((item) => (
              <li
                key={item.id}
                onClick={() => handleItemClick(item)}
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
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div style={{ color: 'red', marginTop: 10, fontSize: 14 }}>{error}</div>
      )}

      {selectedItem && (
        <div style={{ marginTop: 10, fontSize: 14, color: '#666' }}>
          Selected: {selectedItem.label}
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          padding: 10,
          backgroundColor: '#f9f9f9',
          borderRadius: 4,
          fontSize: 12,
        }}
      >
        <strong>Features demonstrated:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
          <li>effects에서 send (비동기 fetch)</li>
          <li>change cleanup (race condition 방지)</li>
          <li>states 구조 (idle/loading/open)</li>
        </ul>
      </div>
    </div>
  )
}

export default AsyncCombobox
