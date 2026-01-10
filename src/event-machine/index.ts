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

import { useCallback, useRef, useEffect, useMemo } from 'react'

// ============================================
// Types
// ============================================

export type Rule<
  TContext,
  TPayload = undefined,
  TActions extends string = string,
> = {
  when?: (ctx: TContext, payload: TPayload) => boolean
  do: TActions
}

export type Handler<
  TContext,
  TPayload = undefined,
  TActions extends string = string,
> = TActions | Rule<TContext, TPayload, TActions>[]

// Effect helpers - effects 콜백에서 사용할 수 있는 유틸리티
export type EffectHelpers<TEvents extends EventsConfig> = {
  send: Send<TEvents>
}

export type Cleanup = () => void

export type Effect<
  TContext,
  TEvents extends EventsConfig,
  TWatched = unknown,
> = {
  watch: (ctx: TContext) => TWatched
  enter?: (
    ctx: TContext,
    helpers: EffectHelpers<TEvents>,
  ) => void | Cleanup | Promise<void>
  exit?: (ctx: TContext, helpers: EffectHelpers<TEvents>) => void | Cleanup
  change?: (
    ctx: TContext,
    prev: TWatched | undefined,
    curr: TWatched,
    helpers: EffectHelpers<TEvents>,
  ) => void | Cleanup
}

/** watch 반환타입에서 prev/curr 타입 추론하는 헬퍼 */
export function effect<TContext, TEvents extends EventsConfig, TWatched>(
  config: Effect<TContext, TEvents, TWatched>,
): Effect<TContext, TEvents, TWatched> {
  return config
}

export type EventsConfig = Record<string, unknown>
export type ComputedConfig = Record<string, unknown>

// ============================================
// Object-based Generic Types
// ============================================

/**
 * 객체 기반 제네릭 타입 - 순서 무관하게 필요한 타입만 지정
 *
 * @example
 * createEventMachine<{
 *   context: MyContext
 *   events: MyEvents
 *   actions: 'foo' | 'bar'
 * }>({...})
 */
export type MachineTypes = {
  context: unknown
  events?: EventsConfig
  computed?: ComputedConfig
  actions?: string
  state?: string
}

// Helper types to extract with defaults
type GetContext<T extends MachineTypes> = T['context']
type GetEvents<T extends MachineTypes> = T['events'] extends EventsConfig
  ? T['events']
  : Record<string, undefined>
type GetComputed<T extends MachineTypes> = T['computed'] extends ComputedConfig
  ? T['computed']
  : Record<string, never>
type GetActions<T extends MachineTypes> = T['actions'] extends string
  ? T['actions']
  : string
type GetState<T extends MachineTypes> = T['state'] extends string
  ? T['state']
  : string

// Combined context type (context + computed)
type FullContext<T extends MachineTypes> = GetContext<T> & GetComputed<T>

// State-based handler configuration
export type StateConfig<
  TContext,
  TEvents extends EventsConfig,
  TActions extends string = string,
> = {
  on?: { [K in keyof TEvents]?: Handler<TContext, TEvents[K], TActions> }
}

export type StatesConfig<
  TState extends string,
  TContext,
  TEvents extends EventsConfig,
  TActions extends string = string,
> = {
  [K in TState]?: StateConfig<TContext, TEvents, TActions>
}

export type EventMachine<T extends MachineTypes> = {
  computed?: {
    [K in keyof GetComputed<T>]: (ctx: GetContext<T>) => GetComputed<T>[K]
  }
  on?: {
    [K in keyof GetEvents<T>]?: Handler<
      FullContext<T>,
      GetEvents<T>[K],
      GetActions<T>
    >
  }
  states?: StatesConfig<
    GetState<T>,
    FullContext<T>,
    GetEvents<T>,
    GetActions<T>
  >
  always?: Rule<FullContext<T>, undefined, GetActions<T>>[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effects?: Effect<FullContext<T>, GetEvents<T>, any>[]
  actions?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in GetActions<T>]: (ctx: FullContext<T>, payload?: any) => void
  }
}

export type Send<TEvents extends EventsConfig> = <K extends keyof TEvents>(
  event: K,
  ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
) => void

// createEventMachine 반환 타입
export type MachineInstance<T extends MachineTypes> = EventMachine<T> & {
  send: <K extends keyof GetEvents<T>>(
    event: K,
    ctx: GetContext<T>,
    ...args: GetEvents<T>[K] extends undefined ? [] : [payload: GetEvents<T>[K]]
  ) => void
  evaluate: (ctx: GetContext<T>) => void
  getComputed: (ctx: GetContext<T>) => GetComputed<T>
  cleanup: () => void
}

// ============================================
// Core Logic (Pure)
// ============================================

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

function computeValues<TContext, TComputed extends ComputedConfig>(
  ctx: TContext,
  computed?: { [K in keyof TComputed]: (ctx: TContext) => TComputed[K] },
): TContext & TComputed {
  if (!computed) return ctx as TContext & TComputed

  const values = {} as TComputed
  for (const key in computed) {
    values[key] = computed[key](ctx)
  }
  return { ...ctx, ...values }
}

