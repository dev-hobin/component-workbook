/**
 * Phase 1-1 검증: effects에서 send 사용
 *
 * 테스트 항목:
 * 1. useEventMachine - effects에서 send 사용 (타입 체크)
 * 2. createEventMachine (vanilla) - effects에서 send 사용 (타입 체크 + 런타임)
 * 3. 기존 코드 호환성 - helpers 안 써도 동작
 */

import { createEventMachine, useEventMachine } from '../index'
import type { EventMachine } from '../index'

// ============================================
// 테스트 1: createEventMachine (vanilla) - 타입 체크
// ============================================

type TestEvents = {
  OPEN: undefined
  CLOSE: undefined
  DELAYED_OPEN: undefined
  FETCH_SUCCESS: { data: string }
}

type TestContext = {
  isOpen: boolean
  hoveredId: string | null
  setIsOpen: (v: boolean) => void
}

export const vanillaMachine = createEventMachine<
  TestContext,
  TestEvents,
  Record<string, never>,
  'open' | 'close' | 'noop'
>({
  on: {
    OPEN: 'open',
    CLOSE: 'close',
    DELAYED_OPEN: 'open',
    FETCH_SUCCESS: 'noop',
  },

  effects: [
    {
      watch: (ctx) => ctx.hoveredId,
      // enter에서 send 사용 + cleanup 반환
      enter: (_ctx, { send }) => {
        const timer = setTimeout(() => send('DELAYED_OPEN'), 300)
        return () => clearTimeout(timer)
      },
      // exit에서 send 사용
      exit: (_ctx, { send }) => {
        send('CLOSE')
      },
      // change에서 send 사용 + payload 전달
      change: (_ctx, _prev, _curr, { send }) => {
        send('FETCH_SUCCESS', { data: 'test' })
      },
    },
  ],

  actions: {
    open: (ctx) => ctx.setIsOpen(true),
    close: (ctx) => ctx.setIsOpen(false),
    noop: () => {},
  },
})

// ============================================
// 테스트 2: 기존 코드 호환성 - helpers 안 써도 동작
// ============================================

export const compatMachine = createEventMachine<
  TestContext,
  TestEvents,
  Record<string, never>,
  'open' | 'close' | 'noop'
>({
  on: {
    OPEN: 'open',
    CLOSE: 'close',
    DELAYED_OPEN: 'open',
    FETCH_SUCCESS: 'noop',
  },

  effects: [
    {
      watch: (ctx) => ctx.hoveredId,
      // helpers 안 써도 타입 에러 없어야 함
      change: (ctx) => {
        console.log('changed:', ctx.hoveredId)
      },
    },
  ],

  actions: {
    open: (ctx) => ctx.setIsOpen(true),
    close: (ctx) => ctx.setIsOpen(false),
    noop: () => {},
  },
})

// ============================================
// 테스트 3: useEventMachine 타입 체크
// ============================================

// useEventMachine은 React 환경에서만 동작하므로 타입만 체크
type ReactTestMachine = EventMachine<TestContext, TestEvents, Record<string, never>>

const _reactMachineTypeCheck: ReactTestMachine = {
  on: {
    OPEN: 'open',
    CLOSE: 'close',
  },
  effects: [
    {
      watch: (ctx) => ctx.isOpen,
      enter: (_ctx, { send }) => {
        send('OPEN')
      },
      change: (_ctx, _prev, _curr, { send }) => {
        send('CLOSE')
      },
    },
  ],
  actions: {
    open: (ctx) => ctx.setIsOpen(true),
    close: (ctx) => ctx.setIsOpen(false),
  },
}

// ============================================
// 테스트 4: vanilla 런타임 테스트
// ============================================

export function runVanillaTest() {
  const results: string[] = []

  let isOpen = false
  const ctx: TestContext = {
    isOpen,
    hoveredId: null,
    setIsOpen: (v) => {
      isOpen = v
      results.push(`setIsOpen(${v})`)
    },
  }

  // send 테스트
  vanillaMachine.send('OPEN', ctx)
  results.push(`after OPEN: isOpen=${isOpen}`)

  vanillaMachine.send('CLOSE', ctx)
  results.push(`after CLOSE: isOpen=${isOpen}`)

  // evaluate 테스트 (effects 실행)
  ctx.hoveredId = 'item-1'
  vanillaMachine.evaluate(ctx)
  results.push(`after evaluate with hoveredId='item-1'`)

  // cleanup
  vanillaMachine.cleanup()
  results.push('cleanup called')

  return results
}

// 런타임 테스트는 별도로 실행

// useEventMachine 타입 체크용 (실제로 호출하진 않음)
export function _useEventMachineTypeCheck() {
  // 이 함수는 호출되지 않음, 타입 체크만 위해 존재
  const machine: ReactTestMachine = _reactMachineTypeCheck
  const ctx: TestContext = {
    isOpen: false,
    hoveredId: null,
    setIsOpen: () => {},
  }

  // 타입 체크
  const { send: _send, computed: _computed } = useEventMachine(machine, ctx)
}
