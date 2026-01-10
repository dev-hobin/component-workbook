# Phase 3-1 테스트 결과: states 타입 정의

## 개요

Phase 3-1에서는 상태 기반 핸들러를 위한 타입을 정의했습니다. 실행 로직은 Phase 3-2에서 구현됩니다.

## 변경 사항

### 새로운 타입

```ts
// 상태별 핸들러 설정
export type StateConfig<TContext, TEvents extends EventsConfig> = {
  on?: { [K in keyof TEvents]?: Handler<TContext, TEvents[K]> };
};

// 전체 states 구조
export type StatesConfig<
  TState extends string,
  TContext,
  TEvents extends EventsConfig
> = {
  [K in TState]?: StateConfig<TContext, TEvents>;
};
```

### EventMachine 타입 변경

```ts
export type EventMachine<
  TContext,
  TEvents extends EventsConfig = Record<string, undefined>,
  TComputed extends ComputedConfig = Record<string, never>,
  TState extends string = string  // 새로 추가
> = {
  computed?: { ... };
  on?: { ... };           // 필수 → 선택 (states만 사용 가능)
  states?: StatesConfig<TState, TContext & TComputed, TEvents>;  // 새로 추가
  always?: Rule[];
  effects?: Effect[];
  actions: { ... };
};
```

---

## 테스트 1: 타입 체크

**방법:** `pnpm build`

**결과:** PASS

---

## 테스트 2: Vanilla 회귀 테스트

- Phase 1-1: PASS
- Phase 1-2: PASS

---

## 테스트 3: React 런타임 회귀 테스트

기존 Phase 1-1 테스트 컴포넌트로 검증

**결과:** PASS

- enter/exit/change cleanup 모두 정상 동작
- states 타입 추가 후에도 기존 기능 유지

---

## 테스트 4: states 타입 구조 테스트

```ts
createEventMachine<
  Context, Events, Computed, Actions,
  'idle' | 'loading' | 'open'  // TState
>({
  on: { FOCUS: 'focus' },
  states: {
    idle: { on: { OPEN: 'open' } },
    loading: { },
    open: { on: { CLOSE: 'close' } },
  },
  actions: { ... }
})
```

**결과:** PASS - 타입 에러 없이 머신 생성 성공

---

## 결론

Phase 3-1 타입 정의가 정상 동작함을 확인:

1. **새 타입:** StateConfig, StatesConfig 정의 완료
2. **EventMachine 확장:** TState 제네릭 + states 속성 추가
3. **하위 호환성:** 기존 on-only 머신 정상 동작
4. **회귀 테스트:** Phase 1-1, 1-2, 2-1 모두 정상
