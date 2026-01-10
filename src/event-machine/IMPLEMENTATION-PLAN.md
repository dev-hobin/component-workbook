# 구현 계획

> DISCUSSION 결론을 구현하기 위한 단계별 계획

## 구현 목표

| 기능 | 출처 | 우선순위 |
|------|------|----------|
| effects에 { send } 전달 | DISCUSSION-03 | 1 |
| change cleanup 반환 | DISCUSSION-03 | 2 |
| 얕은 비교 (복합 watch) | DISCUSSION-04 | 3 |
| states 구조 | DISCUSSION-02 | 4 |

---

## Phase 1: effects 확장

### 1-1. effects 콜백에 { send } 전달

**현재**:
```ts
type Effect<TContext, TWatched> = {
  watch: (ctx: TContext) => TWatched
  enter?: (ctx: TContext) => void | (() => void)
  exit?: (ctx: TContext) => void
  change?: (ctx: TContext, prev: TWatched, curr: TWatched) => void
}
```

**목표**:
```ts
type EffectHelpers<TEvents> = {
  send: Send<TEvents>
}

type Effect<TContext, TEvents, TWatched> = {
  watch: (ctx: TContext) => TWatched
  enter?: (ctx: TContext, helpers: EffectHelpers<TEvents>) => void | (() => void)
  exit?: (ctx: TContext, helpers: EffectHelpers<TEvents>) => void
  change?: (ctx: TContext, prev: TWatched, curr: TWatched, helpers: EffectHelpers<TEvents>) => void
}
```

**작업**:
1. `EffectHelpers` 타입 정의
2. `Effect` 타입 수정
3. `useEventMachine` 내 effects 실행 부분 수정
   - `safeSend` 생성 (언마운트 안전)
   - 콜백 호출 시 `{ send: safeSend }` 전달
4. `createEventMachine` (vanilla) 동일하게 수정

**검증**:
```ts
// 테스트 케이스
effects: [
  {
    watch: (ctx) => ctx.hoveredId,
    enter: (ctx, { send }) => {
      const timer = setTimeout(() => send('OPEN'), 300)
      return () => clearTimeout(timer)
    }
  }
]
```

---

### 1-2. change cleanup 반환

**현재**: change는 void만 반환

**목표**: change도 cleanup 함수 반환 가능

**작업**:
1. `Effect` 타입의 change 반환 타입 수정: `void | Cleanup`
2. `useEventMachine` 내 change 실행 부분 수정
   - change 반환값 저장
   - 다음 change 전에 cleanup 호출
3. cleanup 저장 구조 확장 (enter용, change용 분리 또는 통합)

