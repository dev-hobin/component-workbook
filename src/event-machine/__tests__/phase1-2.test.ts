/**
 * Phase 1-2 검증: change cleanup 반환
 *
 * 테스트 항목:
 * 1. change에서 cleanup 함수 반환 (타입 체크)
 * 2. change cleanup이 다음 change 전에 호출됨 (런타임)
 * 3. 비동기 취소 패턴 (AbortController)
 */

import { createEventMachine } from '../index'

// ============================================
// 테스트 1: change cleanup 타입 체크
// ============================================

type TestEvents = {
  UPDATE: { value: string }
  FETCH_SUCCESS: { data: string }
  FETCH_ERROR: undefined
}

type TestContext = {
  inputValue: string
  setInputValue: (v: string) => void
  log: (msg: string) => void
}

export const changeCleanupMachine = createEventMachine<
  TestContext,
  TestEvents,
  Record<string, never>,
  'updateInput' | 'handleSuccess' | 'handleError' | 'noop'
>({
  on: {
    UPDATE: 'updateInput',
    FETCH_SUCCESS: 'handleSuccess',
    FETCH_ERROR: 'handleError',
  },

  effects: [
    {
      watch: (ctx) => ctx.inputValue,
      // change에서 cleanup 반환 - 비동기 취소 패턴
      change: (ctx, _prev, curr, { send }) => {
        ctx.log(`change: inputValue changed to "${curr}"`)

        // AbortController로 비동기 취소
        const controller = new AbortController()

        // 가상의 fetch (setTimeout으로 시뮬레이션)
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            ctx.log(`change: fetch completed for "${curr}"`)
            send('FETCH_SUCCESS', { data: `result for ${curr}` })
          }
        }, 100)

        // cleanup 반환 - 다음 change 전에 호출됨
        return () => {
          ctx.log(`change cleanup: aborting fetch for "${curr}"`)
          controller.abort()
          clearTimeout(timeoutId)
        }
      },
    },
  ],

  actions: {
    updateInput: (ctx, payload) => {
      if (payload) ctx.setInputValue(payload.value)
    },
    handleSuccess: (ctx, payload) => {
      ctx.log(`action: fetch success - ${payload?.data}`)
    },
    handleError: (ctx) => {
      ctx.log('action: fetch error')
    },
    noop: () => {},
  },
})

// ============================================
// 테스트 2: vanilla 런타임 테스트
// ============================================

export function runChangeCleanupTest() {
  const results: string[] = []

  let inputValue = ''
  const ctx: TestContext = {
    inputValue,
    setInputValue: (v) => {
      inputValue = v
      ctx.inputValue = v
    },
    log: (msg) => {
      results.push(msg)
    },
  }

  // 첫 번째 입력
  ctx.setInputValue('a')
  changeCleanupMachine.evaluate(ctx)
  results.push('--- after evaluate with "a" ---')

  // 두 번째 입력 (이전 cleanup 호출되어야 함)
  ctx.setInputValue('ab')
  changeCleanupMachine.evaluate(ctx)
  results.push('--- after evaluate with "ab" ---')

  // 세 번째 입력 (이전 cleanup 호출되어야 함)
  ctx.setInputValue('abc')
  changeCleanupMachine.evaluate(ctx)
  results.push('--- after evaluate with "abc" ---')

  // cleanup 호출
  changeCleanupMachine.cleanup()
  results.push('--- after cleanup() ---')

  return results
}

// ============================================
// 테스트 3: 기존 코드 호환성 - cleanup 안 반환해도 동작
// ============================================

export const compatMachine = createEventMachine<
  TestContext,
  TestEvents,
  Record<string, never>,
  'updateInput' | 'handleSuccess' | 'handleError' | 'noop'
>({
  on: {
    UPDATE: 'updateInput',
    FETCH_SUCCESS: 'handleSuccess',
    FETCH_ERROR: 'handleError',
  },

  effects: [
    {
      watch: (ctx) => ctx.inputValue,
      // cleanup 반환 없이 사용 - 기존 호환
      change: (ctx, _prev, curr) => {
        ctx.log(`change: inputValue changed to "${curr}"`)
      },
    },
  ],

  actions: {
    updateInput: (ctx, payload) => {
      if (payload) ctx.setInputValue(payload.value)
    },
    handleSuccess: () => {},
    handleError: () => {},
    noop: () => {},
  },
})
