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

// Effect helpers - effects 콜백에서 사용할 수 있는 유틸리티
export type EffectHelpers<TEvents extends EventsConfig> = {
  send: Send<TEvents>;
};

export type Cleanup = () => void;

export type Effect<TContext, TEvents extends EventsConfig, TWatched = unknown> = {
  watch: (ctx: TContext) => TWatched;
  enter?: (ctx: TContext, helpers: EffectHelpers<TEvents>) => void | Cleanup | Promise<void>;
  exit?: (ctx: TContext, helpers: EffectHelpers<TEvents>) => void | Cleanup;
  change?: (ctx: TContext, prev: TWatched | undefined, curr: TWatched, helpers: EffectHelpers<TEvents>) => void | Cleanup;
};

/** watch 반환타입에서 prev/curr 타입 추론하는 헬퍼 */
export function effect<TContext, TEvents extends EventsConfig, TWatched>(
  config: Effect<TContext, TEvents, TWatched>
): Effect<TContext, TEvents, TWatched> {
  return config;
}

export type EventsConfig = Record<string, unknown>;
export type ComputedConfig = Record<string, unknown>;

// State-based handler configuration
export type StateConfig<TContext, TEvents extends EventsConfig> = {
  on?: { [K in keyof TEvents]?: Handler<TContext, TEvents[K]> };
};

export type StatesConfig<
  TState extends string,
  TContext,
  TEvents extends EventsConfig
> = {
  [K in TState]?: StateConfig<TContext, TEvents>;
};

export type EventMachine<
  TContext,
  TEvents extends EventsConfig = Record<string, undefined>,
  TComputed extends ComputedConfig = Record<string, never>,
  TState extends string = string
> = {
  computed?: { [K in keyof TComputed]: (ctx: TContext) => TComputed[K] };
  on?: { [K in keyof TEvents]?: Handler<TContext & TComputed, TEvents[K]> };
  states?: StatesConfig<TState, TContext & TComputed, TEvents>;
  always?: Rule<TContext & TComputed, undefined>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effects?: Effect<TContext & TComputed, TEvents, any>[];
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

/**
 * 얕은 비교 함수 - 복합 watch 지원용
 *
 * 배열: 길이 + 각 요소 === 비교
 * 그 외: === 비교
 */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  // 배열 비교
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  return false;
}

// ============================================
// React Hook
// ============================================

export function useEventMachine<
  TContext,
  TEvents extends EventsConfig = Record<string, undefined>,
  TComputed extends ComputedConfig = Record<string, never>,
  TState extends string = string
