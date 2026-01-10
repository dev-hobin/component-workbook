/**
 * Phase 3-2 React 런타임 테스트 컴포넌트
 *
 * 테스트 항목:
 * 1. state별 핸들러가 먼저 실행됨
 * 2. 전역 핸들러가 나중에 실행됨
 * 3. 둘 다 있으면 둘 다 실행
 * 4. state에 핸들러 없으면 전역만 실행
 */

import { useState, useCallback } from 'react'
import { createEventMachine, useEventMachine } from '../index'

// ============================================
// Machine 정의
// ============================================

type State = 'idle' | 'loading' | 'open'

type Events = {
  OPEN: undefined
  CLOSE: undefined
  FOCUS: undefined
}

type Context = {
  state: State
  setState: (s: State) => void
  log: (msg: string) => void
}

const stateMachine = createEventMachine<
  Context,
  Events,
  Record<string, never>,
  'open' | 'close' | 'startLoading' | 'focus' | 'noop',
  State
>({
  // 전역 핸들러
  on: {
    FOCUS: 'focus',
  },

  // 상태별 핸들러
  states: {
    idle: {
      on: {
        OPEN: 'startLoading',
      },
    },
    loading: {
      on: {
        OPEN: 'open', // loading에서 OPEN → open
      },
    },
    open: {
      on: {
        CLOSE: 'close',
      },
    },
  },

  // state 변경 감지 effect
  effects: [
    {
      watch: (ctx) => ctx.state,
      change: (ctx, prev, curr) => {
        ctx.log(`effect: state changed ${prev} → ${curr}`)
      },
    },
  ],

  actions: {
    startLoading: (ctx) => {
      ctx.log('action: startLoading (idle → loading)')
      ctx.setState('loading')
    },
    open: (ctx) => {
      ctx.log('action: open (loading → open)')
      ctx.setState('open')
    },
    close: (ctx) => {
      ctx.log('action: close (open → idle)')
      ctx.setState('idle')
    },
    focus: (ctx) => {
      ctx.log(`action: focus (global, current state: ${ctx.state})`)
    },
    noop: () => {},
  },
})

// ============================================
// 테스트 컴포넌트
// ============================================

export function TestPhase3_2Component() {
  const [state, setState] = useState<State>('idle')
  const [logs, setLogs] = useState<string[]>([])

  const log = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`])
  }, [])

  const ctx: Context = {
    state,
    setState,
    log,
  }

  const { send } = useEventMachine(stateMachine, ctx)

  const handleOpen = () => {
    log(`UI: OPEN clicked (current state: ${state})`)
    send('OPEN')
  }

  const handleClose = () => {
    log(`UI: CLOSE clicked (current state: ${state})`)
    send('CLOSE')
  }

  const handleFocus = () => {
    log(`UI: FOCUS clicked (current state: ${state})`)
    send('FOCUS')
  }

  const clearLogs = () => setLogs([])

  const stateColors: Record<State, string> = {
    idle: '#ccc',
    loading: '#f0ad4e',
    open: '#5cb85c',
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>Phase 3-2 React Runtime Test: States Execution</h2>

      <div style={{ marginBottom: 20 }}>
        <p>
          <strong>테스트 방법:</strong>
        </p>
        <ol>
          <li>idle에서 OPEN → loading으로 전이</li>
          <li>loading에서 OPEN → open으로 전이</li>
          <li>open에서 CLOSE → idle로 전이</li>
          <li>어느 상태에서든 FOCUS → 전역 핸들러 실행</li>
          <li><strong>외부 변경:</strong> 버튼으로 state 직접 변경 후 이벤트 테스트</li>
        </ol>
      </div>

      <div
        style={{
          marginBottom: 20,
          padding: 20,
          backgroundColor: stateColors[state],
          borderRadius: 8,
          textAlign: 'center',
          fontSize: 24,
          fontWeight: 'bold',
        }}
      >
        State: {state}
      </div>

      <div style={{ marginBottom: 10, display: 'flex', gap: 10 }}>
        <span style={{ lineHeight: '40px' }}>Events:</span>
        <button
          onClick={handleOpen}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          OPEN
        </button>
        <button
          onClick={handleClose}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          CLOSE
        </button>
        <button
          onClick={handleFocus}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          FOCUS
        </button>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <span style={{ lineHeight: '40px' }}>외부 변경:</span>
        <button
          onClick={() => {
            log('EXTERNAL: state → idle')
            setState('idle')
          }}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            cursor: 'pointer',
            backgroundColor: '#ffcccc',
          }}
        >
          → idle
        </button>
        <button
          onClick={() => {
            log('EXTERNAL: state → loading')
            setState('loading')
          }}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            cursor: 'pointer',
            backgroundColor: '#ffcccc',
          }}
        >
          → loading
        </button>
        <button
          onClick={() => {
            log('EXTERNAL: state → open')
            setState('open')
          }}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            cursor: 'pointer',
            backgroundColor: '#ffcccc',
          }}
        >
          → open
        </button>
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

export default TestPhase3_2Component
