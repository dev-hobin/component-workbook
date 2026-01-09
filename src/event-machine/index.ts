/* eslint-disable react-hooks/exhaustive-deps */
/**
 * Event Machine
 * 
 * 상태 없는 선언적 이벤트 핸들러.
 * 
 * - computed: context에서 "상태" 파생
 * - on: 이벤트 → 조건부 액션
 * - effects: watch 기반 사이드 이펙트
 * - always: 자동 평가 규칙
 */

import { useCallback, useRef, useEffect, useMemo } from 'react';

// ============================================
// Types
// ============================================

export type Rule<TContext, TPayload = undefined> = {
  when?: (ctx: TContext, payload: TPayload) => boolean;
  do: string;
};

export type Handler<TContext, TPayload = undefined> = string | Rule<TContext, TPayload>[];

export type Effect<TContext, TWatched = unknown> = {
  watch: (ctx: TContext) => TWatched;
  enter?: (ctx: TContext) => void | (() => void) | Promise<void>;
  exit?: (ctx: TContext) => void;
  change?: (ctx: TContext, prev: TWatched | undefined, curr: TWatched) => void;
};

/** watch 반환타입에서 prev/curr 타입 추론하는 헬퍼 */
export function effect<TContext, TWatched>(
  config: Effect<TContext, TWatched>
): Effect<TContext, TWatched> {
  return config;
}

export type EventsConfig = Record<string, unknown>;
export type ComputedConfig = Record<string, unknown>;

export type EventMachine<
  TContext,
  TEvents extends EventsConfig = Record<string, undefined>,
  TComputed extends ComputedConfig = Record<string, never>
> = {
  computed?: { [K in keyof TComputed]: (ctx: TContext) => TComputed[K] };
  on: { [K in keyof TEvents]?: Handler<TContext & TComputed, TEvents[K]> };
  always?: Rule<TContext & TComputed, undefined>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effects?: Effect<TContext & TComputed, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: Record<string, (ctx: TContext & TComputed, payload?: any) => void>;
};

export type Send<TEvents extends EventsConfig> = <K extends keyof TEvents>(
  event: K,
  ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
) => void;

// ============================================
// Core Logic (Pure)
// ============================================

function executeHandler<TContext, TPayload>(
  handler: Handler<TContext, TPayload>,
  actions: Record<string, (ctx: TContext, payload?: TPayload) => void>,
  ctx: TContext,
  payload: TPayload
): void {
  if (typeof handler === 'string') {
    actions[handler]?.(ctx, payload);
  } else {
    for (const rule of handler) {
      if (!rule.when || rule.when(ctx, payload)) {
        actions[rule.do]?.(ctx, payload);
        break;
      }
    }
  }
}

function computeValues<TContext, TComputed extends ComputedConfig>(
  ctx: TContext,
  computed?: { [K in keyof TComputed]: (ctx: TContext) => TComputed[K] }
): TContext & TComputed {
  if (!computed) return ctx as TContext & TComputed;
  
  const values = {} as TComputed;
  for (const key in computed) {
    values[key] = computed[key](ctx);
  }
  return { ...ctx, ...values };
}

// ============================================
// React Hook
// ============================================

export function useEventMachine<
  TContext,
  TEvents extends EventsConfig = Record<string, undefined>,
  TComputed extends ComputedConfig = Record<string, never>
