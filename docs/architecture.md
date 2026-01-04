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
│   │   (순수 함수, 불변 데이터, Effect as Data)                 │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 폴더 구조

```
src/
├── core/                          # 🔵 공통 Core (순수)
│   └── component-store.ts         # 컴포넌트 등록/조회 스토어
│
├── shell/                         # 🟢 공통 Shell (React 훅)
│   ├── use-component-store.tsx    # Store Context Provider
│   ├── use-node.ts                # 노드 등록 훅
│   ├── use-parent-context.tsx     # 부모-자식 관계 Context
│   ├── use-component-subscribe.ts # Store 구독 훅
│   └── dom.ts                     # DOM 유틸리티
│
├── hooks/                         # 🟡 범용 React 훅
│   ├── useLatestRef/
│   ├── usePresence/
│   └── useStableCallback/
│
├── utils/                         # 🟠 순수 유틸리티
│   ├── composeRefs.ts
│   ├── mergeProps.ts
│   └── composeEventHandlers.ts
│
└── components/
    └── {component-name}/          # 📦 개별 컴포넌트
        ├── core.ts                # 컴포넌트 Core
        ├── index.tsx              # 컴포넌트 Shell (Compound)
        ├── styled.tsx             # 스타일링된 버전
        └── examples.tsx           # 사용 예시
```

---

## 컴포넌트 구조 상세

### 1. `core.ts` - Functional Core

순수 함수만 포함. React/DOM 의존성 없음.

```typescript
// ============================================
// {Component} Core - 순수 함수 모듈
// ============================================

// === 기본 타입 ===
export type ItemId = string

export type {Component}State = {
  // 컴포넌트의 핵심 상태
}

// === Status (선택적) ===
// 외부 리소스 관리가 필요한 경우에만
export type {Component}Status = 'idle' | 'closed' | 'open'

// === Effect (선택적) ===
// 부수효과가 필요한 경우에만
export type {Component}Effect =
  | { type: 'EFFECT_NAME'; payload?: any }
  | { type: 'ANOTHER_EFFECT' }

// === 상태 생성 ===
export function create{Component}State(options?: Partial<{Component}State>): {Component}State

// === 상태 → Status 파생 (선택적) ===
export function deriveStatus(state: {Component}State): {Component}Status

// === Status 전환에 따른 부수효과 (선택적) ===
export function getEffectsOnStatusChange(
  prevStatus: {Component}Status,
  nextStatus: {Component}Status,
  context?: any,
): {Component}Effect[]

// === 상태 업데이트 함수들 ===
export function actionName(state: {Component}State, ...args): {Component}State

// === 상태 조회 함수들 ===
export function queryName(state: {Component}State, ...args): ResultType
```

#### Core 패턴 분류

| 패턴 | 설명 | 예시 |
|------|------|------|
| **기본 패턴** | 상태 + 순수 함수 | Accordion, Tabs, Pagination |
| **Status 패턴** | + Status + Effect | Modal, Menu |

**Status 패턴이 필요한 경우:**
- 외부 리소스 관리 (이벤트 리스너, focus trap, scroll lock)
- 상태 전환에 따른 부수효과 실행이 필요할 때
- `defaultOpen` 같은 초기값으로 인한 초기 부수효과 처리

---

### 2. `index.tsx` - Imperative Shell

React 컴포넌트와 훅으로 구성. Compound Component 패턴 사용.

```typescript
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import { useControllableState } from '@radix-ui/react-use-controllable-state'

import {
  type {Component}State,
  type {Component}Status,  // Status 패턴 사용 시
  type {Component}Effect,  // Status 패턴 사용 시
  deriveStatus,            // Status 패턴 사용 시
  getEffectsOnStatusChange, // Status 패턴 사용 시
  // ... 순수 함수들
} from './core'

import { useLatestRef } from '../../hooks/useLatestRef'
import { composeRefs } from '../../utils/composeRefs'
import { mergeProps } from '../../utils/mergeProps'

import {
  ComponentStoreProvider,
  useComponentStore,
} from '../../shell/use-component-store'
import { useNode } from '../../shell/use-node'
import type { ComponentStore } from '../../core/component-store'

// ============================================
// Types
// ============================================

type {Component}Role = 'root' | 'trigger' | 'content' | 'item' // ...

type {Component}Meta = {
  // 노드별 메타 정보
}

type {Component}ContextValue = {
  state: {Component}State
  setState: React.Dispatch<React.SetStateAction<{Component}State>>
  store: ComponentStore<{Component}Role, {Component}Meta>
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
  // Controlled props
  value?: StateValue
  defaultValue?: StateValue
  onValueChange?: (value: StateValue) => void
}

export function Root(props: RootProps) {
  return (
    <ComponentStoreProvider<{Component}Role, {Component}Meta>>
      <RootInner {...props} />
    </ComponentStoreProvider>
  )
}

function RootInner({
  children,
  value: valueProp,
  defaultValue,
  onValueChange,
}: RootProps) {
  const { store } = useComponentStore<{Component}Role, {Component}Meta>()
  const componentId = useId()

  // Controllable state
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  // State 구성
  const state: {Component}State = useMemo(() => ({ value }), [value])

  const setState: React.Dispatch<React.SetStateAction<{Component}State>> =
    useCallback((action) => {
      const nextState = typeof action === 'function' ? action(state) : action
      if (nextState.value !== state.value) {
        setValue(nextState.value)
      }
    }, [state, setValue])

  // === Status 패턴 사용 시 ===
  const status = deriveStatus(state)
  const prevStatusRef = useRef<{Component}Status>('idle')

  // 최신 값 refs
  const stateRef = useLatestRef(state)
  const setStateRef = useLatestRef(setState)

  // Effect 실행 함수
  const runEffect = useCallback((effect: {Component}Effect) => {
    switch (effect.type) {
      case 'EFFECT_NAME':
        // 부수효과 실행
        break
      // ...
    }
  }, [/* dependencies */])

  // Status 전환 시 효과 실행
  useLayoutEffect(() => {
    const effects = getEffectsOnStatusChange(prevStatusRef.current, status)
    effects.forEach(runEffect)
    prevStatusRef.current = status
  }, [status, runEffect])

  // 언마운트 시 리소스 정리
  useEffect(() => {
    return () => {
      // cleanup
      prevStatusRef.current = 'idle'
    }
  }, [])
  // === Status 패턴 끝 ===

  const contextValue = useMemo<{Component}ContextValue>(
    () => ({ state, setState, store }),
    [state, setState, store],
  )

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
    const { state, setState, store } = use{Component}Context()

    const { ref, domId } = useNode<{Component}Role, {Component}Meta>({
      role: 'trigger',
      id: someId,
      meta: { /* ... */ },
    })

    const handleClick = useCallback(() => {
      setState(someAction(state))
    }, [state, setState])

    return (
      <button
        ref={composeRefs(forwardedRef, ref)}
        {...mergeProps(
          {
            type: 'button',
            id: domId,
            onClick: handleClick,
            // ARIA attributes
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

### 2. Status 패턴

상태(State)에서 상태 전환을 위한 Status를 파생:

```typescript
// State (복잡한 객체)
type ModalState = { open: boolean; closeOnEscape: boolean; ... }

