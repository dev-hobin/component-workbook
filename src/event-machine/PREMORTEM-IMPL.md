# 구현 프리모템: DISCUSSION 결론 구현

> 목적: 실패 케이스를 미리 파악하고, 실패해도 쉽게 돌아갈 수 있는 구현 계획 수립

## 구현할 것 (DISCUSSION 결론)

| # | 기능 | 설명 |
|---|------|------|
| 02 | state 기반 구조 | `states` 추가, state별 → 전역 순서, 둘 다 실행 |
| 03 | effects에서 send | 콜백에 `{ send }` 전달, change도 cleanup 반환 |
| 04 | 복합 watch | 배열 watch, 얕은 비교 |

---

## Part 1. 실패 케이스

### 실패 1: 타입 복잡도 폭발

**시나리오**: 제네릭이 너무 많아져서 사용성 저하

```ts
// 현재
createEventMachine<TContext, TEvents, TComputed>

// 추가되면
createEventMachine<TContext, TEvents, TComputed, TState, TActions>

// 사용 시
const machine = createEventMachine<
  ComboboxContext,
  ComboboxEvents,
  ComboboxComputed,
  ComboboxState,
  ComboboxActions
>({ ... })  // 너무 장황함
```

**위험도**: 높음
**영향**: DX 저하, 타입 추론 실패

**→ 해결책**: 타입 추론 우선 전략
```ts
// State는 context.state 타입에서 추론
// Actions는 actions 객체 키에서 추론
// 제네릭 명시 최소화
type Context = { state: 'idle' | 'open'; ... }
const machine = createEventMachine({ ... })  // 추론됨
```

---

### 실패 2: 기존 컴포넌트 마이그레이션 실패

**시나리오**: 새 API가 기존 패턴과 호환 안 됨

```ts
// 기존 accordion machine
on: {
  TOGGLE: [
    { when: (ctx) => ctx.disabled, do: 'noop' },
    { do: 'toggle' }
  ]
}

// 새 구조로 바꾸려면?
// state를 어떻게 정의? disabled도 state인가?
```

**위험도**: ~~높음~~ 낮음
**영향**: ~~전체 리팩토링 필요, 롤백 어려움~~

**→ 해결책**: 브레이킹 체인지 허용
```ts
// 아직 사용처가 없으므로 API 변경 자유로움
// 깔끔한 API 우선, 호환성 고려 불필요
```

---

### 실패 3: 점진적 도입 불가

**시나리오**: states가 있으면 on이 다르게 동작, 혼용 불가

```ts
// 문제: states 없이도 기존처럼 동작해야 함
// states 있으면 새 방식으로 동작

// 두 모드가 공존하면 코드 복잡도 증가
if (machine.states) {
  // 새 방식
} else {
  // 기존 방식
}
```

**위험도**: 중간
**영향**: 구현 복잡도 증가

**→ 해결책**: 단계별 구현 + 각 단계 검증
```ts
// Phase 1: effects 확장 (기존 호환)
// Phase 2: states 추가 (새 기능)
// Phase 3: 마이그레이션 (선택)
// 각 단계가 독립적으로 동작하도록 구현
```

---

### 실패 4: 얕은 비교 버그

**시나리오**: 복합 watch에서 예상치 못한 동작

```ts
// 의도: inputValue나 state가 바뀌면 재실행
watch: (ctx) => [ctx.inputValue, ctx.state]

// 문제 1: 매 렌더마다 새 배열 생성 → 항상 다름?
// 문제 2: 객체가 포함되면? { a: 1 } !== { a: 1 }
// 문제 3: undefined 처리?
```

**위험도**: 중간
**영향**: 무한 루프 또는 effect 미실행

**→ 해결책**: 얕은 비교 함수 + 단위 테스트
```ts
function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return false
}

// 단위 테스트로 엣지 케이스 검증
// - 빈 배열
// - undefined 포함
// - 원시값 vs 객체
```

---

### 실패 5: send 무한 루프

**시나리오**: effects에서 send → state 변경 → effects 재실행 → send...

```ts
effects: [
  {
    watch: (ctx) => ctx.state,
    change: (ctx, prev, curr, { send }) => {
      send('SOME_EVENT')  // state 변경 유발
      // → watch 값 변경 → change 재실행 → 무한 루프
    }
  }
]
```

**위험도**: 높음
**영향**: 앱 크래시

**→ 해결책**: 설계로 방지 + 가이드 제공

무한 루프가 자주 발생하면 기능 설계 문제임. 안전장치보다 올바른 사용 패턴 가이드 제공:

```ts
// ❌ 잘못된 패턴: state watch → send → state 변경 → 무한루프
effects: [
  {
    watch: (ctx) => ctx.state,
    change: (ctx, prev, curr, { send }) => {
      send('SOME_EVENT')  // state 변경 유발하면 안 됨
    }
  }
]

// ✅ 올바른 패턴: 특정 전이에만 반응
effects: [
  {
    watch: (ctx) => ctx.state,
    change: (ctx, prev, curr, { send }) => {
      // 특정 전이에만, state 변경 없는 액션만
      if (prev === 'loading' && curr === 'open') {
        send('FOCUS_FIRST_ITEM')  // state 변경 없는 사이드이펙트
      }
    }
  }
]
```