>(
  machine: EventMachine<TContext, TEvents, TComputed, TState>,
  ctx: TContext
): { send: Send<TEvents>; computed: TComputed; state: TState | undefined } {
  // refs for stable callbacks
  const ctxRef = useRef(ctx);
  const machineRef = useRef(machine);
  const isMountedRef = useRef(true);

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
  const enterCleanupsRef = useRef<Map<number, () => void>>(new Map());
  const changeCleanupsRef = useRef<Map<number, () => void>>(new Map());
  const exitCleanupsRef = useRef<Map<number, () => void>>(new Map());

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

  // send: 안정적인 함수 (deps 없음, ref 사용)
  const send: Send<TEvents> = useCallback(
    (<K extends keyof TEvents>(
      event: K,
      ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
    ) => {
      const currentMachine = machineRef.current;
      const currentCtx = ctxRef.current;
      const currentFullCtx = computeValues(currentCtx, currentMachine.computed);
      const payload = args[0] as TEvents[K];

      // 1. state별 핸들러 먼저 실행
      const state = (currentFullCtx as { state?: TState }).state;
      if (state && currentMachine.states?.[state]?.on?.[event]) {
        const stateHandler = currentMachine.states[state].on![event]!;
        executeHandler(stateHandler, currentMachine.actions, currentFullCtx, payload);
      }

      // 2. 전역 핸들러 실행
      const globalHandler = currentMachine.on?.[event];
      if (globalHandler) {
        executeHandler(globalHandler, currentMachine.actions, currentFullCtx, payload);
      }
    }),
    [] // 의존성 없음 - ref 사용
  );

  // safeSend: 언마운트된 후에는 호출되지 않도록
  const safeSend: Send<TEvents> = useCallback(
    (<K extends keyof TEvents>(
      event: K,
      ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
    ) => {
      if (!isMountedRef.current) return;
      send(event, ...args);
    }),
    [send]
  );

  // effect helpers
  const effectHelpers: EffectHelpers<TEvents> = useMemo(
    () => ({ send: safeSend }),
    [safeSend]
  );

  // effects: watch 값 변경 감지
  const { effects } = machine;
  useEffect(() => {
    if (!effects) return;

    effects.forEach((effect, i) => {
      const prev = watchedValuesRef.current.get(i);
      const curr = effect.watch(fullCtx);

      if (!shallowEqual(prev, curr)) {
        // cleanup previous enter
        const enterCleanup = enterCleanupsRef.current.get(i);
        if (enterCleanup) {
          enterCleanup();
          enterCleanupsRef.current.delete(i);
        }

        // cleanup previous change
        const changeCleanup = changeCleanupsRef.current.get(i);
        if (changeCleanup) {
          changeCleanup();
          changeCleanupsRef.current.delete(i);
        }

        // change callback (can return cleanup)
        const changeResult = effect.change?.(fullCtx, prev, curr, effectHelpers);
        if (typeof changeResult === 'function') {
          changeCleanupsRef.current.set(i, changeResult);
        }

        // enter (falsy → truthy)
        if (!prev && curr) {
          // cleanup previous exit
          const exitCleanup = exitCleanupsRef.current.get(i);
          if (exitCleanup) {
            exitCleanup();
            exitCleanupsRef.current.delete(i);
          }

          const enterResult = effect.enter?.(fullCtx, effectHelpers);
          if (typeof enterResult === 'function') {
            enterCleanupsRef.current.set(i, enterResult);
          }
        }

        // exit (truthy → falsy)
        if (prev && !curr) {
          const exitResult = effect.exit?.(fullCtx, effectHelpers);
          if (typeof exitResult === 'function') {
            exitCleanupsRef.current.set(i, exitResult);
          }
        }

        watchedValuesRef.current.set(i, curr);
      }
    });
  }, [fullCtx, effects, effectHelpers]);

  // mount/unmount 관리
  useEffect(() => {
    isMountedRef.current = true;
    const enterCleanups = enterCleanupsRef.current;
    const changeCleanups = changeCleanupsRef.current;
    const exitCleanups = exitCleanupsRef.current;

    return () => {
      isMountedRef.current = false;
      enterCleanups.forEach((cleanup) => cleanup());
      enterCleanups.clear();
      changeCleanups.forEach((cleanup) => cleanup());
      changeCleanups.clear();
      exitCleanups.forEach((cleanup) => cleanup());
      exitCleanups.clear();
    };
  }, []);

  // state from context
  const state = (fullCtx as { state?: TState }).state;

  return { send, computed, state };
}

// ============================================
// Vanilla (non-React) + 타입 추론 헬퍼
// ============================================

export function createEventMachine<
  TContext,
  TEvents extends EventsConfig = Record<string, undefined>,
  TComputed extends ComputedConfig = Record<string, never>,
  TActions extends string = string,
  TState extends string = string
