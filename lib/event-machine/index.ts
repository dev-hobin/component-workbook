/**
 * Event Machine
 *
 * 상태 없는 선언적 이벤트 핸들러.
 * 상태머신에서 "상태"를 빼고 이벤트 → 조건 → 액션만 남긴 패턴.
 *
 * @example
 * const machine = {
 *   on: {
 *     TOGGLE: [
 *       { when: ctx => ctx.isOpen, do: 'close' },
 *       { do: 'open' },
 *     ],
 *     SELECT: 'select',  // payload 받는 액션
 *   },
 *   effects: [{
 *     watch: ctx => ctx.isOpen,
 *     enter: ctx => console.log('opened'),
 *     exit: ctx => console.log('closed'),
 *   }],
 *   actions: {
 *     open: ctx => ctx.setIsOpen(true),
 *     close: ctx => ctx.setIsOpen(false),
 *     select: (ctx, { id }) => ctx.setSelectedId(id),
 *   },
 * };
 *
 * send('TOGGLE');
 * send('SELECT', { id: 'item-1' });
 */

import { useCallback, useRef, useEffect } from 'react'

// ============================================
// Types
// ============================================

/**
 * 조건부 규칙
 * when이 없으면 항상 실행 (default/fallback)
 */
export type Rule<TContext, TPayload = void> = {
  when?: (ctx: TContext, payload: TPayload) => boolean
  do: string
}

/**
 * 이벤트 핸들러
 * - string: 단순 액션 이름
 * - Rule[]: 조건부 규칙 배열 (첫 번째 매칭 실행)
 */
export type Handler<TContext, TPayload = void> =
  | string
  | Rule<TContext, TPayload>[]

/**
 * 사이드 이펙트 정의
 * watch 값의 변화에 반응
 */
export type Effect<TContext> = {
  /** 감시할 값을 반환하는 함수 */
  watch: (ctx: TContext) => unknown
  /** falsy → truthy 전환 시 실행. cleanup 함수 반환 가능 */
  enter?: (ctx: TContext) => void | (() => void) | Promise<void>
  /** truthy → falsy 전환 시 실행 */
  exit?: (ctx: TContext) => void
  /** 값이 변경될 때마다 실행 */
  change?: (ctx: TContext, prev: unknown, curr: unknown) => void
}

/**
 * 이벤트 정의 (타입 안전한 payload)
 */
export type EventsConfig = Record<string, unknown>

/**
 * Event Machine 정의
 */
export type EventMachine<
  TContext,
  TEvents extends EventsConfig = Record<string, void>,
> = {
  /** 이벤트 → 핸들러 매핑 */
  on: { [K in keyof TEvents]?: Handler<TContext, TEvents[K]> }
  /** context 변경 시 자동 평가되는 규칙 */
  always?: Rule<TContext, void>[]
  /** 값 변화에 반응하는 사이드 이펙트 */
  effects?: Effect<TContext>[]
  /** 액션 구현체 */
  actions: Record<string, (ctx: TContext, payload?: any) => void>
}

/**
 * Send 함수 타입 (payload 타입 추론)
 */
export type Send<TEvents extends EventsConfig> = <K extends keyof TEvents>(
  event: K,
  ...args: TEvents[K] extends void ? [] : [payload: TEvents[K]]
) => void

// ============================================
// Core Logic
// ============================================

/**
 * 핸들러 실행
 * - string이면 해당 액션 직접 실행
 * - Rule[]이면 첫 번째 매칭 규칙 실행
 */
function executeHandler<TContext, TPayload>(
  handler: Handler<TContext, TPayload>,
  actions: Record<string, (ctx: TContext, payload?: TPayload) => void>,
  ctx: TContext,
  payload: TPayload,
): void {
  if (typeof handler === 'string') {
    actions[handler]?.(ctx, payload)
  } else {
    for (const rule of handler) {
      if (!rule.when || rule.when(ctx, payload)) {
        actions[rule.do]?.(ctx, payload)
        break
      }
    }
  }
}

// ============================================
// React Hook
// ============================================

/**
 * React용 Event Machine 훅
 *
 * @param machine - Event Machine 정의
 * @param ctx - 현재 context (props + state + helpers)
 * @returns send 함수
 *
 * @example
 * const send = useEventMachine(disclosureMachine, ctx);
 * send('TOGGLE');
 * send('SELECT', { id: 'item-1' });
 */
export function useEventMachine<
  TContext,
  TEvents extends EventsConfig = Record<string, void>,
