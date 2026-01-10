# Discussion 05: Machine의 범위와 경계

> 미해결 문제들에 대한 입장 정리

## Machine이 해결하는 것

| 문제 | 해결 방법 | Discussion |
|------|----------|------------|
| 상태폭발 (guard 반복) | state 기반 구조 | 02 |
| 비동기 처리 | effects에서 send | 03 |
| Delayed transition | effects + setTimeout + send | 03 |
| Race condition | change cleanup 반환 | 03 |
| 복합 조건 감시 | 복합 watch | 04 |

---

## Machine 범위 밖: Machine 간 조율

### 문제

> "Modal 안의 Combobox - Combobox 열릴 때 Modal의 focus trap 일시 해제"

### 판단: Shell 책임

Machine은 단일 컴포넌트의 상태 로직만 담당. 컴포넌트 간 조율은 Shell에서 처리.

```tsx
// Modal Shell
function ModalRoot({ children }) {
  const [comboboxOpen, setComboboxOpen] = useState(false)

  // Combobox 상태를 prop으로 받아서 focus trap 조절
  useFocusTrap({
    enabled: !comboboxOpen
  })

  return (
    <ComboboxOpenContext.Provider value={setComboboxOpen}>
      {children}
    </ComboboxOpenContext.Provider>
  )
}

// Combobox Shell
function ComboboxRoot() {
  const setComboboxOpen = useContext(ComboboxOpenContext)

  useEffect(() => {
    setComboboxOpen?.(isOpen)
  }, [isOpen])

  // ...
}
```

### 이유

- Machine은 외부 상태에 **열려 있음** (controlled)
- 하지만 다른 machine을 **제어하지 않음**
- 컴포넌트 간 통신은 React의 영역 (Context, props, 상태 끌어올리기)

---

## 분리로 해결: Parallel States

### 문제

> "독립적인 상태 축 표현" (예: focus 상태 × open 상태)

### 판단: 상태머신 분리

복잡한 복합 상태가 필요하면 machine을 분리.

```ts
// 방법 A: 하나의 machine에서 복합 상태 (복잡해짐)
type State = 'idle' | 'focused' | 'open' | 'focused-open'  // 조합 폭발

// 방법 B: machine 분리 (권장)
const focusMachine = createEventMachine({ ... })
const openMachine = createEventMachine({ ... })

// Shell에서 조합
function ComboboxRoot() {
  const focus = useEventMachine(focusMachine, focusCtx)
  const open = useEventMachine(openMachine, openCtx)

  // 두 상태 조합해서 사용
}
```

### 이유

- 각 machine은 단일 관심사
- 조합은 Shell에서 자연스럽게
- 복잡도 관리 용이

### Nice-to-have

복합 상태 지원은 나중에 추가 가능하지만 필수 아님:

```ts
// 미래에 고려할 수 있는 형태
const machine = createEventMachine({
  parallel: {
    focus: {
      states: { idle: {}, focused: {} }
    },
    open: {
      states: { closed: {}, open: {} }
    }
  }
})
```

---

## 정리: Machine의 경계

```
┌─────────────────────────────────────────────┐
│                   Shell                      │
│  ┌─────────────┐      ┌─────────────┐       │
│  │  Machine A  │      │  Machine B  │       │
│  │  (단일 관심사) │      │  (단일 관심사) │       │
│  └─────────────┘      └─────────────┘       │
│         ↑                    ↑              │
│         └────── 조율 ────────┘              │
│              (Shell 책임)                    │
└─────────────────────────────────────────────┘
```

| 영역 | 책임 |
|------|------|
| Machine | 단일 컴포넌트의 state × event → action |
| Shell | Machine 조합, 컴포넌트 간 통신, DOM 연결 |

---

## 결론

- Machine은 **하나의 관심사**에 집중
- 복잡한 조율은 **Shell**에서
- 이 경계를 유지하면 machine은 단순하고 테스트 가능하게 유지됨
