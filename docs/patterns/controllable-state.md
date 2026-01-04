# Controllable State 패턴

## 개요

Controllable State는 컴포넌트가 **Controlled 모드**와 **Uncontrolled 모드** 둘 다 지원하도록 하는 패턴입니다.

---

## Controlled vs Uncontrolled

### Controlled 모드

외부에서 상태를 완전히 제어:

```tsx
function App() {
  const [open, setOpen] = useState(false)

  return (
    <Modal
      open={open}                    // 외부가 상태 제어
      onOpenChange={setOpen}         // 변경 알림 받기
    >
      <Modal.Trigger>Open</Modal.Trigger>
      <Modal.Content>...</Modal.Content>
    </Modal>
  )
}
```

### Uncontrolled 모드

컴포넌트가 내부적으로 상태 관리:

```tsx
function App() {
  return (
    <Modal defaultOpen={false}>      {/* 초기값만 제공 */}
      <Modal.Trigger>Open</Modal.Trigger>
      <Modal.Content>...</Modal.Content>
    </Modal>
  )
}
```

---

## useControllableState

Radix UI의 `@radix-ui/react-use-controllable-state` 사용:

```typescript
import { useControllableState } from '@radix-ui/react-use-controllable-state'

function RootInner({
  open,           // controlled value
  defaultOpen,    // uncontrolled default
  onOpenChange,   // change callback
}: RootProps) {
  const [openValue, setOpenValue] = useControllableState({
    prop: open,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  })

  // openValue: 현재 값 (controlled든 uncontrolled든 동일하게 사용)
  // setOpenValue: 값 변경 함수 (내부 상태 또는 onChange 호출)
}
```

### 동작 원리

| 모드 | `prop` | 결과 |
|------|--------|------|
| Uncontrolled | `undefined` | 내부 useState 사용 |
| Controlled | 값 제공 | prop 값 직접 사용, onChange 호출 |

---

## Props 설계

### 명명 규칙

```typescript
type RootProps = {
  // Controlled
  value?: string              // 현재 값
  open?: boolean
  expandedIds?: Set<string>

  // Uncontrolled default
  defaultValue?: string       // 초기값
  defaultOpen?: boolean
  defaultExpandedIds?: Set<string>

  // Change callback
  onValueChange?: (value: string) => void
  onOpenChange?: (open: boolean) => void
  onExpandedIdsChange?: (ids: Set<string>) => void
}
```

### 예시: Accordion

```typescript
type AccordionRootProps = {
  children: React.ReactNode

  // Controlled
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void

  // 단일/다중 선택 모드
  type?: 'single' | 'multiple'
  collapsible?: boolean
}
```

### 예시: Modal

```typescript
type ModalRootProps = {
  children: React.ReactNode

  // Controlled
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void

  // 옵션
  closeOnEscape?: boolean
  closeOnOutsideClick?: boolean
}
```

### 예시: Menu

```typescript
type MenuRootProps = {
  children: React.ReactNode
  menuId?: string

  // Controlled
  openedPath?: MenuId[]
  defaultOpenedPath?: MenuId[]
  onOpenedPathChange?: (path: MenuId[]) => void
}
```

---

## 복합 상태 처리

상태가 여러 필드로 구성된 경우:

### 방법 1: 각 필드별 controllable

```typescript
function RootInner({
  focusedId,
  defaultFocusedId,
  onFocusChange,

  selectedId,
  defaultSelectedId,
  onSelectChange,

  expandedIds,
  defaultExpandedIds,
  onExpandChange,
}: RootProps) {
  const [focused, setFocused] = useControllableState({
    prop: focusedId,
    defaultProp: defaultFocusedId,
    onChange: onFocusChange,
  })

  const [selected, setSelected] = useControllableState({
    prop: selectedId,
    defaultProp: defaultSelectedId,
    onChange: onSelectChange,
  })

  const [expanded, setExpanded] = useControllableState({
    prop: expandedIds,
    defaultProp: defaultExpandedIds,
    onChange: onExpandChange,
  })

  // State 구성
  const state = useMemo(
    () => ({ focusedId: focused, selectedId: selected, expandedIds: expanded }),
    [focused, selected, expanded],
  )

  // setState 구현
  const setState = useCallback((action) => {
    const next = typeof action === 'function' ? action(state) : action
    if (next.focusedId !== state.focusedId) setFocused(next.focusedId)
    if (next.selectedId !== state.selectedId) setSelected(next.selectedId)
    if (next.expandedIds !== state.expandedIds) setExpanded(next.expandedIds)
  }, [state, setFocused, setSelected, setExpanded])
}
```

