/**
 * Phase 1-1 React 런타임 테스트 컴포넌트
 *
 * 테스트 항목:
 * 1. effects enter에서 send 사용 (delayed transition)
 * 2. effects change에서 send 사용
 * 3. cleanup 동작 확인
 */

import { useState, useCallback } from 'react'
import { createEventMachine, useEventMachine } from '../index'

// ============================================
// Machine 정의
// ============================================

type Events = {
  HOVER: undefined
  UNHOVER: undefined
  DELAYED_OPEN: undefined
  CLOSE: undefined
}

type Context = {
  isOpen: boolean
  isHovered: boolean
  setIsOpen: (v: boolean) => void
  setIsHovered: (v: boolean) => void
  log: (msg: string) => void
}

const testMachine = createEventMachine<
  Context,
  Events,
  Record<string, never>,
  'setHovered' | 'setUnhovered' | 'open' | 'close' | 'noop'
>({
  on: {
    HOVER: 'setHovered',
    UNHOVER: 'setUnhovered',
    DELAYED_OPEN: 'open',
    CLOSE: 'close',
  },

  effects: [
    {
      watch: (ctx) => ctx.isHovered,
      // enter: hover 시 300ms 후 DELAYED_OPEN
      enter: (ctx, { send }) => {
        ctx.log('effect enter: starting 300ms timer')
        const timer = setTimeout(() => {
          ctx.log('effect enter: timer fired, sending DELAYED_OPEN')
          send('DELAYED_OPEN')
        }, 300)
        return () => {
          ctx.log('effect cleanup: clearing timer')
          clearTimeout(timer)
        }
      },
      // exit: unhover 시 CLOSE + fade-out animation
      exit: (ctx, { send }) => {
        ctx.log('effect exit: sending CLOSE')
        send('CLOSE')

        // fade-out animation (500ms)
        ctx.log('effect exit: starting fade-out animation')
        const timer = setTimeout(() => {
          ctx.log('effect exit: fade-out complete')
        }, 500)

        return () => {
          ctx.log('effect exit cleanup: cancelled fade-out')
          clearTimeout(timer)
        }
      },
    },
  ],

  actions: {
    setHovered: (ctx) => {
      ctx.log('action: setHovered')
      ctx.setIsHovered(true)
    },
    setUnhovered: (ctx) => {
      ctx.log('action: setUnhovered')
      ctx.setIsHovered(false)
    },
    open: (ctx) => {
      ctx.log('action: open')
      ctx.setIsOpen(true)
    },
    close: (ctx) => {
      ctx.log('action: close')
      ctx.setIsOpen(false)
    },
    noop: () => {},
  },
})

// ============================================
// 테스트 컴포넌트
// ============================================

export function TestPhase1Component() {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const log = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`])
  }, [])

  const ctx: Context = {
    isOpen,
    isHovered,
    setIsOpen,
    setIsHovered,
    log,
  }

  const { send } = useEventMachine(testMachine, ctx)

  const handleMouseEnter = () => {
    log('UI: mouseenter')
    send('HOVER')
  }

  const handleMouseLeave = () => {
    log('UI: mouseleave')
    send('UNHOVER')
  }

  const clearLogs = () => setLogs([])

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>Phase 1-1 React Runtime Test</h2>

      <div style={{ marginBottom: 20 }}>
        <p><strong>테스트 방법:</strong></p>
        <ol>
          <li>박스에 마우스를 올리면 300ms 후 "Open!" 표시</li>
          <li>300ms 전에 마우스를 빼면 enter 타이머 취소 (enter cleanup)</li>
          <li>마우스를 빼면 닫힘 + fade-out 시작 (exit)</li>
          <li>500ms 내에 다시 hover → fade-out 취소 (exit cleanup)</li>
        </ol>
      </div>

      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: 200,
          height: 100,
          backgroundColor: isHovered ? '#4a90d9' : '#ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          marginBottom: 20,
        }}
      >
        {isOpen ? '🎉 Open!' : 'Hover me (300ms)'}
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong>State:</strong> isHovered={String(isHovered)}, isOpen={String(isOpen)}
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

export default TestPhase1Component
