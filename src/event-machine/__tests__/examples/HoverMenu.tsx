/**
 * Phase 4 검증: Hover Menu
 *
 * 새 기능 활용:
 * 1. effects에서 send 사용 (delayed open/close)
 * 2. enter/exit cleanup (timer 취소)
 * 3. states 구조 (idle, hovering, open)
 */

import { useState } from 'react'
import { createEventMachine, useEventMachine } from '../../index'

// ============================================
// Types
// ============================================

type State = 'idle' | 'hovering' | 'open' | 'closing'

type Events = {
  MOUSE_ENTER: undefined
  MOUSE_LEAVE: undefined
  DELAYED_OPEN: undefined
  DELAYED_CLOSE: undefined
  CLICK: undefined
}

type Context = {
  state: State
  setState: (s: State) => void
  log: (msg: string) => void
}

// ============================================
// Machine
// ============================================

const OPEN_DELAY = 300
const CLOSE_DELAY = 200

const hoverMenuMachine = createEventMachine<{
  context: Context
  events: Events
  actions: 'startHover' | 'open' | 'startClosing' | 'close' | 'cancelClose' | 'noop'
  state: State
}>({
  states: {
    idle: {
      on: {
        MOUSE_ENTER: 'startHover',
        CLICK: 'open',
      },
    },
    hovering: {
      on: {
        MOUSE_LEAVE: 'close', // hovering 중 leave → 바로 닫기
        DELAYED_OPEN: 'open',
        CLICK: 'open',
      },
    },
    open: {
      on: {
        MOUSE_LEAVE: 'startClosing', // open → closing 전환
        CLICK: 'close',
      },
    },
    closing: {
      on: {
        MOUSE_ENTER: 'cancelClose', // closing 중 다시 enter → open 유지
        DELAYED_CLOSE: 'close',
        CLICK: 'close',
      },
    },
  },

  effects: [
    {
      // hovering 상태 진입 → 300ms 후 DELAYED_OPEN
      watch: (ctx) => ctx.state === 'hovering',
      enter: (ctx, { send }) => {
        ctx.log(`effect: hovering 진입 → ${OPEN_DELAY}ms 후 open 예정`)
        const timer = setTimeout(() => {
          ctx.log('effect: DELAYED_OPEN 발송')
          send('DELAYED_OPEN')
        }, OPEN_DELAY)

        return () => {
          ctx.log('effect: hovering 타이머 취소')
          clearTimeout(timer)
        }
      },
    },
    {
      // closing 상태 진입 → 200ms 후 DELAYED_CLOSE
      watch: (ctx) => ctx.state === 'closing',
      enter: (ctx, { send }) => {
        ctx.log(`effect: closing 진입 → ${CLOSE_DELAY}ms 후 close 예정`)
        const timer = setTimeout(() => {
          ctx.log('effect: DELAYED_CLOSE 발송')
          send('DELAYED_CLOSE')
        }, CLOSE_DELAY)

        return () => {
          ctx.log('effect: closing 타이머 취소')
          clearTimeout(timer)
        }
      },
    },
  ],

  actions: {
    startHover: (ctx) => {
      ctx.log('action: startHover (→ hovering)')
      ctx.setState('hovering')
    },

    open: (ctx) => {
      ctx.log('action: open (→ open)')
      ctx.setState('open')
    },

    startClosing: (ctx) => {
      ctx.log('action: startClosing (→ closing)')
      ctx.setState('closing')
    },

    cancelClose: (ctx) => {
      ctx.log('action: cancelClose (→ open)')
      ctx.setState('open')
    },

    close: (ctx) => {
      ctx.log('action: close (→ idle)')
      ctx.setState('idle')
    },

    noop: () => {},
  },
})

// ============================================
// Component
// ============================================

export function HoverMenu() {
  const [state, setState] = useState<State>('idle')
  const [logs, setLogs] = useState<string[]>([])

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev.slice(-9), `[${time}] ${msg}`])
  }

  const ctx: Context = {
    state,
    setState,
    log,
  }

  const { send, state: machineState } = useEventMachine(hoverMenuMachine, ctx)

  const stateColors: Record<State, string> = {
    idle: '#f5f5f5',
    hovering: '#fff3cd',
    open: '#d4edda',
    closing: '#f8d7da',
  }

  const isMenuVisible = state === 'open' || state === 'closing'

  const clearLogs = () => setLogs([])

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h3>Hover Menu</h3>

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
          <li>버튼 위에 마우스 올리기 → <b>hovering</b> 상태 확인</li>
          <li>{OPEN_DELAY}ms 대기 → <b>open</b> 상태 + 메뉴 표시</li>
          <li>hovering 중 마우스 떼기 (빠르게) → 타이머 취소, idle로 복귀</li>
          <li>open 상태에서 마우스 떼기 → {CLOSE_DELAY}ms 후 닫힘</li>
          <li>메뉴 위로 마우스 이동 → 닫히지 않음 (유지)</li>
          <li>버튼 클릭 → 즉시 열기/닫기</li>
        </ol>
      </div>

      <div
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={() => send('MOUSE_ENTER')}
        onMouseLeave={() => send('MOUSE_LEAVE')}
      >
        <button
          onClick={() => send('CLICK')}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            cursor: 'pointer',
            backgroundColor: isMenuVisible ? '#0056b3' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            minWidth: 100, // 너비 고정으로 레이아웃 시프트 방지
          }}
        >
          Menu {state === 'hovering' && '...'}
        </button>

        {isMenuVisible && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              paddingTop: 4, // gap 대신 padding으로 연결
              backgroundColor: 'transparent',
              minWidth: 150,
              zIndex: 10,
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <div
                style={{
                  padding: '8px 16px',
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
                Item 1
              </div>
              <div
                style={{
                  padding: '8px 16px',
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
                Item 2
              </div>
              <div
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
              >
                Item 3
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={clearLogs} style={{ fontSize: 12 }}>
          Clear Logs
        </button>
        <div
          style={{
            marginTop: 10,
            padding: 10,
            backgroundColor: '#f9f9f9',
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'monospace',
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          {logs.length === 0 && (
            <div style={{ color: '#999' }}>No logs yet</div>
          )}
        </div>
      </div>

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
          <li>effects에서 send (delayed open)</li>
          <li>enter cleanup (타이머 취소)</li>
          <li>change cleanup (close 타이머 취소)</li>
          <li>states 구조 (idle/hovering/open)</li>
        </ul>
      </div>
    </div>
  )
}

export default HoverMenu
