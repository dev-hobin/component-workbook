# Primitives

컴포넌트 트리 구조를 추적하고 관리하기 위한 저수준 유틸리티 모음.

## 핵심 개념

### 언제 무엇을 사용할까?

| 필요한 것 | 사용할 도구 | 사용 시점 |
|----------|------------|----------|
| 렌더링 중 depth/level 정보 | `useLevel()` | 동기적 (첫 렌더링 OK) |
| 렌더링 중 부모 ID | `useParentId()` | 동기적 (첫 렌더링 OK) |
| DOM element 등록 + 추적 | `useNode()` | 비동기 (렌더링 후) |
| DOM 없이 논리적 노드 등록 | `useLogicalNode()` | 비동기 (렌더링 후) |
| Store 데이터 구독 | `useStoreSubscribe()` | 동기적 구독 |

### 타이밍 이해하기

```
렌더링 단계 (Render Phase)
├── React Context 사용 가능 ✅
│   ├── useParentId() → 부모 ID
│   └── useLevel() → 현재 depth
│
└── Store 비어있음 ❌
    └── store.getNode() → null

커밋 단계 (Commit Phase)
├── useNode의 ref callback 실행 → Store에 등록
└── useLogicalNode의 useLayoutEffect 실행 → Store에 등록

이후 렌더링
└── Store 데이터 사용 가능 ✅
    └── useStoreSubscribe() → 실시간 구독
```

## API Reference

---

### ParentProvider / useParentId / useLevel

React Context 기반으로 부모-자식 관계와 depth를 추적.

```tsx
import { ParentProvider, useParentId, useLevel } from './use-parent-context'

// Root 컴포넌트에서
<ParentProvider id={null}>
  {children}
</ParentProvider>

// Item 컴포넌트에서
function Item({ value, children }) {
  const parentId = useParentId()  // 부모의 value
  const level = useLevel()        // 1부터 시작하는 depth

  return (
    <ParentProvider id={value}>
      {children}
    </ParentProvider>
  )
}
```

**특징:**
- 렌더링 중 동기적으로 사용 가능
- 첫 렌더링부터 정확한 값 제공
- depth 계산에 적합

**사용 예시:**
```tsx
// depth 기반 들여쓰기
function useDepth(): number {
  const level = useLevel()
  return level - 1  // level은 1부터 시작
}
```

---

### NodeStoreProvider / useNodeStore

컴포넌트 트리 전체에서 공유되는 Store를 제공.

```tsx
import { NodeStoreProvider, useNodeStore } from './use-node-store'

// Root에서 Provider 설정
function TreeRoot({ children }) {
  return (
    <NodeStoreProvider<TreeRole, TreeMeta>>
      {children}
    </NodeStoreProvider>
  )
}

// 하위 컴포넌트에서 Store 접근
function TreeItem() {
  const store = useNodeStore<TreeRole, TreeMeta>()
  // store.getNode(), store.getNodesByRole() 등 사용
}
```

---

### useNode

DOM element를 Store에 등록. element가 마운트될 때 등록, 언마운트될 때 해제.

```tsx
import { useNode } from './use-node'

function MenuItem({ value, disabled }) {
  const { id, domId, ref, elementRef } = useNode<MenuRole, MenuItemMeta>({
    role: 'item',
    id: value,           // optional: 생략하면 자동 생성
    domId: `menu-${value}`, // optional: DOM id 속성용
    meta: { value, disabled },
  })

  return <div ref={ref} id={domId}>...</div>
}
```

**반환값:**
- `id`: 논리적 ID (사용자 지정 또는 자동 생성)
- `domId`: DOM element의 id 속성용 문자열
- `ref`: DOM element에 연결할 callback ref
- `elementRef`: 현재 element를 담은 ref 객체

**등록 시점:** ref callback이 호출될 때 (DOM 마운트 후)

---

### useLogicalNode

DOM element 없이 논리적 노드만 Store에 등록. 컴포넌트가 마운트되어 있는 동안 유지.

```tsx
import { useLogicalNode } from './use-node'

function ItemGroup({ parentValue }) {
  // DOM이 렌더링되지 않아도 Store에 등록됨
  const { id, domId } = useLogicalNode<TreeRole, GroupMeta>({
    role: 'group',
    id: parentValue,
    meta: { parentValue },
  })

  // usePresence로 실제 렌더링 여부 결정
  const { isPresent } = usePresence({ isVisible: isExpanded })

  if (!isPresent) return null

  return <div id={domId}>...</div>
}
```

**useNode vs useLogicalNode:**

| | useNode | useLogicalNode |
|---|---------|----------------|
| DOM 필요 | ✅ 필요 | ❌ 불필요 |
| element 저장 | HTMLElement | null |
| 등록 시점 | ref callback | useLayoutEffect |
| 용도 | 실제 DOM 요소 | 논리적 구조만 필요할 때 |