/**
 * 얕은 비교 함수 - 복합 watch 지원용
 *
 * 배열: 길이 + 각 요소 === 비교
 * 그 외: === 비교
 */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  // 배열 비교
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => v === b[i])
  }

  return false
}

// Effects 처리용 상태 저장소
type EffectStore = {
  watchedValues: Map<number, unknown>
  enterCleanups: Map<number, () => void>
  changeCleanups: Map<number, () => void>
  exitCleanups: Map<number, () => void>
}

/**
 * Effects 처리 공통 로직
 */
function processEffects<TContext, TEvents extends EventsConfig>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effects: Effect<TContext, TEvents, any>[] | undefined,
  fullCtx: TContext,
  effectHelpers: EffectHelpers<TEvents>,
  store: EffectStore,
): void {
  if (!effects) return

  effects.forEach((effect, i) => {
    const prev = store.watchedValues.get(i)
    const curr = effect.watch(fullCtx)

    if (!shallowEqual(prev, curr)) {
      // cleanup previous enter
      const enterCleanup = store.enterCleanups.get(i)
      if (enterCleanup) {
        enterCleanup()
        store.enterCleanups.delete(i)
      }

      // cleanup previous change
      const changeCleanup = store.changeCleanups.get(i)
      if (changeCleanup) {
        changeCleanup()
        store.changeCleanups.delete(i)
      }

      // change callback (can return cleanup)
      const changeResult = effect.change?.(fullCtx, prev, curr, effectHelpers)
      if (typeof changeResult === 'function') {
        store.changeCleanups.set(i, changeResult)
      }

      // enter (falsy → truthy)
      if (!prev && curr) {
        // cleanup previous exit
        const exitCleanup = store.exitCleanups.get(i)
        if (exitCleanup) {
          exitCleanup()
          store.exitCleanups.delete(i)
        }

        const enterResult = effect.enter?.(fullCtx, effectHelpers)
        if (typeof enterResult === 'function') {
          store.enterCleanups.set(i, enterResult)
        }
      }

      // exit (truthy → falsy)
      if (prev && !curr) {
        const exitResult = effect.exit?.(fullCtx, effectHelpers)
        if (typeof exitResult === 'function') {
          store.exitCleanups.set(i, exitResult)
        }
      }

      store.watchedValues.set(i, curr)
    }
  })
}

/**
 * Effect store 정리
 */
function clearEffectStore(store: EffectStore): void {
  store.enterCleanups.forEach((fn) => fn())
  store.enterCleanups.clear()
  store.changeCleanups.forEach((fn) => fn())
  store.changeCleanups.clear()
  store.exitCleanups.forEach((fn) => fn())
  store.exitCleanups.clear()
  store.watchedValues.clear()
}

// ============================================
// React Hook
// ============================================

export function useEventMachine<T extends MachineTypes>(
  machine: EventMachine<T>,
  ctx: GetContext<T>,
): { send: Send<GetEvents<T>>; computed: GetComputed<T>; state: GetState<T> } {
  type TContext = GetContext<T>
  type TEvents = GetEvents<T>
  type TComputed = GetComputed<T>
  type TState = GetState<T>
  // refs for stable callbacks
  const ctxRef = useRef(ctx)
  const machineRef = useRef(machine)
  const isMountedRef = useRef(true)

  ctxRef.current = ctx
  machineRef.current = machine

  // computed 값 계산
  const { computed: computedDef } = machine
  const fullCtx = useMemo(
    () => computeValues(ctx, computedDef),
    [ctx, computedDef],
  )

  // computed만 추출
  const computed = useMemo(() => {
    if (!computedDef) return {} as TComputed
    const result = {} as TComputed
    for (const key in computedDef) {
      result[key] = fullCtx[key]
    }
    return result
  }, [fullCtx, computedDef])

  const fullCtxRef = useRef(fullCtx)
  fullCtxRef.current = fullCtx

  const prevFullCtxRef = useRef<TContext & TComputed>(fullCtx)
  const effectStoreRef = useRef<EffectStore>({
    watchedValues: new Map(),
    enterCleanups: new Map(),
    changeCleanups: new Map(),
    exitCleanups: new Map(),
  })

  // always: context 바뀔 때 자동 평가 (동기적, 렌더 중)
  const { always, actions } = machine
  if (prevFullCtxRef.current !== fullCtx && always && actions) {
    const actionsMap = actions as Record<
      string,
      (ctx: TContext & TComputed) => void
    >
    for (const rule of always) {
      if (!rule.when || rule.when(fullCtx, undefined)) {
        actionsMap[rule.do]?.(fullCtx)
        break
      }
    }
  }
  prevFullCtxRef.current = fullCtx

  // send: 안정적인 함수 (deps 없음, ref 사용)
  const send: Send<TEvents> = useCallback(
    <K extends keyof TEvents>(
      event: K,
      ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
    ) => {
      const currentMachine = machineRef.current
      const currentCtx = ctxRef.current
      const currentFullCtx = computeValues(currentCtx, currentMachine.computed)
      const payload = args[0] as TEvents[K]

      // 1. state별 핸들러 먼저 실행
      const state = (currentFullCtx as { state?: TState }).state
      if (state && currentMachine.states?.[state]?.on?.[event]) {
        const stateHandler = currentMachine.states[state].on![event]!
        executeHandler(
          stateHandler,
          currentMachine.actions ?? {},
          currentFullCtx,
          payload,
        )
      }

      // 2. 전역 핸들러 실행
      const globalHandler = currentMachine.on?.[event]
      if (globalHandler) {
        executeHandler(
          globalHandler,
          currentMachine.actions ?? {},
          currentFullCtx,
          payload,
        )
      }
    },
    [], // 의존성 없음 - ref 사용
  )

  // safeSend: 언마운트된 후에는 호출되지 않도록
  const safeSend: Send<TEvents> = useCallback(
    <K extends keyof TEvents>(
      event: K,
      ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
    ) => {
      if (!isMountedRef.current) return
      send(event, ...args)
    },
    [send],
  )

  // effect helpers
  const effectHelpers: EffectHelpers<TEvents> = useMemo(
    () => ({ send: safeSend }),
    [safeSend],
  )

  // effects: watch 값 변경 감지
  const { effects } = machine
  useEffect(() => {
    processEffects(effects, fullCtx, effectHelpers, effectStoreRef.current)
  }, [fullCtx, effects, effectHelpers])

  // mount/unmount 관리
  useEffect(() => {
    isMountedRef.current = true
    const store = effectStoreRef.current
    return () => {
      isMountedRef.current = false
      clearEffectStore(store)
    }
  }, [])

  // state from context (default to empty string if not provided)
  const state = (fullCtx as { state?: TState }).state ?? ('' as TState)

  return { send, computed, state }
}

