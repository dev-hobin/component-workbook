/**
 * Phase 1-2 React 런타임 테스트 컴포넌트
 *
 * 테스트 항목:
 * 1. change에서 cleanup 함수 반환 (debounce/취소 패턴)
 * 2. 다음 change 전에 이전 cleanup 호출
 * 3. 비동기 취소 패턴 (AbortController)
 */

import { useState, useCallback } from 'react'
import { createEventMachine, useEventMachine } from '../index'

// ============================================
// Machine 정의
// ============================================

type Events = {
  UPDATE: { value: string }
  FETCH_SUCCESS: { data: string }
  FETCH_ERROR: undefined
}

type Context = {
  inputValue: string
  result: string | null
  setInputValue: (v: string) => void
  setResult: (v: string | null) => void
  log: (msg: string) => void
}

const searchMachine = createEventMachine<
  Context,
  Events,
  Record<string, never>,
  'updateInput' | 'setResult' | 'clearResult' | 'noop'
>({
  on: {
    UPDATE: 'updateInput',
    FETCH_SUCCESS: 'setResult',
    FETCH_ERROR: 'clearResult',
  },

  effects: [
    {
      watch: (ctx) => ctx.inputValue,
      // change에서 cleanup 반환 - debounce + 비동기 취소 패턴
      change: (ctx, _prev, curr, { send }) => {
        ctx.log(`change: inputValue changed to "${curr}"`)

        // 빈 값이면 fetch 안 함
        if (!curr) {
          ctx.log('change: empty value, skipping fetch')
          return
        }

        // AbortController로 비동기 취소
        const controller = new AbortController()

        // debounce: 500ms 후 fetch
        ctx.log(`change: starting 500ms debounce for "${curr}"`)
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            ctx.log(`change: debounce complete, fetching for "${curr}"`)

            // 가상의 fetch (500ms 추가 지연)
            setTimeout(() => {
              if (!controller.signal.aborted) {
                ctx.log(`change: fetch success for "${curr}"`)
                send('FETCH_SUCCESS', { data: `Results for "${curr}"` })
              } else {
                ctx.log(`change: fetch was aborted for "${curr}"`)
              }
            }, 500)
          }
        }, 500)

        // cleanup 반환 - 다음 change 전에 호출됨
        return () => {
          ctx.log(`cleanup: aborting fetch for "${curr}"`)
          controller.abort()
          clearTimeout(timeoutId)
        }
      },
    },
  ],

  actions: {
    updateInput: (ctx, payload) => {
      if (payload) {
        ctx.log(`action: updateInput to "${payload.value}"`)
        ctx.setInputValue(payload.value)
      }
    },
    setResult: (ctx, payload) => {
      if (payload) {
        ctx.log(`action: setResult to "${payload.data}"`)
        ctx.setResult(payload.data)
      }
    },
    clearResult: (ctx) => {
      ctx.log('action: clearResult')
      ctx.setResult(null)
    },
    noop: () => {},
  },
})

// ============================================
// 테스트 컴포넌트
// ============================================

export function TestPhase1_2Component() {
  const [inputValue, setInputValue] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const log = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`])
  }, [])

  const ctx: Context = {
    inputValue,
    result,
    setInputValue,
    setResult,
    log,
  }

  const { send } = useEventMachine(searchMachine, ctx)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    log(`UI: input changed to "${value}"`)
    send('UPDATE', { value })
  }

  const clearLogs = () => setLogs([])

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>Phase 1-2 React Runtime Test: Change Cleanup</h2>

      <div style={{ marginBottom: 20 }}>
        <p>
          <strong>테스트 방법:</strong>
        </p>
        <ol>
          <li>입력창에 텍스트 입력 (debounce 500ms + fetch 500ms)</li>
          <li>빠르게 연속 입력하면 이전 요청이 취소됨 (cleanup)</li>
          <li>1초 대기하면 결과 표시</li>
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
            width: 300,
            border: '2px solid #ccc',
            borderRadius: 4,
          }}
        />
      </div>

      <div
        style={{
          marginBottom: 20,
          padding: 15,
          backgroundColor: result ? '#e8f5e9' : '#f5f5f5',
          borderRadius: 4,
          minHeight: 40,
        }}
      >
        <strong>Result:</strong>{' '}
        {result || <span style={{ color: '#999' }}>No results yet</span>}
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong>State:</strong> inputValue="{inputValue}"
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

export default TestPhase1_2Component
