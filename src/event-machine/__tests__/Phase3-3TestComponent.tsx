/**
 * Phase 3-3 React 런타임 테스트 컴포넌트
 *
 * 핵심 검증: useEventMachine이 { send, computed, state } 반환
 *
 * 테스트 항목:
 * 1. state가 ctx.state에서 올바르게 추출됨
 * 2. 외부 state 변경 시 반환 state도 업데이트됨
 * 3. state-based 핸들러가 반환된 state 기준으로 동작
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
  'startLoading' | 'open' | 'close',
  State
>({
  states: {
    idle: {
      on: {
        OPEN: 'startLoading',
      },
    },
    loading: {
      on: {
        OPEN: 'open',
      },
    },
    open: {
      on: {
        CLOSE: 'close',
      },
    },
  },
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
  },
})

// ============================================
// 테스트 컴포넌트
// ============================================

export function TestPhase3_3Component() {
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

  // 핵심 검증: state가 반환됨
  const { send, state: returnedState } = useEventMachine(stateMachine, ctx)

  const handleOpen = () => {
    log(`UI: OPEN clicked (ctx.state: ${state}, returned: ${returnedState})`)
    send('OPEN')
  }

  const handleClose = () => {
    log(`UI: CLOSE clicked (ctx.state: ${state}, returned: ${returnedState})`)
    send('CLOSE')
  }

  const clearLogs = () => setLogs([])

  const stateColors: Record<State, string> = {
    idle: '#ccc',
    loading: '#f0ad4e',
    open: '#5cb85c',
  }

  // 검증: ctx.state와 returnedState가 일치해야 함
  const isStateMatch = state === returnedState

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>Phase 3-3 React Runtime Test: State Return Value</h2>

      <div style={{ marginBottom: 20 }}>
        <p>
          <strong>핵심 검증:</strong> useEventMachine이 &#123; send, computed, state &#125; 반환
        </p>
        <p>
          <strong>테스트 방법:</strong>
        </p>
        <ol>
          <li>state 박스에서 ctx.state와 returned state가 일치하는지 확인</li>
          <li>이벤트 버튼 클릭 후 state 변경 확인</li>
          <li>외부 변경 버튼으로 state 직접 변경 후 returned state 동기화 확인</li>
        </ol>
      </div>

      <div
        style={{
          marginBottom: 20,
          padding: 20,
          backgroundColor: stateColors[state],
          borderRadius: 8,
          textAlign: 'center',
          fontSize: 18,
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <strong>ctx.state:</strong> {state}
        </div>
        <div style={{ marginBottom: 10 }}>
          <strong>returned state:</strong> {returnedState ?? 'undefined'}
        </div>
        <div
          style={{
            padding: 5,
            backgroundColor: isStateMatch ? '#5cb85c' : '#d9534f',
            color: 'white',
            borderRadius: 4,
          }}
        >
          {isStateMatch ? 'MATCH' : 'MISMATCH'}
        </div>
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

export default TestPhase3_3Component
