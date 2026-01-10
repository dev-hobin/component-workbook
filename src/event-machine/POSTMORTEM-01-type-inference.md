# Postmortem: 타입 추론 개선 실패

## 날짜
2026-01-11

## 요약
`createEventMachine`의 제네릭 타입 자동 추론 기능을 구현하려다, 타입 추론 대신 타입 자체를 제거하여 기능을 퇴보시킴.

---

## 원래 목표

**사용자가 `<Context, Events>`만 명시하면 나머지는 config에서 자동 추론:**

```ts
const machine = createEventMachine<Context, Events>({
  computed: {
    isExpanded: (ctx) => ctx.expandedIds.has(ctx.focusedId),
  },
  states: {
    idle: { on: {...} },
    loading: { on: {...} },
  },
  actions: { open: ..., close: ... },
})

// 기대 결과:
// - TComputed = { isExpanded: boolean }  ← computed 함수 반환타입에서 추론
// - TState = 'idle' | 'loading'          ← states 객체 키에서 추론
// - TActions = 'open' | 'close'          ← actions 객체 키에서 추론 (typo 방지)
```

---

## 실제로 한 것

### 변경 사항
1. `InferState`, `InferComputed`, `InferActions` 헬퍼 타입 제거
2. `EventMachine`에서 TState, TComputed 제네릭 제거
3. computed 반환 타입을 `Record<string, unknown>`으로 고정
4. state 타입을 `string`으로 고정
5. `EventMachineConfigLoose` 제거

### 결과
```ts
// Before: 타입 정보 있음
const { computed } = useEventMachine(machine, ctx)
computed.isExpanded  // boolean 타입

// After: 타입 정보 손실
const { computed } = useEventMachine(machine, ctx)
computed.isExpanded  // unknown 타입 ❌
```

**추론을 구현한 게 아니라 타입 자체를 삭제함.**

---

## 왜 실패했는가

### 1. 수단과 목표의 혼동
- **목표**: DX 개선 (타입 자동 추론)
- **수단으로 착각한 것**: `as any` 제거

`as any` 제거에 집착하여, 내부 구현의 캐스팅을 없애는 데만 집중.
사용자 facing API의 타입 품질은 고려하지 않음.

### 2. 타입 호환성 문제 해결 방식의 오류
```ts
// 문제: config 타입과 반환 타입의 불일치
config: EventMachineConfigLoose<TContext, TEvents>
return: EventMachine<TContext, TEvents, TState, TComputed>

// 잘못된 해결: 불일치를 없애기 위해 TState, TComputed 제거
// 올바른 해결: 추론 타입을 사용하여 반환 타입 생성
```

### 3. 점진적 검증 부재
- 각 단계에서 "이게 원래 목표에 부합하는가?" 확인 안 함
- 빌드 통과 = 성공이라고 착각
- 타입 품질 검증 없이 진행

---

## 기술적 교훈

### TypeScript에서 객체 키/값 추론하는 방법

```ts
// 1. const type parameter (TS 5.0+)
function createMachine<
  TContext,
  TEvents,
  const TConfig extends { states?: Record<string, any> }
>(config: TConfig): Machine<TContext, TEvents, keyof TConfig['states']> {
  // ...
}

// 2. 함수 오버로드
function createMachine<TContext, TEvents>(
  config: MachineConfig<TContext, TEvents>
): Machine<TContext, TEvents, InferState<typeof config>>

// 3. 추론 헬퍼 타입
type InferComputed<TConfig, TContext> = TConfig extends { computed: infer C }
  ? { [K in keyof C]: C[K] extends (ctx: TContext) => infer R ? R : never }
  : {}
```

### 내부 `as` 캐스팅은 괜찮다
- 사용자에게 노출되는 타입이 정확하면 됨
- 내부 구현에서 타입 캐스팅은 허용 가능
- `as any`보다 `as SpecificType`이 낫지만, 어느 쪽이든 사용자 API 타입이 우선

---

## 해야 했던 것

### 1단계: 추론 타입 정의 (이미 있었음)
```ts
type InferState<TConfig> = TConfig extends { states: infer S }
  ? keyof S & string
  : string

type InferComputed<TConfig, TContext> = TConfig extends { computed: infer C }
  ? { [K in keyof C]: C[K] extends (ctx: TContext) => infer R ? R : never }
  : {}
```

### 2단계: createEventMachine에서 추론 적용
```ts
export function createEventMachine<
  TContext,
  TEvents extends EventsConfig,
  const TConfig extends EventMachineConfig<TContext, TEvents>
>(
  config: TConfig
): EventMachine<
  TContext,
  TEvents,
  InferState<TConfig>,
  InferComputed<TConfig, TContext>
> {
  // 내부에서 as 캐스팅 필요할 수 있음 - 괜찮음
  return config as any  // 사용자에겐 정확한 타입 제공
}
```

### 3단계: 검증
```ts
const machine = createEventMachine<Ctx, Events>({
  computed: { isOpen: (ctx) => ctx.open },
  states: { idle: {}, active: {} },
})

// 확인: computed.isOpen이 boolean인가?
// 확인: state가 'idle' | 'active'인가?
```

---

## Action Items

1. 코드 롤백 (사용자가 진행)
2. 이 문서를 참고하여 재시도 시 올바른 접근법 사용
3. 각 단계에서 "사용자 facing 타입이 개선되었는가?" 검증 필수

---

## 핵심 교훈

> **내부 구현의 깔끔함보다 사용자 facing API의 타입 품질이 우선이다.**
>
> `as any`를 제거하는 것이 목표가 아니다.
> 사용자가 더 나은 타입 추론을 받는 것이 목표다.