// Status (단순한 문자열)
type ModalStatus = 'idle' | 'closed' | 'open'

// 파생
function deriveStatus(state: ModalState): ModalStatus {
  return state.open ? 'open' : 'closed'
}
```

**왜 Status가 필요한가?**
- `useLayoutEffect` 의존성 배열에 객체를 넣으면 매번 실행됨
- Status는 primitive이므로 값이 실제로 바뀔 때만 effect 실행

### 3. Effect as Data

부수효과를 데이터로 표현하고 Shell에서 해석:

```typescript
// Core: 부수효과를 데이터로 반환
function getEffectsOnStatusChange(prev, next): Effect[] {
  if (prev === 'closed' && next === 'open') {
    return [
      { type: 'LOCK_BODY_SCROLL' },
      { type: 'ACTIVATE_FOCUS_TRAP' },
    ]
  }
  return []
}

// Shell: 부수효과 해석 및 실행
function runEffect(effect: Effect) {
  switch (effect.type) {
    case 'LOCK_BODY_SCROLL':
      document.body.style.overflow = 'hidden'
      break
    case 'ACTIVATE_FOCUS_TRAP':
      focusTrap.activate()
      break
  }
}
```

### 4. handlersRef 패턴

이벤트 핸들러를 안정적으로 유지하면서 최신 상태 참조:

```typescript
const stateRef = useLatestRef(state)
const setStateRef = useLatestRef(setState)

// 한 번만 생성되는 핸들러들
const handlersRef = useRef({
  onClick: (e: PointerEvent) => {
    // 최신 상태는 ref를 통해 참조
    setStateRef.current(someAction(stateRef.current))
  },
  onKeyDown: (e: KeyboardEvent) => {
    // ...
  },
})

// Effect에서 안정적인 참조로 리스너 등록
useLayoutEffect(() => {
  document.addEventListener('click', handlersRef.current.onClick)
  return () => document.removeEventListener('click', handlersRef.current.onClick)
}, [])
```

### 5. Cleanup vs Effect 분리

```typescript
// Status 전환에 따른 효과 실행
useLayoutEffect(() => {
  const effects = getEffectsOnStatusChange(prevStatusRef.current, status)
  effects.forEach(runEffect)
  prevStatusRef.current = status
}, [status, runEffect])

// 언마운트 시 리소스 정리 (별도)
useEffect(() => {
  return () => {
    // 예상치 못한 언마운트에 대비한 정리
    document.removeEventListener('click', handlersRef.current.onClick)
    prevStatusRef.current = 'idle'
  }
}, [])
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

### useComponentSubscribe - 렌더링에 필요한 파생값

```typescript
const hasChildren = useComponentSubscribe(
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

## 컴포넌트 분류

| 컴포넌트 | 패턴 | 외부 리소스 |
|---------|------|------------|
| Accordion | 기본 | 없음 |
| Tabs | 기본 | 없음 |
| Pagination | 기본 | 없음 |
| Modal | Status | focus-trap, scroll-lock |
| Menu | Status | document 이벤트 리스너 |
| Tree | 기본 | 없음 |

---

## 파일 작성 순서 (권장)

1. **`core.ts`** - 상태 타입과 순수 함수 정의
2. **`index.tsx`** - Shell 구현 (Root부터 시작)
3. **`styled.tsx`** - 스타일링된 버전 (선택)
4. **`examples.tsx`** - 사용 예시

---

## 체크리스트

### Core 작성 시
- [ ] 모든 함수가 순수한가? (부수효과 없음)
- [ ] 상태는 불변으로 다루고 있는가?
- [ ] React/DOM 의존성이 없는가?
- [ ] 외부 리소스 관리가 필요하면 Status 패턴을 사용했는가?

### Shell 작성 시
- [ ] `ComponentStoreProvider`로 Root를 감쌌는가?
- [ ] `useControllableState`로 controlled/uncontrolled 지원하는가?
- [ ] `useNode`로 노드를 등록했는가?
- [ ] `composeRefs`와 `mergeProps`를 사용했는가?
- [ ] ARIA 속성을 올바르게 설정했는가?
- [ ] Status 패턴 사용 시 cleanup이 분리되어 있는가?
