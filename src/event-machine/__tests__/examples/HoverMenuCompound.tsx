/**
 * Phase 4 검증: Compound Component 패턴
 *
 * 검증 항목:
 * 1. Context를 통한 state 공유
 * 2. 여러 컴포넌트에서 같은 machine 사용
 * 3. 컴파운드 패턴에서 effect/cleanup 정상 동작
 */

import { createContext, useContext, useState, type ReactNode } from 'react'
import { createEventMachine, useEventMachine, type Send } from '../../index'

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

type MachineContext = {
  state: State
  setState: (s: State) => void
}

// ============================================
// Machine (동일)
// ============================================

const OPEN_DELAY = 300
const CLOSE_DELAY = 200

const hoverMenuMachine = createEventMachine<{
  input: MachineContext
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
        MOUSE_LEAVE: 'close',
        DELAYED_OPEN: 'open',
        CLICK: 'open',
      },
    },
    open: {
      on: {
        MOUSE_LEAVE: 'startClosing',
        CLICK: 'close',
      },
    },
    closing: {
      on: {
        MOUSE_ENTER: 'cancelClose',
        DELAYED_CLOSE: 'close',
        CLICK: 'close',
      },
    },
  },

  effects: [
    {
      watch: (ctx) => ctx.state === 'hovering',
      enter: (_ctx, { send }) => {
        const timer = setTimeout(() => send('DELAYED_OPEN'), OPEN_DELAY)
        return () => clearTimeout(timer)
      },
    },
    {
      watch: (ctx) => ctx.state === 'closing',
      enter: (_ctx, { send }) => {
        const timer = setTimeout(() => send('DELAYED_CLOSE'), CLOSE_DELAY)
        return () => clearTimeout(timer)
      },
    },
  ],

  actions: {
    startHover: (ctx) => ctx.setState('hovering'),
    open: (ctx) => ctx.setState('open'),
    startClosing: (ctx) => ctx.setState('closing'),
    cancelClose: (ctx) => ctx.setState('open'),
    close: (ctx) => ctx.setState('idle'),
    noop: () => {},
  },
})

// ============================================
// Compound Component Context
// ============================================

type HoverMenuContextValue = {
  state: State
  isOpen: boolean
  send: Send<Events>
}

const HoverMenuContext = createContext<HoverMenuContextValue | null>(null)

function useHoverMenu() {
  const ctx = useContext(HoverMenuContext)
  if (!ctx) throw new Error('useHoverMenu must be used within HoverMenu.Root')
  return ctx
}

// ============================================
// Compound Components
// ============================================

function Root({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>('idle')

  const { send } = useEventMachine(hoverMenuMachine, { state, setState })

  const isOpen = state === 'open' || state === 'closing'

  return (
    <HoverMenuContext.Provider value={{ state, isOpen, send }}>
      <div
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={() => send('MOUSE_ENTER')}
        onMouseLeave={() => send('MOUSE_LEAVE')}
      >
        {children}
      </div>
    </HoverMenuContext.Provider>
  )
}

function Trigger({ children }: { children: ReactNode }) {
  const { isOpen, send } = useHoverMenu()

  return (
    <button
      onClick={() => send('CLICK')}
      style={{
        padding: '12px 24px',
        fontSize: 16,
        cursor: 'pointer',
        backgroundColor: isOpen ? '#0056b3' : '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: 4,
        minWidth: 100,
      }}
    >
      {children}
    </button>
  )
}

function Content({ children }: { children: ReactNode }) {
  const { isOpen } = useHoverMenu()

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        paddingTop: 4,
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
        {children}
      </div>
    </div>
  )
}

function Item({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
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
      {children}
    </div>
  )
}

// ============================================
// Export
// ============================================

export const HoverMenu = {
  Root,
  Trigger,
  Content,
  Item,
}

// ============================================
// Test Component
// ============================================

export function HoverMenuCompoundTest() {
  const [logs, setLogs] = useState<string[]>([])

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev.slice(-9), `[${time}] ${msg}`])
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h3>Compound Component Pattern Test</h3>

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
          <li>Context를 통한 state 공유 정상 동작</li>
          <li>Trigger, Content, Item이 같은 state 참조</li>
          <li>effect (delayed open/close) 정상 동작</li>
          <li>cleanup (타이머 취소) 정상 동작</li>
        </ol>
      </div>

      <div style={{ marginBottom: 20 }}>
        <HoverMenu.Root>
          <HoverMenu.Trigger>Menu</HoverMenu.Trigger>
          <HoverMenu.Content>
            <HoverMenu.Item onClick={() => log('Item 1 clicked')}>
              Item 1
            </HoverMenu.Item>
            <HoverMenu.Item onClick={() => log('Item 2 clicked')}>
              Item 2
            </HoverMenu.Item>
            <HoverMenu.Item onClick={() => log('Item 3 clicked')}>
              Item 3
            </HoverMenu.Item>
          </HoverMenu.Content>
        </HoverMenu.Root>
      </div>

      <div>
        <button onClick={() => setLogs([])} style={{ fontSize: 12 }}>
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
            minHeight: 50,
          }}
        >
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {logs.length === 0 && (
            <div style={{ color: '#999' }}>No logs yet - click menu items</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HoverMenuCompoundTest