>(machine: EventMachine<TContext, TEvents>, ctx: TContext): Send<TEvents> {
  const prevCtxRef = useRef<TContext>(ctx)
  const watchedValuesRef = useRef<Map<number, unknown>>(new Map())
  const cleanupsRef = useRef<Map<number, () => void>>(new Map())

  // always: context 바뀔 때 자동 평가 (동기적, 렌더 중)
  if (prevCtxRef.current !== ctx && machine.always) {
    for (const rule of machine.always) {
      if (!rule.when || rule.when(ctx, undefined as void)) {
        machine.actions[rule.do]?.(ctx)
        break
      }
    }
  }
  prevCtxRef.current = ctx

  // effects: watch 값 변경 감지 (useEffect 안에서)
  useEffect(() => {
    if (!machine.effects) return

    machine.effects.forEach((effect, i) => {
      const prev = watchedValuesRef.current.get(i)
      const curr = effect.watch(ctx)

      if (prev !== curr) {
        // cleanup previous enter effect
        const cleanup = cleanupsRef.current.get(i)
        if (cleanup) {
          cleanup()
          cleanupsRef.current.delete(i)
        }

        // change callback
        effect.change?.(ctx, prev, curr)

        // falsy → truthy: enter
        if (!prev && curr) {
          const result = effect.enter?.(ctx)
          if (typeof result === 'function') {
            cleanupsRef.current.set(i, result)
          }
        }

        // truthy → falsy: exit
        if (prev && !curr) {
          effect.exit?.(ctx)
        }

        watchedValuesRef.current.set(i, curr)
      }
    })
  }, [ctx, machine.effects])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupsRef.current.forEach((cleanup) => cleanup())
      cleanupsRef.current.clear()
    }
  }, [])

  // send: 이벤트 발생
  const send = useCallback(
    (<K extends keyof TEvents>(
      event: K,
      ...args: TEvents[K] extends void ? [] : [payload: TEvents[K]]
    ) => {
      const handler = machine.on[event]
      if (handler) {
        const payload = args[0] as TEvents[K]
        executeHandler(handler, machine.actions, ctx, payload)
      }
    }) as Send<TEvents>,
    [ctx, machine],
  )

  return send
}

// ============================================
// Vanilla (non-React)
// ============================================

/**
 * Vanilla JS용 Event Machine
 * React 없이 사용할 때
 *
 * @example
 * const machine = createEventMachine(definition);
 * machine.send('TOGGLE');
 * machine.send('SELECT', { id: 'item-1' });
 * machine.evaluate(ctx); // effects 평가
 */
export function createEventMachine<
  TContext,
  TEvents extends EventsConfig = Record<string, void>,
>(machine: EventMachine<TContext, TEvents>) {
  const watchedValues = new Map<number, unknown>()
  const cleanups = new Map<number, () => void>()

  return {
    /**
     * 이벤트 발송
     */
    send: (<K extends keyof TEvents>(
      event: K,
      ctx: TContext,
      ...args: TEvents[K] extends void ? [] : [payload: TEvents[K]]
    ) => {
      const handler = machine.on[event]
      if (handler) {
        const payload = args[0] as TEvents[K]
        executeHandler(handler, machine.actions, ctx, payload)
      }
    }) as <K extends keyof TEvents>(
      event: K,
      ctx: TContext,
      ...args: TEvents[K] extends void ? [] : [payload: TEvents[K]]
    ) => void,

    /**
     * always + effects 평가
     * context 변경 후 호출 필요
     */
    evaluate: (ctx: TContext) => {
      // always
      if (machine.always) {
        for (const rule of machine.always) {
          if (!rule.when || rule.when(ctx, undefined as void)) {
            machine.actions[rule.do]?.(ctx)
            break
          }
        }
      }

      // effects
      machine.effects?.forEach((effect, i) => {
        const prev = watchedValues.get(i)
        const curr = effect.watch(ctx)

        if (prev !== curr) {
          // cleanup
          const cleanup = cleanups.get(i)
          if (cleanup) {
            cleanup()
            cleanups.delete(i)
          }

          // change
          effect.change?.(ctx, prev, curr)

          // enter (falsy → truthy)
          if (!prev && curr) {
            const result = effect.enter?.(ctx)
            if (typeof result === 'function') {
              cleanups.set(i, result)
            }
          }

          // exit (truthy → falsy)
          if (prev && !curr) {
            effect.exit?.(ctx)
          }

          watchedValues.set(i, curr)
        }
      })
    },

    /**
     * 모든 cleanup 실행
     */
    cleanup: () => {
      cleanups.forEach((fn) => fn())
      cleanups.clear()
    },
  }
}
