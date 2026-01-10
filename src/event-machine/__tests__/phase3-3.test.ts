/**
 * Phase 3-3 검증: 반환값에 state 추가
 *
 * 테스트 항목:
 * 1. useEventMachine - { send, computed, state } 반환
 * 2. state 없는 context - state가 undefined
 * 3. state 있는 context - state 값 반환
 */

import { createEventMachine, useEventMachine } from '../index'
import type { EventMachine } from '../index'

// ============================================
// 테스트 1: state 없는 context (기존 호환성)
// ============================================

type NoStateEvents = {
  TOGGLE: undefined
}

type NoStateContext = {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
}

export const noStateMachine = createEventMachine<
  NoStateContext,
  NoStateEvents,
  Record<string, never>,
  'toggle'
>({
  on: {
    TOGGLE: 'toggle',
  },
  actions: {
    toggle: (ctx) => ctx.setIsOpen(!ctx.isOpen),
  },
})

// ============================================
// 테스트 2: state 있는 context
// ============================================

type State = 'idle' | 'loading' | 'open'

type StateEvents = {
  OPEN: undefined
  CLOSE: undefined
}

type StateContext = {
  state: State
  setState: (s: State) => void
}

export const stateMachine = createEventMachine<
  StateContext,
  StateEvents,
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
    startLoading: (ctx) => ctx.setState('loading'),
    open: (ctx) => ctx.setState('open'),
    close: (ctx) => ctx.setState('idle'),
  },
})

// ============================================
// 테스트 3: useEventMachine 타입 체크
// ============================================

// state 없는 machine - 타입 체크
type NoStateMachineType = EventMachine<NoStateContext, NoStateEvents, Record<string, never>>

const _noStateMachineTypeCheck: NoStateMachineType = {
  on: {
    TOGGLE: 'toggle',
  },
  actions: {
    toggle: (ctx) => ctx.setIsOpen(!ctx.isOpen),
  },
}

// state 있는 machine - 타입 체크
type StateMachineType = EventMachine<StateContext, StateEvents, Record<string, never>, State>

const _stateMachineTypeCheck: StateMachineType = {
  states: {
    idle: {
      on: { OPEN: 'startLoading' },
    },
  },
  actions: {
    startLoading: (ctx) => ctx.setState('loading'),
  },
}

// ============================================
// 테스트 4: vanilla 런타임 테스트
// ============================================

export function runVanillaTest() {
  const results: string[] = []

  // Test 1: state 없는 context
  let isOpen = false
  const noStateCtx: NoStateContext = {
    isOpen,
    setIsOpen: (v) => {
      isOpen = v
    },
  }

  noStateMachine.send('TOGGLE', noStateCtx)
  results.push(`[no-state] after TOGGLE: isOpen=${isOpen}`)

  // Test 2: state 있는 context
  let currentState: State = 'idle'
  const stateCtx: StateContext = {
    get state() {
      return currentState
    },
    setState: (s) => {
      currentState = s
      results.push(`[state] setState(${s})`)
    },
  }

  results.push(`[state] initial: ${stateCtx.state}`)

  // idle + OPEN → loading
  stateMachine.send('OPEN', { ...stateCtx, state: currentState })
  results.push(`[state] after OPEN (idle): ${currentState}`)

  // loading + OPEN → open
  stateMachine.send('OPEN', { ...stateCtx, state: currentState })
  results.push(`[state] after OPEN (loading): ${currentState}`)

  // open + CLOSE → idle
  stateMachine.send('CLOSE', { ...stateCtx, state: currentState })
  results.push(`[state] after CLOSE (open): ${currentState}`)

  // Test 3: 핸들러 없는 경우 무시
  stateMachine.send('CLOSE', { ...stateCtx, state: currentState }) // idle에서 CLOSE 없음
  results.push(`[state] after CLOSE (idle, no handler): ${currentState}`)

  return results
}

// ============================================
// useEventMachine 타입 체크용 (실제로 호출하진 않음)
// ============================================

export function _useEventMachineTypeCheck() {
  // 타입 체크만 위해 존재, 호출되지 않음

  // state 없는 machine
  const noStateCtx: NoStateContext = {
    isOpen: false,
    setIsOpen: () => {},
  }
  const noStateResult = useEventMachine(_noStateMachineTypeCheck, noStateCtx)

  // state 반환 타입 확인 (string | undefined)
  void (noStateResult.state satisfies string | undefined)

  // state 있는 machine
  const stateCtx: StateContext = {
    state: 'idle',
    setState: () => {},
  }
  const stateResult = useEventMachine(_stateMachineTypeCheck, stateCtx)

  // state 반환 타입 확인 (State | undefined)
  void (stateResult.state satisfies State | undefined)
}
