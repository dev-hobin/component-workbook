/**
 * Event Machine
 *
 * 상태 없는 선언적 이벤트 핸들러.
 *
 * - input: 외부에서 전달하는 데이터
 * - computed: input에서 파생되는 값
 * - context: input + computed (핸들러에서 받는 전체 컨텍스트)
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
  when?: (context: TContext, payload: TPayload) => boolean
  do: TActions | TActions[]
}

export type Handler<
  TContext,
  TPayload = undefined,
  TActions extends string = string,
> = TActions | TActions[] | Rule<TContext, TPayload, TActions>[]

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
  watch: (context: TContext) => TWatched
  enter?: (
    context: TContext,
    helpers: EffectHelpers<TEvents>,
  ) => void | Cleanup | Promise<void>
  exit?: (context: TContext, helpers: EffectHelpers<TEvents>) => void | Cleanup
  change?: (
    context: TContext,
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
 *   input: MyInput
 *   events: MyEvents
 *   actions: 'foo' | 'bar'
 * }>({...})
 */
export type MachineTypes = {
  input?: unknown
  events?: EventsConfig
  computed?: ComputedConfig
  actions?: string
  state?: string
}

type Input<T extends MachineTypes> = T['input']
type Events<T extends MachineTypes> = T['events'] extends EventsConfig
  ? T['events']
  : Record<string, undefined>
type Computed<T extends MachineTypes> = T['computed'] extends ComputedConfig
  ? T['computed']
  : Record<string, never>
type Actions<T extends MachineTypes> = T['actions'] extends string
  ? T['actions']
  : string
type State<T extends MachineTypes> = T['state'] extends string
  ? T['state']
  : string

// Context = Input + Computed (핸들러에서 받는 전체 컨텍스트)
type Context<T extends MachineTypes> = Input<T> & Computed<T>

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
    [K in keyof Computed<T>]: (input: Input<T>) => Computed<T>[K]
  }
  on?: {
    [K in keyof Events<T>]?: Handler<Context<T>, Events<T>[K], Actions<T>>
  }
  states?: StatesConfig<State<T>, Context<T>, Events<T>, Actions<T>>
  always?: Rule<Context<T>, undefined, Actions<T>>[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effects?: Effect<Context<T>, Events<T>, any>[]
  actions?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in Actions<T>]: (context: Context<T>, payload?: any) => void
  }
}

export type Send<TEvents extends EventsConfig> = <K extends keyof TEvents>(
  event: K,
  ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
) => void

// createEventMachine 반환 타입
export type MachineInstance<T extends MachineTypes> = EventMachine<T> & {
  send: <K extends keyof Events<T>>(
    event: K,
    input: Input<T>,
    ...args: Events<T>[K] extends undefined ? [] : [payload: Events<T>[K]]
  ) => void
  evaluate: (input: Input<T>) => void
  getComputed: (input: Input<T>) => Computed<T>
  cleanup: () => void
}

// ============================================
// Core Logic (Pure)
// ============================================

function executeActions<TContext, TPayload>(
  actionNames: string | string[],
  actions: Record<string, (context: TContext, payload?: TPayload) => void>,
  context: TContext,
  payload: TPayload,
): void {
  if (typeof actionNames === 'string') {
    actions[actionNames]?.(context, payload)
  } else {
    for (const name of actionNames) {
      actions[name]?.(context, payload)
    }
  }
}

function isRuleArray<TContext, TPayload, TActions extends string>(
  handler: Handler<TContext, TPayload, TActions>,
): handler is Rule<TContext, TPayload, TActions>[] {
  return (
    Array.isArray(handler) &&
    handler.length > 0 &&
    typeof handler[0] === 'object' &&
    'do' in handler[0]
  )
}

function executeHandler<TContext, TPayload>(
  handler: Handler<TContext, TPayload>,
  actions: Record<string, (context: TContext, payload?: TPayload) => void>,
  context: TContext,
  payload: TPayload,
): void {
  // 단일 액션 또는 액션 배열
  if (typeof handler === 'string' || (Array.isArray(handler) && !isRuleArray(handler))) {
    executeActions(handler as string | string[], actions, context, payload)
    return
  }

  // Rule 배열
  for (const rule of handler as Rule<TContext, TPayload>[]) {
    if (!rule.when || rule.when(context, payload)) {
      executeActions(rule.do, actions, context, payload)
      break
    }
  }
}

