# Component Architecture

## 개요

이 프로젝트는 **Functional Core / Imperative Shell** 패턴을 사용하여 React 컴포넌트를 구성합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Imperative Shell                           │
│   (React 컴포넌트, DOM 이벤트, 훅, 부수효과 실행)                  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   Functional Core                        │   │
│   │   (Event Machine, 순수 함수, 불변 데이터)                  │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 폴더 구조

```
src/
├── primitives/                    # 🔵 컴포넌트 공통 인프라
│   ├── node-store.ts         # 컴포넌트 등록/조회 스토어 (순수)
│   ├── use-node-store.tsx    # Store Context Provider
│   ├── use-node.ts                # 노드 등록 훅
│   ├── use-parent-context.tsx     # 부모-자식 관계 Context
│   ├── use-store-subscribe.ts # Store 구독 훅
│   └── dom.ts                     # DOM 유틸리티
│
├── event-machine/                 # 🟣 이벤트 머신 시스템
│   └── index.ts                   # createEventMachine, useEventMachine
│
├── hooks/                         # 🟡 범용 React 훅
│   ├── use-latest-ref.ts
│   ├── use-presence.ts
│   └── use-stable-callback.ts
│
├── utils/                         # 🟠 순수 유틸리티
│   ├── compose-refs.ts
│   ├── merge-props.ts
│   └── compose-event-handlers.ts
│
└── components/
    └── {component-name}/          # 📦 개별 컴포넌트
        ├── machine.ts             # 컴포넌트 Machine (순수 로직)
        └── index.tsx              # 컴포넌트 Shell (Compound)
```

---

## 컴포넌트 구조 상세

### 1. `machine.ts` - Event Machine

순수 로직만 포함. React/DOM 의존성 없음. `createEventMachine`으로 정의.

```typescript
// ============================================
// {Component} Machine
// ============================================

// === 이벤트 타입 ===
export type {Component}Events = {
  EVENT_NAME: { payload: Type }
  ANOTHER_EVENT: undefined
}

// === Input 타입 (Shell에서 전달받는 값) ===
export type {Component}Input = {
  // State
  value: Type

  // Callbacks
  onValueChange: (value: Type) => void

  // Options
  optionName: boolean

  // Helpers (lazy evaluation)
  getElements: () => HTMLElement[]
}

// === Computed (선택적) ===
export type {Component}Computed = {
  derivedValue: Type
}

// === Machine 정의 ===
export const {component}Machine = createEventMachine<{
  input: {Component}Input
  events: {Component}Events
  computed?: {Component}Computed
  state?: {Component}State  // 상태 기반 핸들러 사용 시
  actions: 'action1' | 'action2'
}>({
  // 파생값 정의
  computed: {
    derivedValue: (input) => /* ... */,
  },

  // 이벤트 핸들러
  on: {
    EVENT_NAME: [
      { when: (context) => condition, do: 'action1' },
      { do: 'action2' },
    ],
  },

  // 부수효과 (watch 기반)
  effects: [
    {
      watch: (context) => context.value,
      enter: (context) => { /* setup */ return () => { /* cleanup */ } },
      change: (context) => { /* on change */ },
    },
  ],

  // 액션 구현
  actions: {
    action1: (context, payload) => { /* ... */ },
    action2: (context) => { /* ... */ },
  },
})
```

#### Machine 패턴 분류

| 패턴 | 설명 | 사용 시점 |
|------|------|----------|
| **기본 패턴** | on + actions | 단순 상태 전환 |
| **Computed 패턴** | + computed | 파생값이 필요할 때 (예: 총 페이지 수) |
| **State 패턴** | + states | 상태별로 다른 이벤트 처리가 필요할 때 |
| **Effects 패턴** | + effects | DOM 이벤트 리스너, 포커스 관리 등 |

---

### 2. `index.tsx` - Imperative Shell

React 컴포넌트와 훅으로 구성. Compound Component 패턴 사용.

