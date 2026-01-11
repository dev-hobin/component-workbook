# Event Machine

이벤트 기반 상태 관리 시스템.

---

## 개요

```typescript
// 1. Machine 정의
const machine = createEventMachine<{
  input: MyInput
  events: MyEvents
  actions: 'open' | 'close'
}>({
  on: { ... },
  actions: { ... },
})

// 2. React에서 사용
const { send, computed } = useEventMachine(machine, input)
```

---

## createEventMachine

Machine을 정의합니다.

```typescript
createEventMachine<T extends MachineTypes>(config: EventMachine<T>): MachineInstance<T>
```

### MachineTypes

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `input` | `object` | O | Shell에서 전달받는 값 |
| `events` | `Record<string, payload>` | O | 이벤트 정의 |
| `actions` | `string union` | O | 액션 이름 |
| `computed` | `object` | X | 파생값 타입 |
| `state` | `string union` | X | 상태 타입 (states 사용 시) |

### Config

| 필드 | 설명 |
|------|------|
| `on` | 이벤트 → 액션 매핑 |
| `actions` | 액션 구현 |
| `computed` | 파생값 정의 |
| `effects` | 부수효과 정의 |
| `states` | 상태별 이벤트 핸들러 |
| `always` | 자동 평가 규칙 |

### MachineInstance 반환값

| 메서드 | 설명 |
|--------|------|
| `send(event, input, payload?)` | 이벤트 발송 (vanilla) |
| `evaluate(input)` | effects/always 평가 |
| `getComputed(input)` | computed 값 계산 |
| `cleanup()` | effect cleanup 실행 |

---

## Input

Shell에서 Machine으로 전달하는 값.

```typescript
type MyInput = {
  // 상태값
  value: string
  isOpen: boolean

  // 상태 변경 콜백 (onXXXChange 네이밍)
  onValueChange: (value: string) => void
  onOpenChange: (open: boolean) => void

  // 옵션
  disabled: boolean

  // DOM 접근 헬퍼 (lazy evaluation)
  getElement: (id: string) => HTMLElement | null
}
```

---

## Events

이벤트 타입 정의.

```typescript
type MyEvents = {
  OPEN: undefined               // payload 없음
  CLOSE: undefined
  SELECT: { itemId: string }    // payload 있음
}
```

---

## on

이벤트와 액션을 연결합니다.

### 단순 매핑

```typescript
on: {
  OPEN: 'open',
  CLOSE: 'close',
}
```

### 복수 액션 실행

배열로 여러 액션을 순차 실행합니다.

```typescript
on: {
  SELECT: ['select', 'close'],  // select 후 close 실행
}
```

### 조건부 액션 (Rule[])

Rule 배열로 정의. 첫 번째 매칭 규칙만 실행됩니다.

```typescript
on: {
  TOGGLE: [
    { when: (context) => context.disabled, do: 'noop' },
    { when: (context) => context.isOpen, do: 'close' },
    { do: 'open' },  // fallback (when 생략)
  ],
}
```

### 조건부 + 복수 액션

Rule의 `do`에도 배열을 사용할 수 있습니다.

```typescript
on: {
  CONFIRM: [
    { when: (context) => !context.isValid, do: 'showError' },
    { do: ['save', 'close', 'notify'] },  // 복수 액션
  ],
}
```

### Rule 타입

```typescript
type Rule<TContext, TPayload, TActions> = {
  when?: (context: TContext, payload: TPayload) => boolean
  do: TActions | TActions[]  // 단일 또는 복수
}
```

### Handler 타입

```typescript
type Handler<TContext, TPayload, TActions> =
  | TActions           // 단일 액션: 'open'
  | TActions[]         // 복수 액션: ['select', 'close']
  | Rule<...>[]        // 조건부: [{ when: ..., do: ... }]
```

---

## actions

액션 구현. context를 받아 콜백을 호출합니다.

