# Discussion 03: Effects에서 Send 사용

> DISCUSSION-01에서 도출된 "비동기 처리" 문제 해결 방안

## 문제

effects에서 send에 접근할 수 없어서 setter를 직접 호출해야 함 → when 조건 우회됨

```ts
// 문제: setter 직접 호출
effects: [
  {
    watch: (ctx) => ctx.hoveredTriggerId,
    enter: (ctx) => {
      setTimeout(() => {
        ctx.setOpen(true)  // when 조건 우회됨
      }, 300)
    }
  }
]
```

**파생 문제들**:
- Delayed transition (300ms hover 후 열기)
- 비동기 결과 처리 (API 호출 후 이벤트 발행)
- Machine 간 통신

---

## 해결: effects 콜백에 send 전달

effects의 enter, exit, change 콜백에 `{ send }`를 두 번째 인자로 전달:

```ts
effects: [
  // Delayed transition
  {
    watch: (ctx) => ctx.hoveredId,
    enter: (ctx, { send }) => {
      const timer = setTimeout(() => send('OPEN_SUBMENU'), 300)
      return () => clearTimeout(timer)
    }
  },

  // 비동기 처리
  {
    watch: (ctx) => ctx.inputValue,
    change: async (ctx, prev, curr, { send }) => {
      const results = await fetchOptions(curr)
      send('FETCH_SUCCESS', { results })
    }
  },

  // 상태 전이 시 이벤트 발행
  {
    watch: (ctx) => ctx.state,
    change: (ctx, prev, curr, { send }) => {
      if (prev === 'loading' && curr === 'open') {
        send('LOADING_COMPLETE')
      }
    }
  }
]
```

---

## 설계 결정

### 1. 왜 context가 아닌 별도 인자인가?

```ts
// A. context에 send 포함 - 채택 안 함
enter: (ctx) => {
  ctx.send('EVENT')
}

// B. 별도 인자로 전달 - 채택
enter: (ctx, { send }) => {
  send('EVENT')
}
```

**이유**:
- context는 외부에서 주입되는 상태
- send는 machine 내부 메커니즘
- 관심사 분리

### 2. Machine 완결성

**필수 조건**: machine만으로 모든 로직 처리 가능해야 함

```ts
// Machine만으로 완결
const machine = createEventMachine({
  effects: [
    {
      watch: (ctx) => ctx.inputValue,
      change: async (ctx, prev, curr, { send }) => {
        send('FETCH_START')
        try {
          const results = await fetchOptions(curr)
          send('FETCH_SUCCESS', { results })
        } catch {
          send('FETCH_ERROR')
        }
      }
    }
  ],

  on: {
    FETCH_START: 'setLoading',
    FETCH_SUCCESS: 'setResults',
    FETCH_ERROR: 'showError'
  }
})
```

### 3. Shell에서 처리는 선택

Shell에서 비동기 처리하는 것도 가능 (편의):

```ts
// Shell - 비동기를 여기서 처리해도 됨
useEffect(() => {
  if (debouncedInput) {
    setIsLoading(true)
    fetchOptions(debouncedInput)
      .then(results => {
        setOptions(results)
        send('FETCH_SUCCESS')
      })
      .finally(() => setIsLoading(false))
  }
}, [debouncedInput])
```

**요약**:
- Machine만으로 가능 = 필수
- Shell에서 처리 = 선택 (편의)

---

## 콜백 시그니처 변경

```ts
// Before
type Effect<TContext, TWatched> = {
  watch: (ctx: TContext) => TWatched
  enter?: (ctx: TContext) => void | (() => void)
  exit?: (ctx: TContext) => void
  change?: (ctx: TContext, prev: TWatched, curr: TWatched) => void
}

// After
type Cleanup = () => void
type EffectHelpers<TEvents> = {
  send: Send<TEvents>
}

type Effect<TContext, TEvents, TWatched> = {
  watch: (ctx: TContext) => TWatched
  enter?: (ctx: TContext, helpers: EffectHelpers<TEvents>) => void | Cleanup
  exit?: (ctx: TContext, helpers: EffectHelpers<TEvents>) => void
  change?: (ctx: TContext, prev: TWatched, curr: TWatched, helpers: EffectHelpers<TEvents>) => void | Cleanup
}
```

---

## 비동기 취소 (Race Condition 처리)

### 문제

비동기 도중 state가 바뀌면 stale response 문제 발생:

```ts
// 문제 시나리오
// 1. inputValue가 "abc"로 바뀜 → fetch 시작
// 2. 도중에 state가 'open' → 'closed'로 바뀜
// 3. fetch 완료 → FETCH_SUCCESS 발행 → 이미 닫힌 상태에서 결과 처리?
```

### 해결: change도 cleanup 반환

enter처럼 change도 cleanup 함수를 반환할 수 있게 함:

```ts
effects: [
  {
    watch: (ctx) => ctx.inputValue,
    change: (ctx, prev, curr, { send }) => {
      const controller = new AbortController()

      fetchOptions(curr, { signal: controller.signal })
        .then(results => send('FETCH_SUCCESS', { results }))
        .catch(err => {
          if (err.name !== 'AbortError') send('FETCH_ERROR')
        })

      return () => controller.abort()  // cleanup
    }
  }
]
```

**동작**:
- `inputValue`가 바뀌면 이전 change의 cleanup 호출 → 이전 fetch 취소
- 새 change 실행 → 새 fetch 시작
- state가 바뀌어도 watch 값이 바뀌면 cleanup 호출됨

---

## 해결되는 문제

| 문제 | 해결 |
|------|------|
| Delayed transition | `setTimeout` + `send` |
| 비동기 결과 처리 | `async/await` + `send` |
| when 조건 우회 | send로 이벤트 발행 → on 핸들러 거침 |

---

## 다음 단계

1. **API 구현**: effects 콜백에 `{ send }` 전달하도록 수정
2. **DISCUSSION-02 구현**: states 구조 지원
3. **실제 컴포넌트로 검증**: Async Combobox, Nested Menu
