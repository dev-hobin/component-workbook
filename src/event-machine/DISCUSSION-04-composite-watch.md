# Discussion 04: 복합 Watch의 필요성

> DISCUSSION-03에서 파생된 논의

## 문제

단일 값만 watch하면 관련된 다른 값이 바뀌어도 cleanup이 호출되지 않음:

```ts
effects: [
  {
    watch: (ctx) => ctx.inputValue,
    change: (ctx, prev, curr, { send }) => {
      const controller = new AbortController()

      fetchOptions(curr, { signal: controller.signal })
        .then(results => send('FETCH_SUCCESS', { results }))
        .catch(() => {})

      return () => controller.abort()
    }
  }
]
```

### 문제 시나리오

1. `inputValue`가 "abc" → fetch 시작
2. state가 'open' → 'closed'로 바뀜 (드롭다운 닫힘)
3. `inputValue`는 그대로 "abc"
4. **watch 값 변화 없음 → cleanup 안 불림 → fetch 계속 진행**
5. fetch 완료 → 닫힌 상태에서 `FETCH_SUCCESS` 발행

---

## 해결: 복합 Watch

여러 값을 함께 watch:

```ts
effects: [
  {
    // 둘 중 하나라도 바뀌면 cleanup + 재실행
    watch: (ctx) => [ctx.inputValue, ctx.state] as const,
    change: (ctx, prev, curr, { send }) => {
      // curr[0]: inputValue, curr[1]: state
      if (ctx.state !== 'open') return  // closed면 fetch 안 함

      const controller = new AbortController()

      fetchOptions(curr[0], { signal: controller.signal })
        .then(results => send('FETCH_SUCCESS', { results }))
        .catch(() => {})

      return () => controller.abort()
    }
  }
]
```

---

## 동작

| 변화 | 결과 |
|------|------|
| inputValue만 바뀜 | cleanup → 새 fetch |
| state만 바뀜 | cleanup → (closed면 fetch 안 함) |
| 둘 다 바뀜 | cleanup → 새 fetch 또는 안 함 |

---

## 구현 고려사항

### 얕은 비교 (Shallow Compare)

배열/객체를 watch할 때 참조가 아닌 값 비교 필요:

```ts
// 현재: 참조 비교
if (prev !== curr) { ... }

// 필요: 얕은 비교
function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return false
}
```

### 타입 안전성

```ts
type Effect<TContext, TEvents, TWatched> = {
  watch: (ctx: TContext) => TWatched
  change?: (
    ctx: TContext,
    prev: TWatched | undefined,
    curr: TWatched,
    helpers: EffectHelpers<TEvents>
  ) => void | Cleanup
}

// 사용
effects: [
  {
    watch: (ctx) => [ctx.inputValue, ctx.state] as const,
    change: (ctx, prev, curr) => {
      // prev: readonly [string, State] | undefined
      // curr: readonly [string, State]
    }
  }
]
```

---

## 대안 검토

### A. 별도 effect로 분리

```ts
effects: [
  // inputValue 변화 시 fetch
  {
    watch: (ctx) => ctx.inputValue,
    change: (ctx, prev, curr, { send }) => { ... }
  },
  // state 변화 시 취소 이벤트 발행
  {
    watch: (ctx) => ctx.state,
    change: (ctx, prev, curr, { send }) => {
      if (prev === 'open' && curr !== 'open') {
        send('CANCEL_FETCH')
      }
    }
  }
]
```

**단점**: 두 effect 간 조율 필요, 취소 로직 분산

### B. 복합 watch (채택)

**장점**:
- 관련 값들을 한 곳에서 관리
- cleanup이 자연스럽게 동작
- 로직 응집도 높음

---

## 결론

복합 watch 지원 필요:
- `watch: (ctx) => [a, b, c]` 형태
- 배열 요소 중 하나라도 바뀌면 cleanup + 재실행
- 얕은 비교로 변화 감지
