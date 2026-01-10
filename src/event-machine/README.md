# Event Machine

**Controlled XState** - 외부 상태와 자연스럽게 결합되는 선언적 이벤트 핸들러

```ts
const { send, computed, state } = useEventMachine(machine, ctx)
```

---

## 목차

- [왜 만들었나?](#왜-만들었나)
- [빠른 시작](#빠른-시작)
- [핵심 개념](#핵심-개념)
- [API 레퍼런스](#api-레퍼런스)
- [사용 패턴](#사용-패턴)
- [주의사항](#주의사항)
- [예제](#예제)
- [Event Machine이 아닌 것](#event-machine이-아닌-것)

---

## 왜 만들었나?

### XState와 useReducer의 한계

XState와 useReducer는 강력한 상태 관리 도구입니다. 하지만 실제 React 프로젝트에서는 잘 안 쓰입니다.

**이유: 외부 상태에 닫혀 있다**

```tsx
// React에서 가장 강력한 것 = props로 전달되는 외부 상태
<Combobox
  value={value}           // 외부에서 제어
  onChange={setValue}     // 외부로 변경 알림
  options={options}       // 외부에서 주입
/>
```

XState는 내부에서 상태를 완전히 소유합니다. 외부에서 주입되는 `value`, `options` 같은 props를 다루기 어렵습니다.

### 아까운 유산

XState의 **상태 차트(Statechart)** 개념 자체는 매우 유용합니다:

- 복잡한 상태 전이를 시각화
- 불가능한 상태를 원천 차단
- 상태 로직을 명확하게 표현

하지만 "외부에 닫혀 있다"는 구조적 한계 때문에 실무에서 채택되지 못하고, 이 귀중한 개념들이 개발자들에게 습득되지 못한 채 버려지고 있습니다.

**도구의 한계가 개념의 가치까지 묻어버리는 셈입니다.**

### Controlled XState

Event Machine은 XState의 핵심 개념(상태 차트, 조건부 전이, 사이드 이펙트)을 유지하면서, **상태는 외부에서 관리**합니다.

```tsx
// 상태는 React state로 관리
const [isOpen, setIsOpen] = useState(false)
const [inputValue, setInputValue] = useState('')

// machine은 "어떤 이벤트가 오면 어떤 액션을 할지"만 정의
const { send } = useEventMachine(comboboxMachine, {
  isOpen,
  setIsOpen,
  inputValue,
  setInputValue,
})
```

**핵심 차이점:**

| | XState | Event Machine |
|---|--------|---------------|
| 상태 위치 | Machine 내부 | 외부 (React state, props) |
| 상태 변경 | `assign()` | `ctx.setState()` |
| Controlled 컴포넌트 | 어려움 | 자연스러움 |
| 외부 props 반영 | 복잡 | 즉시 반영 |

---

## 빠른 시작

### 1. Machine 정의

```ts
import { createEventMachine } from './event-machine'

type Events = {
  OPEN: undefined
  CLOSE: undefined
  SELECT: { itemId: string }
}

type Context = {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
}

const dropdownMachine = createEventMachine<
  Context,
  Events,
  Record<string, never>,  // computed (없으면 빈 객체)
  'open' | 'close' | 'select'  // action 이름들
>({
  on: {
    OPEN: 'open',
    CLOSE: 'close',
    SELECT: 'select',
  },

  actions: {
    open: (ctx) => ctx.setIsOpen(true),
    close: (ctx) => ctx.setIsOpen(false),
    select: (ctx, payload) => {
      if (payload) ctx.setSelectedId(payload.itemId)
      ctx.setIsOpen(false)
    },
  },
})
```

### 2. React에서 사용

```tsx
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { send } = useEventMachine(dropdownMachine, {
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
          <li onClick={() => send('SELECT', { itemId: '2' })}>Item 2</li>
        </ul>
      )}
    </div>
  )
}
```

---

## 핵심 개념

### 1. on - 이벤트 핸들러

이벤트가 발생하면 어떤 액션을 실행할지 정의합니다.

```ts
on: {
  // 단순: 이벤트 → 액션
  OPEN: 'open',

  // 조건부: when 조건에 따라 다른 액션
  CLOSE: [
    { when: (ctx) => ctx.isAnimating, do: 'noop' },
    { do: 'close' }
  ],

  // payload 사용
  SELECT: [
    { when: (ctx, { multi }) => multi, do: 'addToSelection' },
    { do: 'select' },
  ],
}
```

**규칙:**
- 조건부 핸들러는 **첫 번째 매칭**에서 멈춤
- `when`이 없으면 항상 실행 (default case)

### 2. states - 상태별 핸들러

특정 상태에서만 이벤트를 처리합니다. XState의 states와 유사합니다.

```ts
type State = 'idle' | 'loading' | 'open'

const machine = createEventMachine<Context, Events, {}, Actions, State>({
  // 전역 핸들러 (모든 state에서)
  on: {
    FOCUS: 'handleFocus',
  },

  // state별 핸들러
  states: {
    idle: {
      on: { OPEN: 'startLoading' },
    },
    loading: {
      // OPEN 없음 = 무시됨
      on: { LOAD_SUCCESS: 'open' },
    },
    open: {
      on: {
        CLOSE: 'close',
        SELECT: 'select',
      },
    },
  },

  actions: { ... }
})
```

**실행 순서:**
1. state별 핸들러 먼저
2. 전역 핸들러 나중에
3. 둘 다 있으면 **둘 다 실행** (override 아님)

**Context에서 state 제공:**
```ts
type Context = {
  state: State           // 현재 상태
  setState: (s: State) => void
  // ...
}
```

### 3. effects - 사이드 이펙트

값의 변화를 감시하고 반응합니다.

```ts
effects: [
  {
    watch: (ctx) => ctx.hoveredId,  // 감시할 값

    // falsy → truthy 전환 시
    enter: (ctx, { send }) => {
      const timer = setTimeout(() => send('OPEN'), 300)
      return () => clearTimeout(timer)  // cleanup
    },

    // truthy → falsy 전환 시
    exit: (ctx, { send }) => {
      send('CLOSE')
    },

    // 값 변경 시 (shallowEqual 비교)
    change: (ctx, prev, curr, { send }) => {
      send('VALUE_CHANGED', { prev, curr })
      return () => { /* cleanup */ }
    },
  }
]
```

**콜백 조건:**
| 콜백 | 실행 조건 |
|------|----------|
| `enter` | watch 값이 falsy → truthy |
| `exit` | watch 값이 truthy → falsy |
| `change` | watch 값이 변경될 때마다 |

**cleanup:**
- `enter`, `change`는 cleanup 함수를 반환할 수 있음
- cleanup은 다음 콜백 실행 전 또는 언마운트 시 호출됨

### 4. computed - 파생 값

context에서 계산되는 값을 정의합니다.

```ts
computed: {
  isEmpty: (ctx) => ctx.items.length === 0,
  displayValue: (ctx) => ctx.selectedItem?.label ?? ctx.inputValue,
  state: (ctx) => ctx.isLoading ? 'loading' : ctx.isOpen ? 'open' : 'idle',
},
```

computed 값은 `ctx`와 함께 actions, effects, on 핸들러에서 사용 가능합니다.

### 5. always - 자동 규칙

context가 바뀔 때마다 자동으로 평가됩니다.

```ts
always: [
  { when: (ctx) => ctx.items.length === 1, do: 'autoSelect' },
  { when: (ctx) => ctx.isEmpty, do: 'showEmptyMessage' },
],
```

**주의:** 렌더링 중에 실행되므로 무한 루프에 주의하세요.

---

## API 레퍼런스

### useEventMachine

React Hook으로 machine을 사용합니다.

```ts
function useEventMachine<TContext, TEvents, TComputed, TState>(
  machine: EventMachine<TContext, TEvents, TComputed, TState>,
  ctx: TContext
): {
  send: Send<TEvents>
  computed: TComputed
  state: TState  // default: '' (빈 문자열)
}
```

**반환값:**
| 속성 | 설명 |
|------|------|
| `send` | 이벤트 발송 함수 |
| `computed` | 계산된 값들 |
| `state` | `ctx.state`에서 추출된 현재 상태. `ctx.state`가 없으면 `''` (빈 문자열) |

### createEventMachine

Machine을 생성합니다. 타입 추론을 위한 헬퍼입니다.

```ts
function createEventMachine<
  TContext,
  TEvents,
  TComputed,
  TActions extends string,
  TState extends string
>(config: MachineConfig): EventMachine & {
  send: (event, ctx, payload?) => void  // Vanilla용
  evaluate: (ctx) => void               // effects/always 수동 실행
  getComputed: (ctx) => TComputed       // computed 값 가져오기
  cleanup: () => void                   // 모든 cleanup 실행
}
```

**제네릭 파라미터:**
| 파라미터 | 설명 |
|----------|------|
| `TContext` | context 타입 |
| `TEvents` | 이벤트 타입 (`{ EVENT_NAME: PayloadType }`) |
| `TComputed` | computed 값 타입 |
| `TActions` | 액션 이름 유니온 (자동완성 지원) |
| `TState` | state 이름 유니온 |

### Send 타입

```ts
type Send<TEvents> = <K extends keyof TEvents>(
  event: K,
  ...args: TEvents[K] extends undefined ? [] : [payload: TEvents[K]]
) => void

// 사용 예시
send('OPEN')                        // payload 없음
send('SELECT', { itemId: '1' })     // payload 있음
```

### Effect 타입

```ts
type Effect<TContext, TEvents, TWatched> = {
  watch: (ctx: TContext) => TWatched
  enter?: (ctx, helpers: { send }) => void | Cleanup
  exit?: (ctx, helpers: { send }) => void | Cleanup
  change?: (ctx, prev, curr, helpers: { send }) => void | Cleanup
}
```

### effect() 헬퍼

watch 반환 타입에서 prev/curr 타입을 추론합니다.

```ts
import { effect } from './event-machine'

effects: [
  effect({
    watch: (ctx) => ctx.count,  // number 반환
    change: (ctx, prev, curr) => {
      // prev: number | undefined
      // curr: number
    },
  }),
]
```

---

## 사용 패턴

### 비동기 데이터 로딩

race condition을 cleanup으로 처리합니다.

```ts
effects: [
  {
    watch: (ctx) => ctx.searchQuery,
    change: (ctx, prev, curr, { send }) => {
      if (!curr) {
        ctx.setItems([])
        return
      }

      ctx.setState('loading')
      const controller = new AbortController()

      fetch(`/api/search?q=${curr}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => send('FETCH_SUCCESS', { items: data }))
        .catch(err => {
          if (!controller.signal.aborted) {
            send('FETCH_ERROR', { error: err.message })
          }
        })

      // cleanup: 이전 요청 취소 (race condition 방지)
      return () => controller.abort()
    },
  },
],

states: {
  loading: {
    on: {
      FETCH_SUCCESS: 'handleSuccess',
      FETCH_ERROR: 'handleError',
    },
  },
},

actions: {
  handleSuccess: (ctx, payload) => {
    ctx.setItems(payload.items)
    ctx.setState('open')
  },
},
```

### Delayed Transition (hover 딜레이)

enter cleanup으로 타이머를 관리합니다.

```ts
type State = 'idle' | 'hovering' | 'open' | 'closing'

effects: [
  {
    // hovering 상태 진입 시 300ms 후 open
    watch: (ctx) => ctx.state === 'hovering',
    enter: (ctx, { send }) => {
      const timer = setTimeout(() => send('DELAYED_OPEN'), 300)
      return () => clearTimeout(timer)
    },
  },
  {
    // closing 상태 진입 시 200ms 후 close
    watch: (ctx) => ctx.state === 'closing',
    enter: (ctx, { send }) => {
      const timer = setTimeout(() => send('DELAYED_CLOSE'), 200)
      return () => clearTimeout(timer)
    },
  },
],

states: {
  idle: {
    on: { MOUSE_ENTER: 'startHover' },
  },
  hovering: {
    on: {
      MOUSE_LEAVE: 'close',
      DELAYED_OPEN: 'open',
    },
  },
  open: {
    on: { MOUSE_LEAVE: 'startClosing' },
  },
  closing: {
    on: {
      MOUSE_ENTER: 'cancelClose',  // 다시 들어오면 취소
      DELAYED_CLOSE: 'close',
    },
  },
},
```

### Compound Component 패턴

Context를 통해 여러 컴포넌트에서 같은 machine을 공유합니다.

```tsx
const ComboboxContext = createContext<{
  state: State
  send: Send<Events>
} | null>(null)

function Root({ children }) {
  const [state, setState] = useState<State>('idle')
  const { send } = useEventMachine(machine, { state, setState })

  return (
    <ComboboxContext.Provider value={{ state, send }}>
      {children}
    </ComboboxContext.Provider>
  )
}

function Trigger() {
  const { send } = useContext(ComboboxContext)!
  return <button onClick={() => send('OPEN')}>Open</button>
}

function Content({ children }) {
  const { state } = useContext(ComboboxContext)!
  if (state !== 'open') return null
  return <div>{children}</div>
}

// 사용
<Combobox.Root>
  <Combobox.Trigger />
  <Combobox.Content>
    <Combobox.Item />
  </Combobox.Content>
</Combobox.Root>
```

---

## 주의사항

### 무한 루프 방지

effect에서 send가 watch 대상을 변경하면 무한 루프가 발생합니다.

```ts
// BAD: 무한 루프
effects: [
  {
    watch: (ctx) => ctx.count,
    change: (ctx, prev, curr, { send }) => {
      send('INCREMENT')  // count를 변경 → 다시 change 호출
    },
  },
]

// GOOD: 다른 값을 변경
effects: [
  {
    watch: (ctx) => ctx.inputValue,
    change: (ctx, prev, curr, { send }) => {
      send('SEARCH')  // items를 변경 (inputValue 아님)
    },
  },
]
```

**체크리스트:**
- [ ] send가 watch 대상을 변경하는가?
- [ ] 조건 없이 항상 send하는가?
- [ ] state 전환이 다시 같은 effect를 트리거하는가?

### watch에서 state 변경 피하기

watch가 state를 포함하면, effect 내에서 `setState` 호출 시 effect가 다시 트리거됩니다.

```ts
// BAD: state 변경이 effect를 다시 트리거
watch: (ctx) => [ctx.inputValue, ctx.state],
change: (ctx, prev, curr, { send }) => {
  ctx.setState('loading')  // state 변경 → effect 재실행 → cleanup!
  // fetch가 즉시 abort됨
}

// GOOD: inputValue만 watch
watch: (ctx) => ctx.inputValue,
change: (ctx, prev, curr, { send }) => {
  ctx.setState('loading')  // state 변경해도 effect 재실행 안 됨
  // fetch 정상 진행
}
```

### React 렌더링 규칙

Event Machine은 React 렌더링 규칙을 준수합니다:

| 구성요소 | 실행 시점 | 상태 변경 |
|---------|----------|----------|
| `effects` | `useEffect` 내 (렌더링 후) | 안전 |
| `actions` | 이벤트 핸들러 (렌더링 외부) | 안전 |
| `computed` | 렌더링 중 | 읽기 전용 |
| `always` | 렌더링 중 | 주의 필요 |

Compound Component에서도 "Cannot update a component while rendering" 에러 없이 동작합니다.

---

## 예제

### Async Combobox

비동기 검색 + race condition 처리 + states 구조

```
__tests__/examples/AsyncCombobox.tsx
__tests__/examples/AsyncComboboxCompound.tsx
```

**기능:**
- 입력 시 300ms 후 검색 결과 표시
- 빠른 입력 시 이전 요청 자동 취소
- idle → loading → open 상태 전이

### Hover Menu

Delayed open/close + enter/exit cleanup + states 구조

```
__tests__/examples/HoverMenu.tsx
__tests__/examples/HoverMenuCompound.tsx
```

**기능:**
- 300ms hover 후 메뉴 열기
- 200ms 딜레이 후 메뉴 닫기
- 마우스가 다시 들어오면 닫기 취소

---

## Event Machine이 아닌 것

### 전역 상태 관리가 아닙니다

Event Machine은 **컴포넌트 로직**을 위한 것입니다. 전역 상태는 Zustand, Jotai 등을 사용하세요.

### Machine 간 통신을 지원하지 않습니다

Modal + Combobox 같은 중첩 컴포넌트 조율은 상위 컴포넌트에서 처리하세요.

### 복잡한 parallel states를 지원하지 않습니다

독립적인 상태 축이 여러 개 필요하면, 여러 개의 state 변수를 사용하세요.

---

## 설계 원칙

1. **상태는 외부에서 관리**: Machine은 "언제 무엇을 할지"만 정의
2. **Controlled 우선**: props로 전달되는 외부 상태와 자연스럽게 결합
3. **선언적 정의**: 이벤트 → 액션 매핑을 한눈에 파악
4. **React 규칙 준수**: 렌더링 중 상태 변경 금지, effect는 useEffect 내에서
5. **최소 코드**: ~200줄 핵심 로직 (타입 제외)

---

## XState와 비교

| | XState | Event Machine |
|---|--------|---------------|
| 상태 위치 | Machine 내부 | 외부 (React state) |
| 상태 정의 | `states: { idle, loading }` | `type State = 'idle' \| 'loading'` |
| 상태 변경 | 전이로만 | `ctx.setState()` |
| entry/exit | 상태에 연결 | `watch` 값에 연결 |
| 외부 props | 복잡한 동기화 필요 | 즉시 반영 |
| delayed transition | `after: { 300: 'target' }` | `effects` + `setTimeout` |
| 코드량 | ~500줄+ | ~200줄 |

---

## 관련 문서

- [CONTEXT.md](./CONTEXT.md) - 이 라이브러리가 만들어진 배경
- [PREMORTEM.md](./PREMORTEM.md) - 기존 문제점과 해결책
- [DISCUSSION-01-root-problems.md](./DISCUSSION-01-root-problems.md) - 근본 문제 분석
- [USAGE-GUIDE.md](./USAGE-GUIDE.md) - 상세 사용 가이드
- [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) - 구현 계획

---

## 라이선스

MIT