// ============================================
// Vanilla (non-React) + 타입 추론 헬퍼
// ============================================

export function createEventMachine<T extends MachineTypes>(
  config: EventMachine<T>,
): MachineInstance<T> {
  const effectStore: EffectStore = {
    watchedValues: new Map(),
    enterCleanups: new Map(),
    changeCleanups: new Map(),
    exitCleanups: new Map(),
  }

  const send = (<K extends keyof GetEvents<T>>(
    event: K,
    ctx: GetContext<T>,
    ...args: GetEvents<T>[K] extends undefined ? [] : [payload: GetEvents<T>[K]]
  ) => {
    const fullCtx = computeValues(ctx, config.computed)
    const payload = args[0] as GetEvents<T>[K]

    // 1. state별 핸들러 먼저 실행
    const state = (fullCtx as { state?: GetState<T> }).state
    if (state && config.states?.[state]?.on?.[event]) {
      const stateHandler = config.states[state].on![event]!
      executeHandler(stateHandler, config.actions ?? {}, fullCtx, payload)
    }

    // 2. 전역 핸들러 실행
    const globalHandler = config.on?.[event]
    if (globalHandler) {
      executeHandler(globalHandler, config.actions ?? {}, fullCtx, payload)
    }
  }) as <K extends keyof GetEvents<T>>(
    event: K,
    ctx: GetContext<T>,
    ...args: GetEvents<T>[K] extends undefined ? [] : [payload: GetEvents<T>[K]]
  ) => void

  // vanilla용 send wrapper (ctx 바인딩)
  const createEffectHelpers = (
    ctx: GetContext<T>,
  ): EffectHelpers<GetEvents<T>> => ({
    send: (<K extends keyof GetEvents<T>>(
      event: K,
      ...args: GetEvents<T>[K] extends undefined
        ? []
        : [payload: GetEvents<T>[K]]
    ) => {
      send(event, ctx, ...args)
    }) as Send<GetEvents<T>>,
  })

  const evaluate = (ctx: GetContext<T>) => {
    const fullCtx = computeValues(ctx, config.computed)
    const effectHelpers = createEffectHelpers(ctx)

    // always
    if (config.always && config.actions) {
      const actions = config.actions as Record<
        string,
        (ctx: FullContext<T>) => void
      >
      for (const rule of config.always) {
        if (!rule.when || rule.when(fullCtx, undefined)) {
          actions[rule.do]?.(fullCtx)
          break
        }
      }
    }

    // effects
    processEffects(config.effects, fullCtx, effectHelpers, effectStore)
  }

  const getComputed = (ctx: GetContext<T>): GetComputed<T> => {
    const fullCtx = computeValues(ctx, config.computed)
    if (!config.computed) return {} as GetComputed<T>
    const result = {} as GetComputed<T>
    for (const key in config.computed) {
      result[key] = fullCtx[key]
    }
    return result
  }

  const cleanup = () => clearEffectStore(effectStore)

  return Object.assign(config, { send, evaluate, getComputed, cleanup })
}
