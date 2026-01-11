# 컴포넌트 구현 가이드

이 문서는 공통 모듈을 사용하여 컴포넌트를 구현하는 방법을 설명합니다.

## 파일 구조

```
src/components/{component-name}/
├── machine.ts    # Event Machine 정의
└── index.tsx     # React Shell (Compound Component)
```

---

## 구현 순서

### 1. machine.ts 작성

```typescript
import { createEventMachine } from '../../event-machine'

// 1. Events 정의
export type MyEvents = {
  TOGGLE: undefined
  SELECT: { itemId: string }
}

// 2. Input 정의
export type MyInput = {
  value: string
  onValueChange: (value: string) => void
  getElement: (id: string) => HTMLElement | null
}

// 3. Machine 정의
export const myMachine = createEventMachine<{
  input: MyInput
  events: MyEvents
  actions: 'toggle' | 'select'
}>({
  on: {
    TOGGLE: 'toggle',
    SELECT: 'select',
  },
  actions: {
    toggle: (context) => { ... },
    select: (context, payload) => { ... },
  },
})
```

### 2. index.tsx 작성

```typescript
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useEventMachine } from '../../event-machine'
import { NodeStoreProvider, useNodeStore } from '../../primitives/use-node-store'
import { useNode } from '../../primitives/use-node'
import { myMachine } from './machine'

// Root
export function Root(props: RootProps) {
  return (
    <NodeStoreProvider>
      <RootInner {...props} />
    </NodeStoreProvider>
  )
}

function RootInner({ value, defaultValue, onValueChange, children }: RootProps) {
  const { store } = useNodeStore()

  const [currentValue, setCurrentValue] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  const { send } = useEventMachine(myMachine, {
    value: currentValue,
    onValueChange: setCurrentValue,
    getElement: (id) => store.getElement(id, 'item'),
  })

  return (
    <MyContext.Provider value={{ send, store }}>
      {children}
    </MyContext.Provider>
  )
}

// Item
export function Item({ id, children }: ItemProps) {
  const { send } = useMyContext()
  const { ref, domId } = useNode({ role: 'item', id })

  return (
    <div ref={ref} id={domId} onClick={() => send('SELECT', { itemId: id })}>
      {children}
    </div>
  )
}
```

---

## 공통 모듈

### Event Machine

상태 관리 로직을 정의합니다. [상세 문서](./event-machine.md)

```typescript
const { send, computed } = useEventMachine(machine, input)
```

### Controllable State

Controlled/Uncontrolled 모드 지원. [상세 문서](./controllable-state.md)

```typescript
const [value, setValue] = useControllableState({
  prop: valueProp,
  defaultProp: defaultValue,
  onChange: onValueChange,
})
```

### NodeStore

노드 등록/조회. [상세 문서](../node-store.md)

```typescript
// Root에서 Provider
<NodeStoreProvider>
  <RootInner />
</NodeStoreProvider>

// 자식에서 사용
const { store } = useNodeStore()
const { ref, domId } = useNode({ role: 'item', id })
```

---

## Input 설계 가이드

| 카테고리 | 예시 |
|----------|------|
| 상태값 | `value`, `isOpen`, `focusedId`, `expandedIds` |
| 콜백 | `onValueChange`, `onOpenChange`, `onFocusedIdChange` |
| 옵션 | `loop`, `closeOnSelect`, `disabled` |
| 헬퍼 | `getElement`, `getItems`, `getParentId` |

---

## Effects 사용 시점

| 상황 | 사용 |
|------|------|
| 외부 클릭 감지 | `watch: isOpen` + `enter`에서 document 리스너 |
| 포커스 동기화 | `watch: focusedId` + `change`에서 focus() |
| 스크롤 동기화 | `watch: highlightedId` + `change`에서 scrollIntoView() |

---

## Computed 사용 시점

| 상황 | 예시 |
|------|------|
| 페이지네이션 | `totalPages`, `hasPrev`, `hasNext` |
| 메뉴 | `activeMenuId`, `isOpen` |
| 활성 상태 | `isSelected`, `isExpanded` |