>(
  machine: EventMachine<TContext, TEvents, TComputed>,
  ctx: TContext
): { send: Send<TEvents>; computed: TComputed } {
  // refs for stable callbacks
  const ctxRef = useRef(ctx);
  const machineRef = useRef(machine);
  
  ctxRef.current = ctx;
  machineRef.current = machine;

  // computed 값 계산
  const { computed: computedDef } = machine;
  const fullCtx = useMemo(
    () => computeValues(ctx, computedDef),
    [ctx, computedDef]
  );

  // computed만 추출
  const computed = useMemo(() => {
    if (!computedDef) return {} as TComputed;
    const result = {} as TComputed;
    for (const key in computedDef) {
      result[key] = fullCtx[key];
    }
    return result;
  }, [fullCtx, computedDef]);

  const fullCtxRef = useRef(fullCtx);
  fullCtxRef.current = fullCtx;

  const prevFullCtxRef = useRef<TContext & TComputed>(fullCtx);
  const watchedValuesRef = useRef<Map<number, unknown>>(new Map());
  const cleanupsRef = useRef<Map<number, () => void>>(new Map());

  // always: context 바뀔 때 자동 평가 (동기적, 렌더 중)
  const { always, actions } = machine;
  if (prevFullCtxRef.current !== fullCtx && always) {
    for (const rule of always) {
      if (!rule.when || rule.when(fullCtx, undefined)) {
        actions[rule.do]?.(fullCtx);
        break;
      }
    }
  }
  prevFullCtxRef.current = fullCtx;

  // effects: watch 값 변경 감지
  const { effects } = machine;
  useEffect(() => {
    if (!effects) return;

    effects.forEach((effect, i) => {
      const prev = watchedValuesRef.current.get(i);
      const curr = effect.watch(fullCtx);

      if (prev !== curr) {
        // cleanup previous
        const cleanup = cleanupsRef.current.get(i);
        if (cleanup) {
          cleanup();
          cleanupsRef.current.delete(i);
        }

        // change callback
        effect.change?.(fullCtx, prev, curr);

        // enter (falsy → truthy)
        if (!prev && curr) {
          const result = effect.enter?.(fullCtx);
          if (typeof result === 'function') {
            cleanupsRef.current.set(i, result);
          }
        }

        // exit (truthy → falsy)
        if (prev && !curr) {
          effect.exit?.(fullCtx);
        }

        watchedValuesRef.current.set(i, curr);
      }
    });
  }, [fullCtx, effects]);

  // cleanup on unmount
  useEffect(() => {
    const cleanups = cleanupsRef.current;
    
    return () => {
      cleanups.forEach(cleanup => cleanup());
      cleanups.clear();
    };
  }, []);

  // send: 안정적인 함수 (deps 없음, ref 사용)
  const send: Send<TEvents> = useCallback(
    (<K extends keyof TEvents>(
      event: K,
      ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
    ) => {
      const currentMachine = machineRef.current;
      const currentCtx = ctxRef.current;
      const handler = currentMachine.on[event];
      
      if (handler) {
        const currentFullCtx = computeValues(currentCtx, currentMachine.computed);
        const payload = args[0] as TEvents[K];
        executeHandler(handler, currentMachine.actions, currentFullCtx, payload);
      }
    }),
    [] // 의존성 없음 - ref 사용
  );

  return { send, computed };
}

// ============================================
// Vanilla (non-React) + 타입 추론 헬퍼
// ============================================

export function createEventMachine<
  TContext,
  TEvents extends EventsConfig = Record<string, undefined>,
  TComputed extends ComputedConfig = Record<string, never>,
  TActions extends string = string
>(config: {
  computed?: { [K in keyof TComputed]: (ctx: TContext) => TComputed[K] };
  on: { 
    [K in keyof TEvents]?: 
      | TActions 
      | { when?: (ctx: TContext & TComputed, payload: TEvents[K]) => boolean; do: TActions }[]
  };
  always?: { when?: (ctx: TContext & TComputed) => boolean; do: TActions }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effects?: Effect<TContext & TComputed, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: { [K in TActions]: (ctx: TContext & TComputed, payload?: any) => void };
}): EventMachine<TContext, TEvents, TComputed> & {
  send: <K extends keyof TEvents>(
    event: K,
    ctx: TContext,
    ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
  ) => void;
  evaluate: (ctx: TContext) => void;
  getComputed: (ctx: TContext) => TComputed;
  cleanup: () => void;
} {
  const machine = config as EventMachine<TContext, TEvents, TComputed>;
  const watchedValues = new Map<number, unknown>();
  const cleanups = new Map<number, () => void>();

  const send = (<K extends keyof TEvents>(
    event: K,
    ctx: TContext,
    ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
  ) => {
    const handler = machine.on[event];
    if (handler) {
      const fullCtx = computeValues(ctx, machine.computed);
      const payload = args[0] as TEvents[K];
      executeHandler(handler, machine.actions, fullCtx, payload);
    }
  }) as <K extends keyof TEvents>(
    event: K,
    ctx: TContext,
    ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
  ) => void;

  const evaluate = (ctx: TContext) => {
    const fullCtx = computeValues(ctx, machine.computed);

    // always
    if (machine.always) {
      for (const rule of machine.always) {
        if (!rule.when || rule.when(fullCtx, undefined)) {
          machine.actions[rule.do]?.(fullCtx);
          break;
        }
      }
    }

    // effects
    machine.effects?.forEach((effect, i) => {
      const prev = watchedValues.get(i);
      const curr = effect.watch(fullCtx);

      if (prev !== curr) {
        // cleanup
        const cleanup = cleanups.get(i);
        if (cleanup) {
          cleanup();
          cleanups.delete(i);
        }

        // change
        effect.change?.(fullCtx, prev, curr);

        // enter
        if (!prev && curr) {
          const result = effect.enter?.(fullCtx);
          if (typeof result === 'function') {
            cleanups.set(i, result);
          }
        }

        // exit
        if (prev && !curr) {
          effect.exit?.(fullCtx);
        }

        watchedValues.set(i, curr);
      }
    });
  };

  const getComputed = (ctx: TContext): TComputed => {
    const fullCtx = computeValues(ctx, machine.computed);
    if (!machine.computed) return {} as TComputed;
    const result = {} as TComputed;
    for (const key in machine.computed) {
      result[key] = fullCtx[key];
    }
    return result;
  };

  const cleanup = () => {
    cleanups.forEach(fn => fn());
    cleanups.clear();
    watchedValues.clear();
  };

  return Object.assign(machine, { send, evaluate, getComputed, cleanup });
}