```typescript
import React, {
  createContext,
  forwardRef,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useEventMachine, type Send } from '../../event-machine'

import {
  {component}Machine,
  type {Component}Events,
} from './machine'
import { composeRefs } from '../../utils/compose-refs'
import { mergeProps } from '../../utils/merge-props'

import {
  NodeStoreProvider,
  useNodeStore,
} from '../../primitives/use-node-store'
import { useNode } from '../../primitives/use-node'
import type { NodeStore } from '../../primitives/node-store'

// ============================================
// Types
// ============================================

type {Component}Role = 'root' | 'trigger' | 'content' | 'item'

type {Component}Meta = {
  // 노드별 메타 정보
}

type {Component}ContextValue = {
  value: ValueType
  store: NodeStore<{Component}Role, {Component}Meta>
  send: Send<{Component}Events>
}

// ============================================
// Contexts
// ============================================

const {Component}Context = createContext<{Component}ContextValue | null>(null)

function use{Component}Context() {
  const context = useContext({Component}Context)
  if (!context) {
    throw new Error('{Component} 컴포넌트는 {Component}.Root 안에서 사용해야 합니다.')
  }
  return context
}

// ============================================
// Root
// ============================================

export type RootProps = {
  children: React.ReactNode
  value?: ValueType
  defaultValue?: ValueType
  onValueChange?: (value: ValueType) => void
}

export function Root(props: RootProps) {
  return (
    <NodeStoreProvider<{Component}Role, {Component}Meta>>
      <RootInner {...props} />
    </NodeStoreProvider>
  )
}

function RootInner({
  children,
  value: valueProp,
  defaultValue,
  onValueChange,
}: RootProps) {
  const { store } = useNodeStore<{Component}Role, {Component}Meta>()
  const componentId = useId()

  // Controllable state
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  // Event machine - 상태와 콜백을 인라인으로 전달
  const { send } = useEventMachine({component}Machine, {
    value,
    onValueChange: setValue,
    getElement: () => store.getElement(componentId, 'trigger'),
  })

  const contextValue: {Component}ContextValue = {
    value,
    store,
    send,
  }

  return (
    <{Component}Context.Provider value={contextValue}>
      {children}
    </{Component}Context.Provider>
  )
}

// ============================================
// Compound Components
// ============================================

export type TriggerProps = ComponentPropsWithoutRef<'button'>

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ children, ...rest }, forwardedRef) => {
    const { send } = use{Component}Context()

    const { ref, domId } = useNode<{Component}Role, {Component}Meta>({
      role: 'trigger',
    })

    const handleClick = () => {
      send('TOGGLE')
    }

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            type: 'button',
            id: domId,
            onClick: handleClick,
          },
          rest,
        )}
      >
        {children}
      </button>
    )
  },
)

// ... 다른 Compound Components

// ============================================
// Export
// ============================================

const {Component} = {
  Root,
  Trigger,
  Content,
  Item,
}

export default {Component}
```

---

## 핵심 패턴

### 1. Controllable State

외부에서 상태를 제어할 수 있도록 지원:

```typescript
const [value, setValue] = useControllableState({
  prop: valueProp,           // controlled value
  defaultProp: defaultValue, // uncontrolled default
  onChange: onValueChange,   // change callback
})
```

### 2. Event Machine

이벤트 기반 상태 관리. `createEventMachine`으로 정의하고 `useEventMachine`으로 사용:

```typescript
// Machine 정의
const machine = createEventMachine<{
  input: InputType
  events: EventsType
  actions: 'action1' | 'action2'
}>({
  on: {
    EVENT_NAME: [
      { when: (context) => condition, do: 'action1' },
      { do: 'action2' },
    ],
  },
  actions: {
    action1: (context, payload) => context.onValueChange(payload.value),
  },
})

// Shell에서 사용
const { send, computed } = useEventMachine(machine, {
  value,
  onValueChange: setValue,
})
```

### 3. Effects (watch 기반)

Machine의 `effects`로 값 변화 감지 및 부수효과 실행:

