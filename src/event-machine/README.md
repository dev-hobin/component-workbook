# Event Machine

외부 상태와 결합되는 선언적 이벤트 핸들러

```ts
import { createEventMachine, useEventMachine } from './event-machine'

const machine = createEventMachine<Context, Events>({
  on: {
    OPEN: 'open',
    CLOSE: 'close',
  },
  actions: {
    open: (ctx) => ctx.setIsOpen(true),
    close: (ctx) => ctx.setIsOpen(false),
  },
})

function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { send } = useEventMachine(machine, { isOpen, setIsOpen })

  return <button onClick={() => send('OPEN')}>Open</button>
}
```

---

## Introduction

XState의 핵심 개념(상태 차트, 조건부 전이, 사이드 이펙트)을 유지하면서, **상태는 외부에서 관리**합니다.

```ts
// XState: 상태가 machine 내부에 있음
const machine = createMachine({
  initial: 'closed',
  states: {
    closed: { on: { OPEN: 'open' } },
    open: { on: { CLOSE: 'closed' } },
  },
})

// Event Machine: 상태는 외부, machine은 핸들러만 정의
const [isOpen, setIsOpen] = useState(false)
const { send } = useEventMachine(machine, { isOpen, setIsOpen })
```

React에서 가장 강력한 것은 **props로 전달되는 외부 상태**입니다. Event Machine은 이 외부 상태와 자연스럽게 결합됩니다.

---

## Features

- **Controlled** — 상태는 React state나 props에서 관리
- **조건부 핸들러** — `when` 조건으로 분기 처리
- **State 기반 구조** — 상태별로 다른 이벤트 핸들러 정의
- **Effects** — 값 변화 감시, cleanup 지원, `send` 접근 가능
- **Computed** — context에서 파생 값 계산

---

## Installation

```bash
# 이 프로젝트 내부 모듈입니다
import { createEventMachine, useEventMachine } from '@/event-machine'
```

---

## Basic usage

### Machine 정의

`createEventMachine`으로 이벤트 핸들러를 정의합니다.

```ts
type Context = {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
}

type Events = {
  OPEN: undefined
  CLOSE: undefined
  SELECT: { itemId: string }
}

const machine = createEventMachine<Context, Events>({
  on: {
    OPEN: 'open',
    CLOSE: 'close',
    SELECT: 'select',
  },
  actions: {
    open: (ctx) => ctx.setIsOpen(true),
    close: (ctx) => ctx.setIsOpen(false),
    select: (ctx, payload) => {
      ctx.setSelectedId(payload.itemId)
      ctx.setIsOpen(false)
    },
  },
})
```

### 이벤트 발송

`useEventMachine`으로 React 컴포넌트에서 사용합니다.

```tsx
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { send } = useEventMachine(machine, {
    isOpen,
    setIsOpen,
    selectedId,
    setSelectedId,
  })

  return (
    <div>
      <button onClick={() => send('OPEN')}>열기</button>
      {isOpen && (
        <ul>
          <li onClick={() => send('SELECT', { itemId: '1' })}>Item 1</li>
        </ul>
      )}
    </div>
  )
}
```

### 조건부 핸들러

`when` 조건으로 분기 처리합니다. 첫 번째 매칭에서 멈춥니다.

```ts
on: {
  TOGGLE: [
    { when: (ctx) => ctx.disabled, do: 'noop' },
    { when: (ctx) => ctx.isOpen, do: 'close' },
    { do: 'open' },
  ],
}
```

### State 기반 구조

특정 상태에서만 이벤트를 처리합니다. 정의되지 않은 이벤트는 무시됩니다.

```ts
const machine = createEventMachine<Context, Events>({
  states: {
    idle: {
      on: { OPEN: 'startLoading' },
    },
    loading: {
      on: { LOAD_SUCCESS: 'open' },
      // OPEN 이벤트는 정의되지 않음 = 무시됨
    },
    open: {
      on: { CLOSE: 'close', SELECT: 'select' },
    },
  },
  actions: { ... },
})
```

### Effects

값의 변화를 감시하고 반응합니다. `send`로 이벤트를 발송할 수 있습니다.

```ts
effects: [
  {
    watch: (ctx) => ctx.hoveredId,
    enter: (ctx, { send }) => {
      const timer = setTimeout(() => send('OPEN'), 300)
      return () => clearTimeout(timer)  // cleanup
    },
    exit: (ctx, { send }) => {
      send('CLOSE')
    },
  }
]
```

비동기 요청과 race condition 처리:

```ts
effects: [
  {
    watch: (ctx) => ctx.searchQuery,
    change: (ctx, prev, curr, { send }) => {
      const controller = new AbortController()

      fetch(`/api/search?q=${curr}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => send('FETCH_SUCCESS', { data }))
        .catch(() => {})

      return () => controller.abort()  // 이전 요청 취소
    },
  },
]
```

### Computed

context에서 파생 값을 계산합니다.

```ts
const machine = createEventMachine<Context, Events>({
  computed: {
    isEmpty: (ctx) => ctx.items.length === 0,
    displayValue: (ctx) => ctx.selectedItem?.label ?? ctx.inputValue,
  },
  // ...
})

// 사용
const { computed } = useEventMachine(machine, ctx)
if (computed.isEmpty) { ... }
```

---

## Limitations

- **Machine 간 통신 미지원** — 상위 컴포넌트에서 조율
- **Parallel states 미지원** — 여러 state 변수로 분리

---

## License

MIT