>(config: {
  computed?: { [K in keyof TComputed]: (ctx: TContext) => TComputed[K] };
  on?: {
    [K in keyof TEvents]?:
      | TActions
      | { when?: (ctx: TContext & TComputed, payload: TEvents[K]) => boolean; do: TActions }[]
  };
  states?: {
    [S in TState]?: {
      on?: {
        [K in keyof TEvents]?:
          | TActions
          | { when?: (ctx: TContext & TComputed, payload: TEvents[K]) => boolean; do: TActions }[]
      };
    };
  };
  always?: { when?: (ctx: TContext & TComputed) => boolean; do: TActions }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effects?: Effect<TContext & TComputed, TEvents, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: { [K in TActions]: (ctx: TContext & TComputed, payload?: any) => void };
}): EventMachine<TContext, TEvents, TComputed, TState> & {
  send: <K extends keyof TEvents>(
    event: K,
    ctx: TContext,
    ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
  ) => void;
  evaluate: (ctx: TContext) => void;
  getComputed: (ctx: TContext) => TComputed;
  cleanup: () => void;
} {
  const machine = config as EventMachine<TContext, TEvents, TComputed, TState>;
  const watchedValues = new Map<number, unknown>();
  const enterCleanups = new Map<number, () => void>();
  const changeCleanups = new Map<number, () => void>();
  const exitCleanups = new Map<number, () => void>();

  const send = (<K extends keyof TEvents>(
    event: K,
    ctx: TContext,
    ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
  ) => {
    const fullCtx = computeValues(ctx, machine.computed);
    const payload = args[0] as TEvents[K];

    // 1. state별 핸들러 먼저 실행
    const state = (fullCtx as { state?: TState }).state;
    if (state && machine.states?.[state]?.on?.[event]) {
      const stateHandler = machine.states[state].on![event]!;
      executeHandler(stateHandler, machine.actions, fullCtx, payload);
    }

    // 2. 전역 핸들러 실행
    const globalHandler = machine.on?.[event];
    if (globalHandler) {
      executeHandler(globalHandler, machine.actions, fullCtx, payload);
    }
  }) as <K extends keyof TEvents>(
    event: K,
    ctx: TContext,
    ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
  ) => void;

  // vanilla용 send wrapper (ctx 바인딩)
  const createEffectHelpers = (ctx: TContext): EffectHelpers<TEvents> => ({
    send: (<K extends keyof TEvents>(
      event: K,
      ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
    ) => {
      send(event, ctx, ...args);
    }) as Send<TEvents>
  });

  const evaluate = (ctx: TContext) => {
    const fullCtx = computeValues(ctx, machine.computed);
    const effectHelpers = createEffectHelpers(ctx);

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

      if (!shallowEqual(prev, curr)) {
        // cleanup previous enter
        const enterCleanup = enterCleanups.get(i);
        if (enterCleanup) {
          enterCleanup();
          enterCleanups.delete(i);
        }

        // cleanup previous change
        const changeCleanup = changeCleanups.get(i);
        if (changeCleanup) {
          changeCleanup();
          changeCleanups.delete(i);
        }

        // change (can return cleanup)
        const changeResult = effect.change?.(fullCtx, prev, curr, effectHelpers);
        if (typeof changeResult === 'function') {
          changeCleanups.set(i, changeResult);
        }

        // enter
        if (!prev && curr) {
          // cleanup previous exit
          const exitCleanup = exitCleanups.get(i);
          if (exitCleanup) {
            exitCleanup();
            exitCleanups.delete(i);
          }

          const enterResult = effect.enter?.(fullCtx, effectHelpers);
          if (typeof enterResult === 'function') {
            enterCleanups.set(i, enterResult);
          }
        }

        // exit
        if (prev && !curr) {
          const exitResult = effect.exit?.(fullCtx, effectHelpers);
          if (typeof exitResult === 'function') {
            exitCleanups.set(i, exitResult);
          }
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
    enterCleanups.forEach((fn) => fn());
    enterCleanups.clear();
    changeCleanups.forEach((fn) => fn());
    changeCleanups.clear();
    exitCleanups.forEach((fn) => fn());
    exitCleanups.clear();
    watchedValues.clear();
  };

  return Object.assign(machine, { send, evaluate, getComputed, cleanup });
}