function computeValues<TContext, TComputed extends ComputedConfig>(
  context: TContext,
  computed?: { [K in keyof TComputed]: (context: TContext) => TComputed[K] },
): TContext & TComputed {
  if (!computed) return context as TContext & TComputed

  const values = {} as TComputed
  for (const key in computed) {
    values[key] = computed[key](context)
  }
  return { ...context, ...values }
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
  context: TContext,
  effectHelpers: EffectHelpers<TEvents>,
  store: EffectStore,
): void {
  if (!effects) return

  effects.forEach((effect, i) => {
    const prev = store.watchedValues.get(i)
    const curr = effect.watch(context)

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
      const changeResult = effect.change?.(context, prev, curr, effectHelpers)
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

        const enterResult = effect.enter?.(context, effectHelpers)
        if (typeof enterResult === 'function') {
          store.enterCleanups.set(i, enterResult)
        }
      }

      // exit (truthy → falsy)
      if (prev && !curr) {
        const exitResult = effect.exit?.(context, effectHelpers)
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
  input: T['input'],
): { send: Send<Events<T>>; computed: Computed<T>; state: State<T> } {
  // refs for stable callbacks
  const inputRef = useRef(input)
  const machineRef = useRef(machine)
  const isMountedRef = useRef(true)

  inputRef.current = input
  machineRef.current = machine

  // computed 값 계산
  const { computed: computedDef } = machine
  const context = useMemo(
    () => computeValues(input, computedDef),
    [input, computedDef],
  )

  // computed만 추출
  const computed = useMemo(() => {
    if (!computedDef) return {} as Computed<T>
    const result = {} as Computed<T>
    for (const key in computedDef) {
      result[key] = context[key]
    }
    return result
  }, [context, computedDef])

  const contextRef = useRef(context)
  contextRef.current = context

  const prevContextRef = useRef<Context<T>>(context)
  const effectStoreRef = useRef<EffectStore>({
    watchedValues: new Map(),
    enterCleanups: new Map(),
    changeCleanups: new Map(),
    exitCleanups: new Map(),
  })

  // always: context 바뀔 때 자동 평가 (동기적, 렌더 중)
  const { always, actions } = machine
  if (prevContextRef.current !== context && always && actions) {
    const actionsMap = actions as Record<string, (context: Context<T>) => void>
    for (const rule of always) {
      if (!rule.when || rule.when(context, undefined)) {
        executeActions(rule.do, actionsMap, context, undefined)
        break
      }
    }
  }
  prevContextRef.current = context

  // send: 안정적인 함수 (deps 없음, ref 사용)
  const send: Send<Events<T>> = useCallback(
    <K extends keyof Events<T>>(
      event: K,
      ...args: Events<T>[K] extends undefined ? [] : [payload: Events<T>[K]]
    ) => {
      const currentMachine = machineRef.current
      const currentInput = inputRef.current
      const currentContext = computeValues(
        currentInput,
        currentMachine.computed,
      )
      const payload = args[0] as Events<T>[K]

      // 1. state별 핸들러 먼저 실행
      const state = (currentContext as { state?: State<T> }).state
      if (state && currentMachine.states?.[state]?.on?.[event]) {
        const stateHandler = currentMachine.states[state].on![event]!
        executeHandler(
          stateHandler,
          currentMachine.actions ?? {},
          currentContext,
          payload,
        )
      }

      // 2. 전역 핸들러 실행
      const globalHandler = currentMachine.on?.[event]
      if (globalHandler) {
        executeHandler(
          globalHandler,
          currentMachine.actions ?? {},
          currentContext,
          payload,
        )
      }
    },
    [], // 의존성 없음 - ref 사용
  )

  // safeSend: 언마운트된 후에는 호출되지 않도록
  const safeSend: Send<Events<T>> = useCallback(
    <K extends keyof Events<T>>(
      event: K,
      ...args: Events<T>[K] extends undefined ? [] : [payload: Events<T>[K]]
    ) => {
      if (!isMountedRef.current) return
      send(event, ...args)
    },
    [send],
  )

  // effect helpers
  const effectHelpers: EffectHelpers<Events<T>> = useMemo(
    () => ({ send: safeSend }),
    [safeSend],
  )

  // effects: watch 값 변경 감지
  const { effects } = machine
  useEffect(() => {
    processEffects(effects, context, effectHelpers, effectStoreRef.current)
  }, [context, effects, effectHelpers])

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
  const state = (context as { state?: State<T> }).state ?? ('' as State<T>)

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

  const send = (<K extends keyof Events<T>>(
    event: K,
    input: Input<T>,
    ...args: Events<T>[K] extends undefined ? [] : [payload: Events<T>[K]]
  ) => {
    const context = computeValues(input, config.computed)
    const payload = args[0] as Events<T>[K]

    // 1. state별 핸들러 먼저 실행
    const state = (context as { state?: State<T> }).state
    if (state && config.states?.[state]?.on?.[event]) {
      const stateHandler = config.states[state].on[event]
      executeHandler(stateHandler, config.actions ?? {}, context, payload)
    }

    // 2. 전역 핸들러 실행
    const globalHandler = config.on?.[event]
    if (globalHandler) {
      executeHandler(globalHandler, config.actions ?? {}, context, payload)
    }
  }) as <K extends keyof Events<T>>(
    event: K,
    input: Input<T>,
    ...args: Events<T>[K] extends undefined ? [] : [payload: Events<T>[K]]
  ) => void

  // vanilla용 send wrapper (input 바인딩)
  const createEffectHelpers = (input: Input<T>): EffectHelpers<Events<T>> => ({
    send: (<K extends keyof Events<T>>(
      event: K,
      ...args: Events<T>[K] extends undefined ? [] : [payload: Events<T>[K]]
    ) => {
      send(event, input, ...args)
    }) as Send<Events<T>>,
  })

  const evaluate = (input: Input<T>) => {
    const context = computeValues(input, config.computed)
    const effectHelpers = createEffectHelpers(input)

    // always
    if (config.always && config.actions) {
      const actionsMap = config.actions as Record<
        string,
        (context: Context<T>) => void
      >
      for (const rule of config.always) {
        if (!rule.when || rule.when(context, undefined)) {
          executeActions(rule.do, actionsMap, context, undefined)
          break
        }
      }
    }

    // effects
    processEffects(config.effects, context, effectHelpers, effectStore)
  }

  const getComputed = (input: Input<T>): Computed<T> => {
    const context = computeValues(input, config.computed)
    if (!config.computed) return {} as Computed<T>
    const result = {} as Computed<T>
    for (const key in config.computed) {
      result[key] = context[key]
    }
    return result
  }

  const cleanup = () => clearEffectStore(effectStore)

  return Object.assign(config, { send, evaluate, getComputed, cleanup })
}
