# handlersRef 패턴

## 개요

handlersRef 패턴은 **이벤트 핸들러를 안정적인 참조로 유지하면서, 내부에서 최신 상태를 참조**할 수 있게 하는 패턴입니다.

---

## 문제: 이벤트 리스너와 React 상태

### 리스너 등록/해제 문제

```typescript
// ❌ 문제 있는 코드
function Menu() {
  const [state, setState] = useState(initialState)

  const handleOutsideClick = useCallback((e: PointerEvent) => {
    // state를 사용
    if (state.openedPath.length > 0) {
      setState(closeAll(state))
    }
  }, [state]) // state가 바뀔 때마다 새 함수 생성

  useEffect(() => {
    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [handleOutsideClick]) // 매번 리스너 재등록!
}
```

### 왜 문제인가?

1. **빈번한 리스너 재등록**: state 변경마다 add/remove 반복
2. **성능 저하**: 불필요한 DOM 조작
3. **타이밍 이슈**: cleanup과 setup 사이에 이벤트 발생 가능

---

## 해결: useLatestRef + handlersRef

### 1단계: 최신 값을 ref로 유지

```typescript
const stateRef = useLatestRef(state)
const setStateRef = useLatestRef(setState)
```

`useLatestRef`는 항상 최신 값을 가리키는 ref를 반환:

```typescript
// hooks/useLatestRef/index.ts
export function useLatestRef<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value)
  ref.current = value // 매 렌더마다 업데이트
  return ref
}
```

### 2단계: 안정적인 핸들러 객체 생성

```typescript
const handlersRef = useRef({
  outsideClick: (event: PointerEvent) => {
    // ref를 통해 최신 상태 참조
    const currentState = stateRef.current

    // 외부 클릭 판단
    const target = event.target as Node
    const elements = store.getAllElements()
    for (const element of elements.values()) {
      if (element.contains(target)) return
    }

    // ref를 통해 최신 setState 호출
    setStateRef.current(closeAll(currentState))
  },

  keyDown: (event: KeyboardEvent) => {
    const currentState = stateRef.current
    // 키보드 핸들링...
    setStateRef.current(newState)
  },
})
```

### 3단계: 안정적인 참조로 리스너 등록

```typescript
useLayoutEffect(() => {
  const handlers = handlersRef.current

  // 리스너 등록
  document.addEventListener('pointerdown', handlers.outsideClick, true)
  document.addEventListener('keydown', handlers.keyDown)

  // cleanup
  return () => {
    document.removeEventListener('pointerdown', handlers.outsideClick, true)
    document.removeEventListener('keydown', handlers.keyDown)
  }
}, []) // 빈 의존성! 한 번만 등록
```

---

## 전체 구조

```typescript
function RootInner({ ... }: RootProps) {
  const [state, setState] = useState(initialState)

  // 1. 최신 값 refs
  const stateRef = useLatestRef(state)
  const setStateRef = useLatestRef(setState)
  const getMenuItemsRef = useLatestRef(getMenuItems)

  // 2. 안정적인 핸들러 객체 (한 번만 생성)
  const handlersRef = useRef({
    outsideClick: (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return

      const elements = store.getAllElements()
      for (const element of elements.values()) {
        if (element.contains(target)) return
      }

      setStateRef.current(closeAll(stateRef.current))
    },

    keyDown: (event: KeyboardEvent) => {
      const currentState = stateRef.current
      const activeMenuId = getActiveMenuId(currentState)
      if (!activeMenuId) return

      const items = getMenuItemsRef.current(activeMenuId)

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setStateRef.current(moveFocusDown(currentState, items))
          break
        case 'ArrowUp':
          event.preventDefault()
          setStateRef.current(moveFocusUp(currentState, items))
          break
        case 'Escape':
          event.preventDefault()
          setStateRef.current(closeAll(currentState))
          break
      }
    },
  })

  // 3. Effect에서 안정적인 참조 사용
  const runEffect = useCallback((effect: MenuEffect) => {
    const handlers = handlersRef.current

    switch (effect.type) {
      case 'ADD_OUTSIDE_CLICK_LISTENER':
        document.addEventListener('pointerdown', handlers.outsideClick, true)
        break
      case 'REMOVE_OUTSIDE_CLICK_LISTENER':
        document.removeEventListener('pointerdown', handlers.outsideClick, true)
        break
      case 'ADD_KEYBOARD_LISTENER':
        document.addEventListener('keydown', handlers.keyDown)
        break
      case 'REMOVE_KEYBOARD_LISTENER':
        document.removeEventListener('keydown', handlers.keyDown)
        break
    }
  }, [])

  // 4. Cleanup에서도 동일한 참조 사용
  useEffect(() => {
    const handlers = handlersRef.current
    return () => {
      document.removeEventListener('pointerdown', handlers.outsideClick, true)
      document.removeEventListener('keydown', handlers.keyDown)
    }
  }, [])
}
```