**검증**:
```ts
// 테스트 케이스: 비동기 취소
effects: [
  {
    watch: (ctx) => ctx.inputValue,
    change: (ctx, prev, curr, { send }) => {
      const controller = new AbortController()

      fetch(`/api?q=${curr}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => send('FETCH_SUCCESS', { data }))
        .catch(() => {})

      return () => controller.abort()
    }
  }
]
```

---

## Phase 2: 복합 watch

### 2-1. 얕은 비교 함수

**작업**:
1. `shallowEqual` 함수 구현
   ```ts
   function shallowEqual(a: unknown, b: unknown): boolean {
     if (a === b) return true
     if (Array.isArray(a) && Array.isArray(b)) {
       if (a.length !== b.length) return false
       return a.every((v, i) => v === b[i])
     }
     return false
   }
   ```
2. effects 비교 로직에서 `===` 대신 `shallowEqual` 사용

**검증**:
```ts
// 단위 테스트
shallowEqual([1, 2], [1, 2])  // true
shallowEqual([1, 2], [1, 3])  // false
shallowEqual([1], [1, 2])     // false
shallowEqual('a', 'a')        // true (기존 동작 유지)
shallowEqual(null, null)      // true
shallowEqual(undefined, undefined)  // true
```

**검증 (통합)**:
```ts
// 복합 watch 테스트
effects: [
  {
    watch: (ctx) => [ctx.inputValue, ctx.state] as const,
    change: (ctx, prev, curr, { send }) => {
      // inputValue 또는 state 변경 시 호출
    }
  }
]
```

---

## Phase 3: states 구조

### 3-1. states 타입 정의

**작업**:
1. `States` 타입 정의
   ```ts
   type StateConfig<TContext, TEvents, TComputed> = {
     on?: { [K in keyof TEvents]?: Handler<TContext & TComputed, TEvents[K]> }
   }

   type StatesConfig<TState extends string, TContext, TEvents, TComputed> = {
     [K in TState]: StateConfig<TContext, TEvents, TComputed>
   }
   ```

2. `EventMachine` 타입에 states 추가
   ```ts
   type EventMachine<TContext, TEvents, TComputed> = {
     computed?: { ... }
     on?: { ... }           // 전역 핸들러
     states?: StatesConfig  // 새로 추가
     effects?: Effect[]
     always?: Rule[]
     actions: { ... }
   }
   ```

---

### 3-2. states 실행 로직

**작업**:
1. `executeHandler` 수정 또는 새 함수 추가
2. send 시 실행 순서:
   ```ts
   function send(event, payload) {
     const state = ctx.state  // context에서 현재 state 가져옴

     // 1. state별 핸들러 먼저
     if (machine.states?.[state]?.on?.[event]) {
       executeHandler(machine.states[state].on[event], ...)
     }

     // 2. 전역 핸들러
     if (machine.on?.[event]) {
       executeHandler(machine.on[event], ...)
     }
   }
   ```

**검증**:
```ts
// 테스트 케이스
type State = 'idle' | 'loading' | 'open'
type Context = { state: State; ... }

const machine = createEventMachine({
  on: {
    FOCUS: 'handleFocus',  // 모든 state에서
  },

  states: {
    idle: {
      on: { OPEN: 'open' }
    },
    loading: {
      // 이벤트 없음 = 무시
    },
    open: {
      on: {
        CLOSE: 'close',
        KEY_ENTER: 'select'
      }
    }
  },

  actions: { ... }
})

// 검증:
// 1. idle에서 OPEN → open 실행
// 2. loading에서 KEY_ENTER → 무시
// 3. open에서 FOCUS → handleFocus 실행 (전역)
// 4. open에서 KEY_ENTER → select 실행 (state별)
```

---

### 3-3. 반환값에 state 추가

**현재**: `{ send, computed }`

**목표**: `{ send, computed, state }`

**작업**:
1. `useEventMachine` 반환값에 state 추가
   ```ts
   return {
     send,
     computed,
     state: ctx.state  // context에서 추출
   }
   ```

---

## Phase 4: 검증 및 문서화

### 4-1. 실제 컴포넌트로 검증

새 기능을 활용한 샘플 컴포넌트 구현:

1. **Async Combobox**
   - 비동기 fetch
   - race condition 처리 (change cleanup)
   - 복합 watch (inputValue + state)

2. **Hover Menu**
   - delayed transition (300ms)
   - effects에서 send

### 4-2. 가이드 문서 작성

1. **사용 패턴 가이드**
   - effects에서 send 올바른 사용법
   - 무한 루프 피하기
   - cleanup 패턴

2. **마이그레이션 가이드** (나중에 필요 시)
   - 기존 when guard → states 구조

---

## 구현 순서 요약

```
Phase 1-1: effects에 { send } 전달
    ↓
Phase 1-2: change cleanup 반환
    ↓
Phase 2-1: 얕은 비교 함수
    ↓
Phase 3-1: states 타입 정의
    ↓
Phase 3-2: states 실행 로직
    ↓
Phase 3-3: 반환값에 state 추가
    ↓
Phase 4: 검증 및 문서화
```

---

## 롤백 포인트

| Phase | 롤백 시 | 영향 |
|-------|---------|------|
| 1-1 | git revert | effects 기존대로 |
| 1-2 | 해당 코드만 제거 | 1-1은 유지 |
| 2-1 | 비교 로직만 롤백 | 복합 watch만 안 됨 |
| 3-* | states 코드 전체 제거 | Phase 1, 2는 유지 |