**사용 예시 - hasChildren 감지:**
```tsx
// ItemGroup이 DOM 없이도 등록되어 있으면
// 부모 Item에서 hasChildren을 감지할 수 있음
function useHasChildren(value: ItemValue): boolean {
  const { store } = useTreeContext()

  return useStoreSubscribe(store, (s) => {
    const groups = s.getNodesByRole('group')
    return groups.some(
      (node) => 'parentValue' in node.meta && node.meta.parentValue === value
    )
  })
}
```

---

### useStoreSubscribe

Store의 파생값을 구독. `useSyncExternalStore` 기반으로 동기적 구독 제공.

```tsx
import { useStoreSubscribe } from './use-store-subscribe'

function useEnabledItems() {
  const store = useNodeStore<MenuRole, MenuItemMeta>()

  return useStoreSubscribe(store, (s) => {
    return s.getNodesByRole('item')
      .filter((node) => !node.meta.disabled)
      .map((node) => node.meta.value)
  })
}
```

**왜 useState + useEffect 대신 이걸 사용?**

```tsx
// ❌ Bad: 첫 렌더링에서 빈 값, effect 후 업데이트 → 깜빡임
const [items, setItems] = useState([])
useEffect(() => {
  setItems(store.getNodesByRole('item'))
  return store.subscribe(() => setItems(store.getNodesByRole('item')))
}, [store])

// ✅ Good: 동기적 구독, 깜빡임 없음
const items = useStoreSubscribe(store, (s) => s.getNodesByRole('item'))
```

---

### NodeStore API

Store 인스턴스의 메서드들:

```tsx
interface NodeStore<Role, Meta> {
  // 등록/해제
  register(node: ComponentNode<Role, Meta>): void
  unregister(id: NodeId, role: Role): void

  // 구독
  subscribe(listener: () => void): () => void

  // 조회
  getNode(id: NodeId, role: Role): ComponentNode | null
  getElement(id: NodeId, role: Role): HTMLElement | null
  getNodes(): Map<StoreKey, ComponentNode>
  getNodesByRole(role: Role): ComponentNode[]
  getChildren(parentId: NodeId | null): ComponentNode[]
  getChildrenByRole(parentId: NodeId | null, role: Role): ComponentNode[]
  filterNodesByMeta(role: Role, predicate: (meta: Meta) => boolean): ComponentNode[]
}
```

---

## 실전 패턴

### 패턴 1: 트리 구조에서 depth 계산

```tsx
// ✅ React Context 사용 (첫 렌더링부터 정확)
function useDepth(): number {
  const level = useLevel()
  return level - 1
}

// ❌ Store 쿼리 (첫 렌더링에서 실패)
function useDepth(): number {
  const { store } = useContext()
  let depth = 0
  let parent = useParentId()
  while (parent) {
    depth++
    const node = store.getNode(parent, 'item') // 첫 렌더링: null!
    parent = node?.meta.parentValue
  }
  return depth
}
```

### 패턴 2: 자식 존재 여부 감지

```tsx
// ItemGroup에서 useLogicalNode로 등록
function ItemGroup({ parentValue }) {
  useLogicalNode({
    role: 'group',
    id: parentValue,
    meta: { parentValue },
  })
  // ...
}

// Item에서 useStoreSubscribe로 감지
function useHasChildren(value: ItemValue): boolean {
  const { store } = useTreeContext()

  return useStoreSubscribe(store, (s) =>
    s.getNodesByRole('group').some(
      (node) => 'parentValue' in node.meta && node.meta.parentValue === value
    )
  )
}
```

### 패턴 3: 키보드 네비게이션용 요소 목록

```tsx
function useVisibleItems() {
  const { store } = useMenuContext()

  return useStoreSubscribe(store, (s) => {
    return s.getNodesByRole('item')
      .filter((node) => !node.meta.disabled)
      .sort((a, b) => {
        // DOM 순서로 정렬
        if (!a.element || !b.element) return 0
        const pos = a.element.compareDocumentPosition(b.element)
        return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      })
      .map((node) => node.meta.value)
  })
}
```

---

## 주의사항

1. **첫 렌더링 데이터가 필요하면 React Context 사용**
   - `useLevel()`, `useParentId()`는 첫 렌더링부터 사용 가능
   - Store 쿼리는 커밋 후에만 데이터 있음

2. **Store 구독은 항상 `useStoreSubscribe` 사용**
   - `useState` + `useEffect` 패턴은 깜빡임 발생
   - `useSyncExternalStore` 기반으로 동기적 구독

3. **DOM 없이 구조만 추적하려면 `useLogicalNode`**
   - 애니메이션으로 DOM이 사라져도 논리적 구조는 유지
   - `usePresence`와 함께 사용

4. **타입 캐스팅 대신 타입 가드 사용**
   ```tsx
   // ❌ as 캐스팅
   const meta = node.meta as TreeGroupMeta

   // ✅ in 연산자로 타입 가드
   if ('parentValue' in node.meta) {
     node.meta.parentValue // 타입 추론됨
   }
   ```
