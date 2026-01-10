/**
 * Phase 2-1 React 런타임 테스트 컴포넌트
 *
 * 테스트 항목:
 * 1. 복합 watch (배열) - 요소 중 하나라도 변경 시 트리거
 * 2. 같은 값이면 트리거 안 됨 (shallowEqual)
 */

import { useState, useCallback } from 'react'
import { createEventMachine, useEventMachine } from '../index'

// ============================================
// Machine 정의
// ============================================

type Events = {
  SET_INPUT: { value: string }
  SET_MODE: { mode: 'search' | 'filter' }
  SEARCH_TRIGGERED: { input: string; mode: string }
}

type Context = {
  inputValue: string
  mode: 'search' | 'filter'
  setInputValue: (v: string) => void
  setMode: (m: 'search' | 'filter') => void
  log: (msg: string) => void
}

const compositeWatchMachine = createEventMachine<
  Context,
  Events,
  Record<string, never>,
  'setInput' | 'setMode' | 'logSearch' | 'noop'
>({
  on: {
    SET_INPUT: 'setInput',
    SET_MODE: 'setMode',
    SEARCH_TRIGGERED: 'logSearch',
  },

  effects: [
    {
      // 복합 watch - inputValue 또는 mode 변경 시 트리거
      watch: (ctx) => [ctx.inputValue, ctx.mode] as const,
      change: (ctx, prev, curr, { send }) => {
        ctx.log(`change: [${prev?.[0]}, ${prev?.[1]}] → [${curr[0]}, ${curr[1]}]`)

        // 빈 입력은 무시
        if (!curr[0]) return

        // 검색 트리거 (debounce 없이 즉시)
        send('SEARCH_TRIGGERED', { input: curr[0], mode: curr[1] })
      },
    },
  ],

  actions: {
    setInput: (ctx, payload) => {
      if (payload) {
        ctx.log(`action: setInput to "${payload.value}"`)
        ctx.setInputValue(payload.value)
      }
    },
    setMode: (ctx, payload) => {
      if (payload) {
        ctx.log(`action: setMode to "${payload.mode}"`)
        ctx.setMode(payload.mode)
      }
    },
    logSearch: (ctx, payload) => {
      if (payload) {
        ctx.log(`action: search triggered - input="${payload.input}", mode="${payload.mode}"`)
      }
    },
    noop: () => {},
  },
})

// ============================================
// 테스트 컴포넌트
// ============================================

export function TestPhase2_1Component() {
  const [inputValue, setInputValue] = useState('')
  const [mode, setMode] = useState<'search' | 'filter'>('search')
  const [logs, setLogs] = useState<string[]>([])

  const log = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`])
  }, [])

  const ctx: Context = {
    inputValue,
    mode,
    setInputValue,
    setMode,
    log,
  }

  const { send } = useEventMachine(compositeWatchMachine, ctx)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    log(`UI: input changed to "${value}"`)
    send('SET_INPUT', { value })
  }

  const handleModeChange = (newMode: 'search' | 'filter') => {
    log(`UI: mode changed to "${newMode}"`)
    send('SET_MODE', { mode: newMode })
  }

  const clearLogs = () => setLogs([])

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>Phase 2-1 React Runtime Test: Composite Watch</h2>

      <div style={{ marginBottom: 20 }}>
        <p>
          <strong>테스트 방법:</strong>
        </p>
        <ol>
          <li>입력창에 텍스트 입력 → change 트리거</li>
          <li>모드 버튼 클릭 → change 트리거</li>
          <li>같은 모드 버튼 다시 클릭 → change 트리거 안 됨</li>
        </ol>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Search..."
          style={{
            padding: '8px 12px',
            fontSize: 16,
            width: 200,
            border: '2px solid #ccc',
            borderRadius: 4,
            marginRight: 10,
          }}
        />
        <button
          onClick={() => handleModeChange('search')}
          style={{
            padding: '8px 16px',
            backgroundColor: mode === 'search' ? '#4a90d9' : '#ccc',
            color: mode === 'search' ? 'white' : 'black',
            border: 'none',
            borderRadius: 4,
            marginRight: 5,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
        <button
          onClick={() => handleModeChange('filter')}
          style={{
            padding: '8px 16px',
            backgroundColor: mode === 'filter' ? '#4a90d9' : '#ccc',
            color: mode === 'filter' ? 'white' : 'black',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Filter
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong>State:</strong> inputValue="{inputValue}", mode="{mode}"
      </div>

      <button onClick={clearLogs} style={{ marginBottom: 10 }}>
        Clear Logs
      </button>

      <div
        style={{
          backgroundColor: '#f5f5f5',
          padding: 10,
          maxHeight: 300,
          overflow: 'auto',
          fontSize: 12,
        }}
      >
        <strong>Logs:</strong>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
        {logs.length === 0 && <div style={{ color: '#999' }}>No logs yet</div>}
      </div>
    </div>
  )
}

export default TestPhase2_1Component
