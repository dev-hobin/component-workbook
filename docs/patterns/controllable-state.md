# Controllable State

Controlled와 Uncontrolled 모드를 모두 지원하는 패턴.

## 개요

```tsx
// Controlled - 외부에서 상태 제어
<Dropdown open={open} onOpenChange={setOpen} />

// Uncontrolled - 내부에서 상태 관리
<Dropdown defaultOpen={false} />
```

---

## useControllableState

`@radix-ui/react-use-controllable-state` 사용.

```typescript
import { useControllableState } from '@radix-ui/react-use-controllable-state'

function Root({ value, defaultValue, onValueChange }: Props) {
  const [currentValue, setCurrentValue] = useControllableState({
    prop: value,
    defaultProp: defaultValue ?? initialValue,
    onChange: onValueChange,
  })

  // currentValue: 현재 값
  // setCurrentValue: 값 변경 (controlled면 onChange 호출, uncontrolled면 내부 상태 변경)
}
```

---

## Props 네이밍

| Controlled | Uncontrolled | Callback |
|------------|--------------|----------|
| `value` | `defaultValue` | `onValueChange` |
| `open` | `defaultOpen` | `onOpenChange` |
| `expandedIds` | `defaultExpandedIds` | `onExpandedIdsChange` |

---

## Event Machine과 연결

```typescript
function RootInner({ value, defaultValue, onValueChange, loop }: Props) {
  // 1. Controllable state
  const [currentValue, setCurrentValue] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  // 2. Event Machine에 전달
  const { send } = useEventMachine(myMachine, {
    value: currentValue,
    onValueChange: setCurrentValue,
    loop,
    getElement: (id) => store.getElement(id, 'item'),
  })

  // 3. 이벤트 발송
  return <button onClick={() => send('TOGGLE')}>Toggle</button>
}
```

---

## 주의사항

### defaultProp은 초기값으로만 사용됨

```tsx
// 마운트 후 defaultValue 변경해도 반영 안됨
<Select defaultValue="option-1" />

// 런타임 변경이 필요하면 controlled 사용
<Select value={value} onValueChange={setValue} />
```

### 참조 타입 기본값

```typescript
// defaultProp이 undefined면 초기값 지정
const [expanded, setExpanded] = useControllableState({
  prop: expandedIds,
  defaultProp: defaultExpandedIds ?? new Set(),
  onChange: onExpandedIdsChange,
})
```
