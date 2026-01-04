# Component Store 아키텍처

## 개요

Compound Component 패턴을 위한 통합 상태 관리 시스템.
`registry-core`와 `structure-core`를 하나의 `component-store`로 통합하여 일관된 API 제공.

## 핵심 원칙

### Functional Core / Imperative Shell 패턴

```
┌─────────────────────────────────────────────────────────┐
│                    Imperative Shell                      │
│  (React 컴포넌트, DOM 이벤트, 훅)                         │
│                                                          │
│   ┌─────────────────────────────────────────────────┐   │
│   │              Functional Core                     │   │
│   │  (순수 함수, 불변 데이터, DOM/React 모름)          │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

- **Core**: 순수 함수, 상태 변환 로직
- **Shell**: React 훅, DOM 연결, 이벤트 핸들링

---

## 파일 구조

```
src/
├── core/
│   └── component-store.ts    # 핵심 스토어 (순수)
│
└── shell/
    ├── use-component-store.tsx   # Context Provider
    ├── use-node.ts               # 노드 등록 훅
    ├── use-parent-context.tsx    # 부모-자식 관계 Context
    └── use-component-subscribe.ts # 🆕 스토어 구독 훅
```

---

## Core: component-store.ts

### Composite Key 설계

같은 논리적 ID를 가진 여러 역할(role)의 노드를 구분:

```typescript
export type StoreKey = string  // `${id}:${role}`

export function createStoreKey(id: NodeId, role: string): StoreKey {
  return `${id}:${role}`
}
```

**예시**: Menu의 `menuId="file"`
- `file:trigger` - 트리거 버튼
- `file:content` - 컨텐츠 영역
- `file:positioner` - 위치 계산용

### 인터페이스

```typescript
export interface ComponentStore<Role, Meta> {
  // 등록/해제
  register(node: ComponentNode<Role, Meta>): void
  unregister(id: NodeId, role: Role): void

  // 🆕 구독 (useSyncExternalStore용)
  subscribe(listener: StoreListener): () => void

  // 동기 조회 API
  getNode(id: NodeId, role: Role): ComponentNode | null
  getElement(id: NodeId, role: Role): HTMLElement | null
  getNodesByRole(role: Role): ComponentNode[]
  getChildrenByRole(parentId: NodeId | null, role: Role): ComponentNode[]
  filterNodesByRolesAndMeta(roles: Role[], predicate: (meta) => boolean): ComponentNode[]
  // ...
}
```

### 🆕 Subscribe 메커니즘

```typescript
const listeners = new Set<StoreListener>()

function notify() {
  for (const listener of listeners) {
    listener()
  }
}

return {
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  register(node) {
    // ... 등록 로직
    notify()  // 변경 알림
  },

  unregister(id, role) {
    // ... 해제 로직
    notify()  // 변경 알림
  },
}
```

---

## Shell: 훅들

### use-node.ts

**역할**: 컴포넌트를 store에 등록하고 DOM 요소 참조 관리

```typescript
export function useNode<Role, Meta>(options: {
  role: Role
  id?: NodeId      // 생략 시 useId()로 자동 생성
  domId?: string   // 생략 시 `${role}::${id}` 형태로 자동 생성
  meta?: Meta
}) {
  return { id, domId, ref, elementRef }
}
```

**핵심 설계 결정 - ref callback 방식**:

```typescript
const ref = useCallback(
  (element: HTMLElement | null) => {
    if (elementRef.current === element) return

    if (elementRef.current) {
      store.unregister(id, role)
    }

    elementRef.current = element

    if (element) {
      store.register({ id, parentId, role, meta, element })
    }
  },
  [id, parentId, role, store, metaRef],
)
```

**왜 ref callback인가?**
- `useLayoutEffect`보다 먼저 실행됨
- 자식 → 부모 순서로 실행되어 순서 독립성 보장
- DOM 요소가 붙는 즉시 등록

### use-parent-context.tsx

**역할**: 부모-자식 관계와 depth(level) 추적

```typescript
type ParentContextValue = {
  id: NodeId
  level: number
}

export function ParentProvider({ id, children }) {
  const parent = useContext(ParentContext)
  const level = parent ? parent.level + 1 : 1

  return (
    <ParentContext.Provider value={{ id, level }}>
      {children}
    </ParentContext.Provider>
  )
}