```typescript
actions: {
  noop: () => {},

  open: (context) => {
    context.onOpenChange(true)
  },

  close: (context) => {
    context.onOpenChange(false)
  },

  // payload 사용
  select: (context, payload: { itemId: string }) => {
    context.onValueChange(payload.itemId)
  },
}
```

---

## computed

Input에서 파생되는 값. input만 받습니다 (context 아님).

### 정의

```typescript
createEventMachine<{
  input: { page: number; totalCount: number; pageSize: number }
  computed: { totalPages: number; hasPrev: boolean; hasNext: boolean }
  // ...
}>({
  computed: {
    totalPages: (input) => Math.ceil(input.totalCount / input.pageSize),
    hasPrev: (input) => input.page > 1,
    hasNext: (input) => input.page < Math.ceil(input.totalCount / input.pageSize),
  },
})
```

### 사용

```typescript
// on/actions에서 context로 접근
on: {
  PREV: [{ when: (context) => context.hasPrev, do: 'prev' }],
}

// Shell에서 사용
const { computed } = useEventMachine(machine, input)
// computed.totalPages, computed.hasPrev, computed.hasNext
```

---

## effects

값 변화를 감시하고 부수효과를 실행합니다.

### 구조

```typescript
effects: [
  {
    watch: (context) => ...,    // 감시할 값
    enter: (context, helpers) => ...,   // truthy 될 때
    exit: (context, helpers) => ...,    // falsy 될 때
    change: (context, prev, curr, helpers) => ...,  // 변경될 때마다
  },
]
```

### watch

감시할 값을 반환합니다.

```typescript
watch: (context) => context.isOpen           // 단일 값
watch: (context) => context.focusedId        // nullable 값
watch: (context) => [context.a, context.b]   // 배열 (shallow equal)
```

### enter

watch 값이 `falsy → truthy` 될 때 실행. cleanup 함수를 반환할 수 있습니다.

```typescript
enter: (context, helpers) => {
  const handler = () => context.onOpenChange(false)
  document.addEventListener('pointerdown', handler)

  // cleanup (truthy → falsy 시 또는 언마운트 시 실행)
  return () => {
    document.removeEventListener('pointerdown', handler)
  }
}
```

### exit

watch 값이 `truthy → falsy` 될 때 실행. cleanup 함수를 반환할 수 있습니다.

```typescript
exit: (context, helpers) => {
  console.log('closed')
}
```

### change

watch 값이 변경될 때마다 실행. cleanup 함수를 반환할 수 있습니다.

```typescript
change: (context, prev, curr, helpers) => {
  if (curr) {
    context.getElement(curr)?.focus()
  }
}
```

### EffectHelpers

effects 콜백에서 이벤트를 발송할 수 있습니다.

```typescript
type EffectHelpers<TEvents> = {
  send: Send<TEvents>
}

// 사용
enter: (context, helpers) => {
  helpers.send('FOCUS_FIRST')
}
```

### effect() 헬퍼 함수

타입 추론을 위한 헬퍼 함수.

```typescript
import { effect } from '../../event-machine'

effects: [
  effect<MyContext, MyEvents, string | null>({
    watch: (ctx) => ctx.focusedId,
    change: (ctx, prev, curr) => {
      // prev, curr 타입이 string | null로 추론됨
    },
  }),
]
```

---

## states

상태별로 다른 이벤트 핸들러를 정의합니다.

### 정의

```typescript
createEventMachine<{
  input: { state: 'open' | 'closed'; onStateChange: (s: string) => void }
  events: { OPEN: undefined; CLOSE: undefined; TOGGLE: undefined }
  state: 'open' | 'closed'  // state 타입 명시
  actions: 'open' | 'close'
}>({
  states: {
    closed: {
      on: {
        OPEN: 'open',
        TOGGLE: 'open',
        // CLOSE는 무시됨
      },
    },
    open: {
      on: {
        CLOSE: 'close',
        TOGGLE: 'close',
        // OPEN은 무시됨
      },
    },
  },
  actions: {
    open: (ctx) => ctx.onStateChange('open'),
    close: (ctx) => ctx.onStateChange('closed'),
  },
})
```

