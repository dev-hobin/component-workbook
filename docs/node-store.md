# Component Store

Compound Component 패턴을 위한 노드 등록/조회 시스템.

## 개요

```
┌─────────────────────────────────────────────────────────┐
│  NodeStoreProvider                                  │
│                                                          │
│   Root ─── useNodeStore() → store                  │
│     │                                                    │
│     ├── Item ─── useNode({ role: 'item' })              │
│     │     └── Content ─── useNode({ role: 'content' })  │
│     │                                                    │
│     └── Item ─── useNode({ role: 'item' })              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## NodeStoreProvider

Root 컴포넌트에서 store를 생성하고 제공합니다.

```typescript
import { NodeStoreProvider } from '../primitives/use-node-store'

export function Root(props: RootProps) {
  return (
    <NodeStoreProvider>
      <RootInner {...props} />
    </NodeStoreProvider>
  )
}
```

---

## useNodeStore

자식 컴포넌트에서 store에 접근합니다.

```typescript
import { useNodeStore } from '../primitives/use-node-store'

function RootInner({ children }: RootProps) {
  const { store } = useNodeStore()

  // Event Machine에 헬퍼로 전달
  const { send } = useEventMachine(myMachine, {
    getElement: (id) => store.getElement(id, 'item'),
  })

  return <MyContext.Provider value={{ send, store }}>{children}</MyContext.Provider>
}
```

---

## useNode

컴포넌트를 store에 등록합니다.

```typescript
import { useNode } from '../primitives/use-node'

function Item({ id, children }: ItemProps) {
  const { ref, domId } = useNode({
    role: 'item',
    id,                    // 선택: 생략 시 자동 생성
    meta: { disabled },    // 선택: 메타 정보
  })

  return (
    <div ref={ref} id={domId}>
      {children}
    </div>
  )
}
```

### 반환값

| 필드 | 설명 |
|------|------|
| `id` | 노드 ID (props.id 또는 자동 생성) |
| `domId` | DOM id 속성값 (`${role}::${id}`) |
| `ref` | DOM 요소에 연결할 ref callback |
| `elementRef` | DOM 요소 직접 참조 |

---

## Store API

### 조회 메서드

```typescript
// 단일 노드 조회
store.getNode(id, role)     // ComponentNode | null
store.getElement(id, role)  // HTMLElement | null

// 역할별 조회
store.getNodesByRole(role)  // ComponentNode[]

// 자식 조회
store.getChildrenByRole(parentId, role)  // ComponentNode[]

// 필터링
store.filterNodesByRolesAndMeta(
  ['item', 'trigger'],
  (meta) => !meta.disabled
)
```

### Composite Key

같은 ID로 여러 역할의 노드를 구분합니다.

```typescript
// id="dropdown-1"인 컴포넌트의 각 파트 조회
store.getElement('dropdown-1', 'trigger')  // 트리거 버튼
store.getElement('dropdown-1', 'content')  // 컨텐츠 영역
store.getElement('dropdown-1', 'item')     // 개별 아이템
```

---

## useStoreSubscribe

렌더링에 필요한 파생값을 구독합니다.

```typescript
import { useStoreSubscribe } from '../primitives/use-store-subscribe'

function Item({ nodeId }: ItemProps) {
  const { store } = useMyContext()

  // 자식 존재 여부 구독 → 변경 시 리렌더
  const hasChildren = useStoreSubscribe(
    store,
    (s) => s.getChildrenByRole(nodeId, 'item').length > 0
  )

  return (
    <div aria-expanded={hasChildren ? isExpanded : undefined}>
      {children}
    </div>
  )
}
```

---

## ParentProvider

부모-자식 관계와 depth를 추적합니다.

```typescript
import { ParentProvider, useParentId, useLevel } from '../primitives/use-parent-context'

function Item({ id, children }: ItemProps) {
  const parentId = useParentId()  // 부모 ID (없으면 null)
  const level = useLevel()        // depth (1부터 시작)

  return (
    <ParentProvider id={id}>
      <div aria-level={level}>
        {children}
      </div>
    </ParentProvider>
  )
}
```

---

## 사용 시점 가이드

| 시점 | 방법 |
|------|------|
| 렌더링 | `useStoreSubscribe` 사용 |
| 이벤트 핸들러 | `store.getElement()` 직접 호출 |
| useEffect | `store.getElement()` 직접 호출 |
| Machine actions | `context.getElement()` 헬퍼 사용 |

### 올바른 사용

```typescript
// 이벤트 핸들러에서 (OK)
const handleClick = () => {
  const element = store.getElement(focusedId, 'item')
  element?.focus()
}

// useEffect에서 (OK)
useEffect(() => {
  const element = store.getElement(focusedId, 'item')
  element?.focus()
}, [focusedId])

// 렌더링에 필요한 값 (OK)
const hasChildren = useStoreSubscribe(store, (s) =>
  s.getChildrenByRole(nodeId, 'item').length > 0
)
```

### 잘못된 사용

```typescript
// 렌더링 시점에 직접 조회 (WRONG)
function Item() {
  // ❌ 첫 렌더 시 자식이 아직 등록 안 됨
  const children = store.getChildrenByRole(nodeId, 'item')
}
```

---

## DOM 유틸리티

```typescript
import { findNodeFromMouseEvent } from '../primitives/dom'

const handleClick = (event: React.MouseEvent) => {
  const itemNodes = store.getNodesByRole('item')
  const elements = new Map(
    itemNodes.map((node) => [node.id, node.element])
  )

  const clickedId = findNodeFromMouseEvent(event, elements)
  if (clickedId) {
    send('SELECT', { nodeId: clickedId })
  }
}
```
