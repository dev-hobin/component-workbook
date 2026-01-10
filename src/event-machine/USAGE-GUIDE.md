# Event Machine 사용 가이드

> 새로 추가된 기능들의 올바른 사용법

## 목차

1. [effects에서 send 사용](#1-effects에서-send-사용)
2. [cleanup 패턴](#2-cleanup-패턴)
3. [복합 watch](#3-복합-watch)
4. [states 구조](#4-states-구조)
5. [무한 루프 피하기](#5-무한-루프-피하기)

---

## 1. effects에서 send 사용

effects의 `enter`, `exit`, `change` 콜백에서 `send`를 사용할 수 있습니다.

### 기본 사용법

```ts
effects: [
  {
    watch: (ctx) => ctx.hoveredId,
    enter: (ctx, { send }) => {
      // 300ms 후 OPEN 이벤트 발송
      const timer = setTimeout(() => send('OPEN'), 300)
      return () => clearTimeout(timer)
    },
    exit: (ctx, { send }) => {
      send('CLOSE')
    },
    change: (ctx, prev, curr, { send }) => {
      send('VALUE_CHANGED', { prev, curr })
    }
  }
]
```

### 비동기 fetch 예제

```ts
effects: [
  {
    watch: (ctx) => ctx.searchQuery,
    change: (ctx, prev, curr, { send }) => {
      if (!curr) return

      const controller = new AbortController()

      fetch(`/api/search?q=${curr}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => send('FETCH_SUCCESS', { data }))
        .catch(err => {
          if (!controller.signal.aborted) {
            send('FETCH_ERROR', { error: err.message })
          }
        })

      // cleanup: 다음 요청 전에 이전 요청 취소
      return () => controller.abort()
    }
  }
]
```

---

## 2. cleanup 패턴

`enter`와 `change`는 cleanup 함수를 반환할 수 있습니다.

### enter cleanup

```ts
effects: [
  {
    watch: (ctx) => ctx.isHovering,
    enter: (ctx, { send }) => {
      // truthy가 됐을 때 실행
      const timer = setTimeout(() => send('DELAYED_ACTION'), 300)

      // cleanup: falsy가 되거나 언마운트 시 실행
      return () => clearTimeout(timer)
    }
  }
]
```

### change cleanup

```ts
effects: [
  {
    watch: (ctx) => ctx.value,
    change: (ctx, prev, curr, { send }) => {
      // 값이 바뀔 때마다 실행
      const subscription = subscribe(curr, (data) => {
        send('DATA_RECEIVED', { data })
      })

      // cleanup: 다음 change 전에 실행
      return () => subscription.unsubscribe()
    }
  }
]
```

### cleanup 실행 순서

```
1. 값 변경 감지
2. 이전 change cleanup 실행 (있으면)
3. 새 change 콜백 실행
4. enter/exit 처리 (truthy/falsy 전환 시)
```

---

## 3. 복합 watch

배열을 반환하여 여러 값을 동시에 감시할 수 있습니다.

### 기본 사용법

```ts
effects: [
  {
    // 둘 중 하나라도 바뀌면 change 호출
    watch: (ctx) => [ctx.inputValue, ctx.selectedId] as const,
    change: (ctx, prev, [inputValue, selectedId]) => {
      console.log('inputValue:', inputValue)
      console.log('selectedId:', selectedId)
    }
  }
]
```

### 비교 로직

- 배열: 길이 + 각 요소 `===` 비교 (shallowEqual)
- 그 외: `===` 비교

```ts
// 같음
[1, 2] vs [1, 2]  // true
'a' vs 'a'        // true

// 다름
[1, 2] vs [1, 3]  // false
[1] vs [1, 2]     // false
```

---

## 4. states 구조

state별로 다른 이벤트 핸들러를 정의할 수 있습니다.

### 기본 구조

```ts
const machine = createEventMachine<Context, Events, Computed, Actions, State>({
  // 전역 핸들러 (모든 state에서)
  on: {
    FOCUS: 'handleFocus',
  },

  // state별 핸들러
  states: {
    idle: {
      on: {
        OPEN: 'handleOpen',
      }
    },
    loading: {
      // 핸들러 없음 = 해당 이벤트 무시
    },
    open: {
      on: {
        CLOSE: 'handleClose',
        SELECT: 'handleSelect',
      }
    }
  },

  actions: { ... }
})
```

### 실행 순서

1. **state별 핸들러 먼저** 실행
2. **전역 핸들러 나중에** 실행
3. 둘 다 있으면 **둘 다 실행** (override 아님)

```ts
// open 상태에서 FOCUS 이벤트
// 1. states.open.on.FOCUS (있으면) 실행
// 2. on.FOCUS (있으면) 실행
```

### Context에서 state 가져오기

```ts
type Context = {
  state: 'idle' | 'loading' | 'open'
  setState: (s: State) => void
  // ...
}

// machine은 ctx.state를 참조
function send(event, payload) {
  const state = ctx.state  // 현재 state
  if (machine.states?.[state]?.on?.[event]) {
    // state별 핸들러 실행
  }
}
```

### useEventMachine 반환값

```ts
const { send, computed, state } = useEventMachine(machine, ctx)

// state는 ctx.state에서 추출됨
console.log(state)  // 'idle' | 'loading' | 'open' | undefined
```

---

## 5. 무한 루프 피하기

effects에서 send를 잘못 사용하면 무한 루프가 발생할 수 있습니다.

### 위험한 패턴

```ts
// BAD: 무한 루프 발생
effects: [
  {
    watch: (ctx) => ctx.count,
    change: (ctx, prev, curr, { send }) => {
      // count가 바뀌면 INCREMENT 발송
      // INCREMENT가 count를 바꿈
      // count가 바뀌면 INCREMENT 발송...
      send('INCREMENT')  // 무한 루프!
    }
  }
]
```

### 안전한 패턴

```ts
// GOOD: 조건 체크로 루프 방지
effects: [
  {
    watch: (ctx) => ctx.count,
    change: (ctx, prev, curr, { send }) => {
      // 특정 조건에서만 발송
      if (curr > 0 && curr % 10 === 0) {
        send('MILESTONE_REACHED', { count: curr })
      }
    }
  }
]

// GOOD: 다른 값 변경만 감시
effects: [
  {
    watch: (ctx) => ctx.inputValue,
    change: (ctx, prev, curr, { send }) => {
      // inputValue가 바뀌면 검색 시작
      // FETCH_SUCCESS는 items를 바꿈 (inputValue 아님)
      send('SEARCH', { query: curr })
    }
  }
]
```

### 체크리스트

- [ ] send가 watch 대상을 변경하는가?
- [ ] 조건 없이 항상 send하는가?
- [ ] state 전환이 다시 같은 effect를 트리거하는가?

---

## 예제 컴포넌트

### AsyncCombobox

- 비동기 fetch + race condition 처리
- 복합 watch `[inputValue, state]`
- states 구조 `idle → loading → open`

```
src/event-machine/__tests__/examples/AsyncCombobox.tsx
```

### HoverMenu

- Delayed open/close (300ms/200ms)
- enter/exit cleanup으로 타이머 관리
- states 구조 `idle → hovering → open`

```
src/event-machine/__tests__/examples/HoverMenu.tsx
```