### state 결정

input에 `state` 필드가 있어야 합니다.

```typescript
const { send } = useEventMachine(machine, {
  state: currentState,  // 'open' | 'closed'
  onStateChange: setCurrentState,
})
```

### 실행 순서

1. `states[currentState].on[event]` 실행
2. `on[event]` 실행 (전역 핸들러)

---

## always

context가 변경될 때마다 자동으로 평가되는 규칙.

```typescript
always: [
  { when: (context) => context.value > 100, do: 'clampMax' },
  { when: (context) => context.value < 0, do: 'clampMin' },
]
```

**주의**: 렌더링 중에 동기적으로 실행됩니다.

---

## useEventMachine

React에서 Machine을 사용합니다.

```typescript
function useEventMachine<T>(
  machine: EventMachine<T>,
  input: T['input'],
): {
  send: Send<Events<T>>
  computed: Computed<T>
  state: State<T>
}
```

### 반환값

| 필드 | 타입 | 설명 |
|------|------|------|
| `send` | `(event, payload?) => void` | 이벤트 발송 |
| `computed` | `object` | 파생값 객체 |
| `state` | `string` | 현재 상태 (states 사용 시) |

### send

```typescript
send('OPEN')
send('SELECT', { itemId: 'item-1' })
```

---

## Send 타입

```typescript
type Send<TEvents> = <K extends keyof TEvents>(
  event: K,
  ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
) => void
```

---

## 전체 예시

### 기본 패턴

```typescript
const toggleMachine = createEventMachine<{
  input: { isOn: boolean; onIsOnChange: (v: boolean) => void }
  events: { TOGGLE: undefined }
  actions: 'toggle'
}>({
  on: {
    TOGGLE: 'toggle',
  },
  actions: {
    toggle: (context) => context.onIsOnChange(!context.isOn),
  },
})
```

### Computed 패턴

```typescript
const paginationMachine = createEventMachine<{
  input: { page: number; totalCount: number; pageSize: number; onPageChange: (p: number) => void }
  events: { PREV: undefined; NEXT: undefined }
  computed: { totalPages: number; hasPrev: boolean; hasNext: boolean }
  actions: 'prev' | 'next'
}>({
  computed: {
    totalPages: (input) => Math.ceil(input.totalCount / input.pageSize),
    hasPrev: (input) => input.page > 1,
    hasNext: (input) => input.page < Math.ceil(input.totalCount / input.pageSize),
  },
  on: {
    PREV: [{ when: (ctx) => ctx.hasPrev, do: 'prev' }],
    NEXT: [{ when: (ctx) => ctx.hasNext, do: 'next' }],
  },
  actions: {
    prev: (context) => context.onPageChange(context.page - 1),
    next: (context) => context.onPageChange(context.page + 1),
  },
})
```

### Effects 패턴

```typescript
const dropdownMachine = createEventMachine<{
  input: {
    isOpen: boolean
    onIsOpenChange: (v: boolean) => void
    focusedId: string | null
    onFocusedIdChange: (id: string | null) => void
    getElement: (id: string) => HTMLElement | null
  }
  events: { OPEN: undefined; CLOSE: undefined }
  actions: 'open' | 'close'
}>({
  on: {
    OPEN: 'open',
    CLOSE: 'close',
  },
  effects: [
    {
      watch: (ctx) => ctx.isOpen,
      enter: (context) => {
        const handler = () => context.onIsOpenChange(false)
        document.addEventListener('pointerdown', handler)
        return () => document.removeEventListener('pointerdown', handler)
      },
    },
    {
      watch: (ctx) => ctx.focusedId,
      change: (context) => {
        if (context.focusedId) {
          context.getElement(context.focusedId)?.focus()
        }
      },
    },
  ],
  actions: {
    open: (context) => context.onIsOpenChange(true),
    close: (context) => context.onIsOpenChange(false),
  },
})
```