**문서화 필요**:
- effects에서 send 시 state 변경 주의
- state watch → state 변경 send는 피할 것

---

### 실패 6: cleanup 타이밍 문제

**시나리오**: cleanup이 호출될 때 이미 컴포넌트 언마운트

```ts
change: (ctx, prev, curr, { send }) => {
  fetchData().then(() => {
    send('SUCCESS')  // 이미 언마운트됨 → 에러?
  })

  return () => { /* abort */ }
}
```

**위험도**: 중간
**영향**: React 경고, 메모리 누수

**→ 해결책**: 언마운트 안전 장치
```ts
// useEventMachine 내부
const isMountedRef = useRef(true)

useEffect(() => {
  return () => { isMountedRef.current = false }
}, [])

const safeSend = useCallback((event, payload) => {
  if (!isMountedRef.current) return
  send(event, payload)
}, [send])

// effects에는 safeSend 전달
```

---

## Part 2. 실패 방지 전략

### 전략 1: 기존 API 100% 호환 유지

```ts
// states 없으면 기존과 완전히 동일하게 동작
const machine = createEventMachine({
  on: { ... },        // 기존 방식 그대로
  effects: [ ... ],   // 기존 방식 그대로
  actions: { ... }
})

// states 있으면 새 기능 활성화
const machine = createEventMachine({
  on: { ... },        // 전역 핸들러
  states: { ... },    // 새 기능
  effects: [ ... ],
  actions: { ... }
})
```

**검증**: 기존 테스트 전부 통과해야 함

---

### 전략 2: 단계별 구현 + 각 단계 검증

| 단계 | 구현 | 검증 | 롤백 가능? |
|------|------|------|-----------|
| 1 | effects에 { send } 전달 | 기존 테스트 통과 | ✅ 쉬움 |
| 2 | change cleanup 반환 | 새 테스트 추가 | ✅ 쉬움 |
| 3 | 얕은 비교 함수 | 단위 테스트 | ✅ 쉬움 |
| 4 | states 구조 추가 | 새 컴포넌트로 검증 | ✅ 가능 |
| 5 | 기존 컴포넌트 마이그레이션 | 하나씩 | ✅ 가능 |

---

### 전략 3: 타입 추론 우선

```ts
// 제네릭 명시 최소화
const machine = createEventMachine({
  // state는 context.state에서 추론
  // actions는 actions 객체에서 추론
  // events는 on 키에서 추론
})

// 필요하면 타입만 별도 정의
type Context = { state: 'idle' | 'open'; ... }
```

---

### 전략 4: 무한 루프 방지 장치

```ts
// 구현 시 재진입 방지
let isProcessing = false

function send(event) {
  if (isProcessing) {
    console.warn('send called during event processing')
    return  // 또는 큐에 넣기
  }
  isProcessing = true
  // ... 처리
  isProcessing = false
}
```

---

### 전략 5: 언마운트 안전 장치

```ts
// useEventMachine 내부
const isMountedRef = useRef(true)

useEffect(() => {
  return () => { isMountedRef.current = false }
}, [])

const safeSend = (event) => {
  if (!isMountedRef.current) return
  send(event)
}

// effects에는 safeSend 전달
```

---

## Part 3. 구현 순서

### Phase 1: 안전한 확장 (기존 호환 유지)

1. **effects에 { send } 전달**
   - 기존 시그니처: `(ctx) => ...`
   - 새 시그니처: `(ctx, { send }) => ...`
   - 기존 코드는 두 번째 인자 안 쓰면 됨 → 호환

2. **change cleanup 반환**
   - 기존: void만 반환
   - 새로: void | Cleanup 반환
   - 호환됨

3. **얕은 비교 함수 추가**
   - 내부 구현 변경
   - 외부 API 변화 없음

### Phase 2: 새 기능 추가

4. **states 구조 추가**
   - 새 필드, 기존에 영향 없음
   - 새 컴포넌트에서 먼저 검증

### Phase 3: 마이그레이션

5. **기존 컴포넌트 하나씩 마이그레이션**
   - accordion → combobox → tabs → ...
   - 각 단계에서 동작 확인

---

## Part 4. 롤백 계획

| 상황 | 롤백 방법 |
|------|----------|
| Phase 1 실패 | git revert, 기존 코드로 복귀 |
| Phase 2 실패 | states 코드만 제거, Phase 1은 유지 |
| Phase 3 실패 | 해당 컴포넌트만 이전 버전으로 |

---

## 체크리스트

구현 전 확인:
- [ ] 기존 테스트 모두 통과하는지 확인
- [ ] 타입 추론이 잘 되는지 간단한 예제로 확인

각 Phase 후 확인:
- [ ] 기존 테스트 통과
- [ ] 새 기능 테스트 통과
- [ ] 타입 에러 없음
- [ ] 무한 루프 없음 (dev에서 확인)