```typescript
effects: [
  {
    watch: (context) => context.isOpen,
    enter: (context) => {
      // isOpen이 true가 될 때 실행
      document.body.style.overflow = 'hidden'
      return () => {
        // isOpen이 false가 될 때 실행 (cleanup)
        document.body.style.overflow = ''
      }
    },
  },
  {
    watch: (context) => context.focusedId,
    change: (context) => {
      // focusedId가 변경될 때마다 실행
      context.getElement(context.focusedId)?.focus()
    },
  },
]
```

### 4. Computed (파생값)

Machine의 `computed`로 input에서 파생값 계산:

```typescript
computed: {
  totalPages: (input) => Math.ceil(input.totalCount / input.pageSize),
  hasPrev: (input) => input.page > 1,
  hasNext: (input) => input.page < Math.ceil(input.totalCount / input.pageSize),
}

// Shell에서 사용
const { computed } = useEventMachine(machine, input)
// computed.totalPages, computed.hasPrev, computed.hasNext
```

### 5. State 기반 핸들러

상태별로 다른 이벤트 핸들러 정의:

```typescript
const machine = createEventMachine<{
  input: InputType
  events: EventsType
  state: 'open' | 'closed'  // state 타입 정의
  actions: 'open' | 'close'
}>({
  states: {
    closed: {
      on: {
        OPEN: 'open',
        // closed 상태에서 CLOSE는 무시됨
      },
    },
    open: {
      on: {
        CLOSE: 'close',
        OUTSIDE_CLICK: [
          { when: (context) => context.closeOnOutsideClick, do: 'close' },
        ],
      },
    },
  },
  actions: {
    open: (context) => context.onOpenChange(true),
    close: (context) => context.onOpenChange(false),
  },
})
```

---

## Store 사용 패턴

### useNode - 노드 등록

```typescript
const { ref, domId, elementRef } = useNode<Role, Meta>({
  role: 'item',
  id: itemId,        // 논리적 ID
  meta: { menuId },  // 메타 정보
})

return <div ref={ref} id={domId}>...</div>
```

### useStoreSubscribe - 렌더링에 필요한 파생값

```typescript
const hasChildren = useStoreSubscribe(
  store,
  (s) => s.getChildrenByRole(nodeId, 'item').length > 0,
)
```

### 직접 조회 - 이벤트/Effect 시점

```typescript
// 이벤트 핸들러에서
const handleClick = useCallback(() => {
  const element = store.getElement(itemId, 'item')
  element?.focus()
}, [store, itemId])

// useEffect에서
useEffect(() => {
  const element = store.getElement(focusedId, 'item')
  element?.focus()
}, [focusedId, store])
```

---

## 패턴 분류

| 패턴 | 설명 | 특징 |
|------|------|------|
| 기본 | `on` + `actions` | 단순 상태 전환 |
| Computed | + `computed` | 파생값 계산 필요 |
| Effects | + `effects` | DOM 이벤트 리스너, 포커스 관리 등 |

---

## 파일 작성 순서 (권장)

1. **`machine.ts`** - 이벤트, Input, Actions 타입 정의 및 Machine 구현
2. **`index.tsx`** - Shell 구현 (Root부터 시작)
3. **`styled.tsx`** - 스타일링된 버전 (선택)
4. **`examples.tsx`** - 사용 예시

---

## 체크리스트

### Machine 작성 시
- [ ] 모든 action이 순수한가? (직접 DOM 조작 없이 콜백 호출)
- [ ] 상태는 불변으로 다루고 있는가?
- [ ] React/DOM 의존성이 없는가?
- [ ] 외부 리소스 관리가 필요하면 effects를 사용했는가?
- [ ] 파생값이 필요하면 computed를 정의했는가?
- [ ] 조건부 액션은 `when` guard를 사용했는가?

### Shell 작성 시
- [ ] `NodeStoreProvider`로 Root를 감쌌는가?
- [ ] `useControllableState`로 controlled/uncontrolled 지원하는가?
- [ ] `useEventMachine`으로 Machine을 연결했는가?
- [ ] `useNode`로 노드를 등록했는가?
- [ ] `composeRefs`와 `mergeProps`를 사용했는가?
- [ ] ARIA 속성을 올바르게 설정했는가?