export function useParentId(): NodeId | null
export function useLevel(): number
```

### 🆕 use-component-subscribe.ts

**역할**: store의 파생값을 React 상태로 구독

```typescript
export function useComponentSubscribe<Role, Meta, T>(
  store: ComponentStore<Role, Meta>,
  selector: (store: ComponentStore<Role, Meta>) => T,
): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store),
  )
}
```

**사용 예시**:

```typescript
// Item에서 자식 존재 여부 구독
const hasChildren = useComponentSubscribe(
  store,
  (s) => s.getChildrenByRole(nodeId, 'item').length > 0,
)
```

---

## Store 사용 패턴

### 올바른 사용

**1. 이벤트 핸들러에서 동기 조회 (OK)**

```typescript
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  const children = store.getChildrenByRole(focusedId, 'item')
  // 이벤트 시점에 조회하므로 모든 컴포넌트가 마운트된 상태
}, [store, focusedId])
```

**2. useEffect/useLayoutEffect에서 조회 (OK)**

```typescript
useEffect(() => {
  const element = store.getElement(focusedId, 'item')
  element?.focus()
}, [focusedId, store])
```

**3. 🆕 렌더링에 필요한 파생값은 useComponentSubscribe (OK)**

```typescript
function Item({ nodeId }) {
  const hasChildren = useComponentSubscribe(
    store,
    (s) => s.getChildrenByRole(nodeId, 'item').length > 0,
  )

  return (
    <li aria-expanded={hasChildren ? isExpanded : undefined}>
      {children}
    </li>
  )
}
```

### 잘못된 사용

**렌더링 시점에 직접 store 조회 (WRONG)**

```typescript
function Item({ nodeId }) {
  const { store } = useTreeContext()

  // ❌ 첫 렌더 시점에 자식이 아직 등록 안 됐을 수 있음
  const children = store.getChildrenByRole(nodeId, 'item')
  const isLeaf = children.length === 0

  return <li>...</li>
}
```

---

## 🆕 useComponentSubscribe 동작 원리

### 흐름

```
1. 첫 렌더: getSnapshot() → 자식 없음 → hasChildren = false
2. DOM commit: 자식 ref callback → store에 등록 → notify()
3. useSyncExternalStore가 리렌더 트리거
4. 두 번째 렌더: getSnapshot() → 자식 있음 → hasChildren = true
```

### 무한 리렌더링 걱정 없음

`notify()`는 `register`/`unregister` 할 때만 호출됨.
ref callback은 DOM 변경 시에만 실행되므로 무한 루프 없음.

```
register → notify() → getSnapshot() → 새 값 → 렌더
                                        ↓
                         (notify 없음) → 끝
```

---

## ID 관리

### 자동 생성 (권장)

```typescript
const { id, domId, ref } = useNode<Role>({
  role: 'item',
  // id, domId 생략 → 자동 생성
})
// id: React useId() 결과
// domId: `item::${id}` 형태
```

### 사용자 지정 ID

```typescript
const { id, domId, ref } = useNode<Role>({
  role: 'item',
  id: props.id,        // 논리적 ID (상태 관리용)
  domId: props.id,     // DOM id 속성
})
```

---

## 컴포넌트 예시: TreeView

```typescript
function Item({ nodeId, children, className }: ItemProps) {
  const { state, store } = useTreeContext()
  const { ref, domId } = useNode<TreeRole>({
    role: 'item',
    id: nodeId,
  })

  // 🆕 store 구독으로 자식 존재 여부 추적
  const level = useLevel()
  const hasChildren = useComponentSubscribe(
    store,
    (s) => s.getChildrenByRole(nodeId, 'item').length > 0,
  )

  const isExpanded = hasChildren && state.expandedIds.has(nodeId)
  const isSelected = state.selectedId === nodeId
  const isFocused = state.focusedId === nodeId

  return (
    <ParentProvider id={nodeId}>
      <li
        ref={ref}
        id={domId}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={level}
        tabIndex={isFocused ? 0 : -1}
      >
        {children}
      </li>
    </ParentProvider>
  )
}
```

---

## 핵심 교훈

### 1. 렌더링 vs 이벤트 시점 구분

| 시점 | store 조회 방법 |
|------|----------------|
| 렌더링 | `useComponentSubscribe` 사용 |
| 이벤트 핸들러 | 직접 조회 OK |
| useEffect/useLayoutEffect | 직접 조회 OK |

### 2. React의 한계 인정

"자식 존재 여부를 부모가 렌더 시점에 알기"는 구조적으로 불가능.
`useSyncExternalStore`로 commit 후 리렌더해서 반영하는 게 React 안에서 할 수 있는 최선.

### 3. Context로 해결 가능한 것

- `level` (depth) → `ParentProvider`가 자동 계산
- `parentId` → `ParentProvider`에서 제공

### 4. ref callback의 실행 순서

React는 ref callback을 **자식 → 부모** 순서로 실행.
따라서 자식이 store에 먼저 등록됨.

---

## 삭제된 레거시 코드

리팩토링 과정에서 제거된 파일들:

- `src/core/id-core.ts` - `createIdGenerator`
- `src/core/structure-core.ts` - 구조 관리
- `src/core/registry-core.ts` - 요소 등록
- `src/core/build-visible-nodes.ts` - visible nodes 계산
- `src/shell/use-dom-id.ts` - ID 생성 훅

**이유**:
- `useNode`가 ID 생성, DOM 등록, 부모-자식 관계를 통합 관리
- `useComponentSubscribe`가 파생값 계산을 대체
- 중간 데이터 구조체(`TreeShape`, `VisibleNode`) 불필요