---

## 데이터 흐름

```
렌더 1: state = { openedPath: [] }
       ↓
       stateRef.current = { openedPath: [] }
       handlersRef.current.outsideClick → stateRef.current 참조

렌더 2: state = { openedPath: ['menu-1'] }
       ↓
       stateRef.current = { openedPath: ['menu-1'] }  ← 업데이트!
       handlersRef.current.outsideClick → 여전히 stateRef.current 참조
                                          (함수는 동일, 값은 최신)

이벤트 발생 시:
       handlersRef.current.outsideClick(event)
       → stateRef.current 읽기 → 최신 state 사용!
```

---

## useLatestRef vs useCallback

### useCallback의 한계

```typescript
// useCallback은 의존성이 바뀌면 새 함수 생성
const handler = useCallback(() => {
  console.log(state)
}, [state]) // state마다 새 함수
```

### useLatestRef의 장점

```typescript
const stateRef = useLatestRef(state)

// 함수 참조는 항상 동일
const handler = useRef(() => {
  console.log(stateRef.current) // 항상 최신 state
}).current
```

---

## 주의사항

### 1. ref는 렌더 중에 읽지 않기

```typescript
// ❌ 렌더 중에 ref 읽기
function Component() {
  const countRef = useLatestRef(count)

  // 렌더 중에는 state 직접 사용
  return <div>{count}</div> // ✅
  return <div>{countRef.current}</div> // ❌ (동작은 하지만 권장 안함)
}
```

### 2. 핸들러 내부에서만 ref 사용

```typescript
const handlersRef = useRef({
  click: () => {
    // ✅ 이벤트 핸들러 내부에서 ref 사용
    const currentState = stateRef.current
    setStateRef.current(newState)
  },
})
```

### 3. store는 의존성에 포함 가능

```typescript
const handlersRef = useRef({
  click: () => {
    // store는 Context에서 오므로 안정적
    const elements = store.getAllElements()
  },
})

const runEffect = useCallback((effect) => {
  // store를 의존성에 포함해도 됨 (Context 값은 안정적)
}, [store])
```

---

## 패턴 비교

### 방법 1: 개별 핸들러 ref

```typescript
// 각 핸들러를 개별 ref로 관리
const outsideClickRef = useRef((e: PointerEvent) => { ... })
const keyDownRef = useRef((e: KeyboardEvent) => { ... })

// Effect에서 사용
document.addEventListener('pointerdown', outsideClickRef.current)
document.addEventListener('keydown', keyDownRef.current)
```

### 방법 2: handlersRef 객체 (권장)

```typescript
// 하나의 객체로 모든 핸들러 관리
const handlersRef = useRef({
  outsideClick: (e: PointerEvent) => { ... },
  keyDown: (e: KeyboardEvent) => { ... },
})

// Effect에서 사용
const handlers = handlersRef.current
document.addEventListener('pointerdown', handlers.outsideClick)
document.addEventListener('keydown', handlers.keyDown)
```

**왜 객체가 좋은가?**
- 관련 핸들러를 그룹화
- 코드 가독성 향상
- 일관된 접근 방식

---

## 핵심 원칙

1. **상태는 ref로 참조**: `useLatestRef`로 항상 최신 값 유지
2. **핸들러는 한 번만 생성**: `useRef`로 안정적인 참조 유지
3. **이벤트 시점에 ref 읽기**: 렌더가 아닌 이벤트 핸들러에서 참조
4. **리스너는 안정적 참조 사용**: 등록/해제 시 동일한 함수 참조
5. **Cleanup도 동일 참조**: handlersRef.current로 정확히 해제
