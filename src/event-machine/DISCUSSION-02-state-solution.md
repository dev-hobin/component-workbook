# Discussion 02: 상태폭발 해결 - State 기반 구조

> DISCUSSION-01에서 도출된 "상태폭발" 문제 해결 방안

## 핵심 아이디어

기존 computed 개념을 확장해서 **state를 외부에서 주입**하고, machine 구조를 **state 기반으로 변경**한다.

### Before: 모든 이벤트에 guard 반복

```ts
on: {
  KEY_ARROW_DOWN: [
    { when: (ctx) => ctx.isLoading, do: 'noop' },
    { when: (ctx) => ctx.isAnimating, do: 'noop' },
    { do: 'moveDown' }
  ],
  KEY_ARROW_UP: [
    { when: (ctx) => ctx.isLoading, do: 'noop' },
    { when: (ctx) => ctx.isAnimating, do: 'noop' },
    { do: 'moveUp' }
  ],
  KEY_ENTER: [
    { when: (ctx) => ctx.isLoading, do: 'noop' },
    { when: (ctx) => ctx.isAnimating, do: 'noop' },
    { do: 'select' }
  ],
}
```

### After: state 기반 구조

```ts
// Shell (index.tsx) - state 계산은 외부에서
const state = useMemo(() => {
  if (isLoading) return 'loading'
  if (isAnimating) return 'animating'
  if (isOpen) return 'open'
  return 'idle'
}, [isLoading, isAnimating, isOpen])

const ctx = { ...otherContext, state }
const { send } = useEventMachine(machine, ctx)
```

```ts
// Machine (machine.ts) - state × event → action 매핑만
type State = 'idle' | 'loading' | 'animating' | 'open'
type Context = { state: State; /* ... */ }

const machine = createEventMachine<Context, Events, State>({
  states: {
    idle: {
      on: { OPEN: 'open' }
    },
    loading: {
      // 이벤트 정의 없음 = 전부 무시
    },
    animating: {
      // 이벤트 정의 없음 = 전부 무시
    },
    open: {
      on: {
        CLOSE: 'close',
        KEY_ARROW_DOWN: 'moveDown',
        KEY_ARROW_UP: 'moveUp',
        KEY_ENTER: 'select'
      }
    }
  }
})
```

---

## 설계 결정

### 1. 공존 구조 (on + states)

XState와 동일하게 루트 `on`과 `states` 공존:

```ts
const machine = createEventMachine({
  // 전역: 모든 state에서 수신
  on: {
    FOCUS: 'handleFocus',
    BLUR: 'handleBlur',
  },

  // state별: 해당 state에서만 수신
  states: {
    idle: {
      on: { OPEN: 'open' }
    },
    open: {
      on: {
        BLUR: 'closeOnBlur',  // 추가 동작
        KEY_ENTER: 'select'
      }
    }
  }
})
```

### 2. 오버라이드가 아닌 둘 다 실행

같은 이벤트가 전역과 state별 둘 다 있으면 **둘 다 실행**:

```ts
// open 상태에서 BLUR 발생 시:
// 1. closeOnBlur 실행 (state별, 먼저)
// 2. handleBlur 실행 (전역, 나중)
```

### 3. 실행 순서: state별 → 전역

| 순서 | 실행 |
|------|------|
| 1 | 현재 state의 `on` 핸들러 |
| 2 | 전역 `on` 핸들러 |

### 4. state는 외부에서 주입

machine 안에서 `state: (ctx) => ...` 계산하지 않음.

**이유**:
- state 계산 로직은 Shell 책임 = 더 유연
- context에 state가 있으니 일관성
- machine은 순수하게 매핑만 담당

---

## 해결되는 문제

| 문제 | 해결 |
|------|------|
| guard 반복 | state에서 이벤트 정의 없으면 자동 무시 |
| 조건 조합 폭발 | state 하나로 여러 조건 통합 |
| 가독성 저하 | state별로 핸들러 그룹화 |

---

## 타입 안전성

```ts
type State = 'idle' | 'loading' | 'open'
type Context = { state: State; /* ... */ }

// State 합타입과 states 키가 일치하는지 제네릭으로 강제
const machine = createEventMachine<Context, Events, State>({
  states: {
    idle: { ... },
    loading: { ... },
    open: { ... },
    // 'closed' 추가하면 State 타입에 없으므로 에러
    // 'open' 빠뜨리면 State 타입에 있으므로 에러
  }
})
```

---

## 기존 기능 유지

computed, effects, always 등 기존 기능은 그대로 유지:

```ts
const machine = createEventMachine({
  // 기존 - 그대로 유지
  computed: {
    enabledItems: (ctx) => ctx.items.filter(i => !i.disabled),
    hasSelection: (ctx) => ctx.selectedId !== null,
  },

  effects: [
    {
      watch: (ctx) => ctx.focusedId,
      change: (ctx) => { /* focus 처리 */ }
    }
  ],

  always: [
    { when: (ctx) => ctx.selectedId && !ctx.isOpen, do: 'clearHighlight' }
  ],

  // 새로 추가
  on: { ... },
  states: { ... },
  actions: { ... }
})
```

---

## 반환 인터페이스 변경

```ts
// Before
const { send, computed } = useEventMachine(machine, ctx)

// After
const { send, computed, state } = useEventMachine(machine, ctx)
```

state는 `ctx.state`를 그대로 반환:

```ts
const state = ctx.state  // 'idle' | 'loading' | 'open'

// 사용
if (state === 'loading') { ... }
```

---

## 다음 단계

1. **API 구현**: `states` 구조 지원하도록 `createEventMachine` 수정
2. **기존 컴포넌트 마이그레이션**: accordion, combobox 등에 적용
3. **DISCUSSION-01의 2번 문제**: effects에서 send 사용 - 별도 논의