### 방법 2: 핵심 값만 controllable

```typescript
function RootInner({
  // 외부 제어가 필요한 값만 controllable
  expandedIds,
  defaultExpandedIds,
  onExpandChange,
}: RootProps) {
  const [expanded, setExpanded] = useControllableState({
    prop: expandedIds,
    defaultProp: defaultExpandedIds ?? new Set(),
    onChange: onExpandChange,
  })

  // 내부 상태는 일반 useState
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const state = useMemo(
    () => ({ expandedIds: expanded, focusedId }),
    [expanded, focusedId],
  )
}
```

---

## State와 setState 추상화

Core의 순수 함수와 연결하기 위해 통합된 setState 제공:

```typescript
function RootInner({ ... }) {
  const [value, setValue] = useControllableState({ ... })
  const [focusedId, setFocusedId] = useState(null)

  // State 구성
  const state: AccordionState = useMemo(
    () => ({ expandedIds: value, focusedId }),
    [value, focusedId],
  )

  // 통합된 setState
  const setState: React.Dispatch<React.SetStateAction<AccordionState>> =
    useCallback(
      (action) => {
        const nextState = typeof action === 'function' ? action(state) : action

        // 각 필드별로 변경 감지 및 업데이트
        if (nextState.expandedIds !== state.expandedIds) {
          setValue(nextState.expandedIds)
        }
        if (nextState.focusedId !== state.focusedId) {
          setFocusedId(nextState.focusedId)
        }
      },
      [state, setValue],
    )

  // Core 함수와 함께 사용
  const handleToggle = useCallback((itemId: string) => {
    setState(toggle(state, itemId)) // Core의 toggle 함수 사용
  }, [state, setState])
}
```

---

## Context로 전달

```typescript
type AccordionContextValue = {
  state: AccordionState
  setState: React.Dispatch<React.SetStateAction<AccordionState>>
  store: ComponentStore<AccordionRole, AccordionMeta>
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

function RootInner({ ... }) {
  // ... state, setState 구성

  const contextValue = useMemo<AccordionContextValue>(
    () => ({ state, setState, store }),
    [state, setState, store],
  )

  return (
    <AccordionContext.Provider value={contextValue}>
      {children}
    </AccordionContext.Provider>
  )
}

// 자식 컴포넌트에서 사용
function Trigger({ itemId }: TriggerProps) {
  const { state, setState } = useAccordionContext()

  const handleClick = useCallback(() => {
    setState(toggle(state, itemId))
  }, [state, setState, itemId])

  // ...
}
```

---

## 주의사항

### 1. Controlled에서 값 변경 무시하지 않기

```typescript
// ❌ controlled인데 내부에서 무시
const [value, setValue] = useControllableState({
  prop: valueProp,
  onChange: onValueChange,
})

// setValue를 호출하지 않으면 controlled 값이 반영 안됨
```

### 2. defaultProp은 초기값으로만

```typescript
// defaultProp이 변경되어도 이미 마운트된 상태에서는 무시됨
<Accordion defaultValue="item-1" /> // 처음에만 적용

// 런타임에 변경하려면 controlled 사용
<Accordion value={value} onValueChange={setValue} />
```

### 3. 참조 타입의 기본값

```typescript
// ❌ 매번 새 객체 생성
const [expanded] = useControllableState({
  defaultProp: new Set(), // 렌더마다 새 Set!
})

// ✅ 상수로 정의
const EMPTY_SET = new Set<string>()

const [expanded] = useControllableState({
  defaultProp: defaultExpandedIds ?? EMPTY_SET,
})

// 또는 ?? 연산자로 안전하게
const [expanded] = useControllableState({
  prop: expandedIds,
  defaultProp: defaultExpandedIds ?? new Set(), // defaultProp은 한 번만 사용
})
```

---

## 핵심 원칙

1. **Controlled와 Uncontrolled 모두 지원**: 사용자 선택권 제공
2. **명확한 Props 명명**: `value` / `defaultValue` / `onValueChange`
3. **통합된 setState**: Core 함수와 일관된 인터페이스
4. **핵심 값만 controllable**: 모든 상태를 외부에 노출할 필요 없음
5. **기본값 주의**: 참조 타입은 상수로 정의
