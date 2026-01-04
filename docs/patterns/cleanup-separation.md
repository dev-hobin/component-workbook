# Cleanup 분리 패턴

## 개요

Cleanup 분리 패턴은 **정상적인 상태 전환 Effect**와 **예상치 못한 언마운트 Cleanup**을 명확히 분리하는 패턴입니다.

---

## 두 가지 종료 시나리오

### 시나리오 1: 정상 전환

```
사용자가 모달 닫기 버튼 클릭
    ↓
state.open = false
    ↓
status: 'open' → 'closed'
    ↓
getEffectsOnStatusChange 호출
    ↓
[DEACTIVATE_FOCUS_TRAP, UNLOCK_BODY_SCROLL] 반환
    ↓
runEffect로 정리 수행
```

### 시나리오 2: 비정상 종료

```
사용자가 페이지 이동 (또는 부모 컴포넌트 언마운트)
    ↓
컴포넌트 언마운트
    ↓
useEffect cleanup 실행
    ↓
리소스 직접 정리
```

---

## 왜 분리가 필요한가?

### 문제: Cleanup에서 Effect 실행

```typescript
// ❌ 잘못된 접근
useLayoutEffect(() => {
  const effects = getEffectsOnStatusChange(prevStatusRef.current, status)
  effects.forEach(runEffect)
  prevStatusRef.current = status

  return () => {
    // cleanup에서 역방향 effect 실행?
    const cleanupEffects = getEffectsOnStatusChange(status, 'closed')
    cleanupEffects.forEach(runEffect)
  }
}, [status, runEffect])
```

**문제점:**

1. **status 변경 시마다 cleanup 실행**: `open → open`일 때도 cleanup 발생
2. **Effect 중복**: 정상 전환과 cleanup이 모두 실행될 수 있음
3. **상태 불일치**: cleanup 시점의 status가 정확하지 않을 수 있음

---

## 올바른 분리

### 구조

```typescript
function RootInner({ ... }) {
  // === 상태 전환 Effect ===
  // Status 변경에 따른 정상적인 부수효과
  useLayoutEffect(() => {
    const effects = getEffectsOnStatusChange(prevStatusRef.current, status)
    effects.forEach(runEffect)
    prevStatusRef.current = status
  }, [status, runEffect])

  // === 언마운트 Cleanup ===
  // 예상치 못한 종료 시 리소스 직접 정리
  useEffect(() => {
    return () => {
      // Effect 시스템을 거치지 않고 직접 정리
      document.removeEventListener('pointerdown', handlers.outsideClick, true)
      document.removeEventListener('keydown', handlers.keyDown)

      // Strict Mode 대응
      prevStatusRef.current = 'idle'
    }
  }, []) // 빈 의존성 - 언마운트 시에만 실행
}
```

### 핵심 차이

| 구분 | 상태 전환 Effect | 언마운트 Cleanup |
|------|-----------------|-----------------|
| 시점 | status 변경 시 | 컴포넌트 언마운트 시 |
| 훅 | `useLayoutEffect` | `useEffect` |
| 의존성 | `[status, runEffect]` | `[]` |
| 방식 | Core에서 Effect 결정 | Shell에서 직접 정리 |
| 목적 | 상태 전환 반영 | 리소스 누수 방지 |

---

## 실제 구현

### Modal 예시

```typescript
function RootInner({ open, defaultOpen, closeOnEscape, closeOnOutsideClick }: RootProps) {
  const trapRef = useRef<FocusTrap | null>(null)
  const prevOverflowRef = useRef('')
  const prevStatusRef = useRef<ModalStatus>('idle')

  const status = deriveStatus(state)

  const runEffect = useCallback((effect: ModalEffect) => {
    switch (effect.type) {
      case 'LOCK_BODY_SCROLL':
        prevOverflowRef.current = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        break
      case 'UNLOCK_BODY_SCROLL':
        document.body.style.overflow = prevOverflowRef.current
        break
      case 'ACTIVATE_FOCUS_TRAP':
        if (contentRef.current && !trapRef.current) {
          trapRef.current = createFocusTrap(contentRef.current, { ... })
          trapRef.current.activate()
        }
        break
      case 'DEACTIVATE_FOCUS_TRAP':
        if (trapRef.current) {
          trapRef.current.deactivate({ onDeactivate: () => {} })
          trapRef.current = null
        }
        break
    }
  }, [])

  // 상태 전환 시 Effect 실행
  useLayoutEffect(() => {
    const effects = getEffectsOnStatusChange(
      prevStatusRef.current,
      status,
      contextRef.current,
    )
    effects.forEach(runEffect)
    prevStatusRef.current = status
  }, [status, runEffect])

  // 언마운트 시 직접 정리
  useEffect(() => {
    return () => {
      // focus-trap 정리
      if (trapRef.current) {
        trapRef.current.deactivate({ onDeactivate: () => {} })
        trapRef.current = null
      }

      // body scroll 복원
      document.body.style.overflow = prevOverflowRef.current

      // Strict Mode 대응
      prevStatusRef.current = 'idle'
    }
  }, [])
}
```

### Menu 예시

```typescript
function RootInner({ ... }: RootProps) {
  const prevStatusRef = useRef<MenuStatus>('idle')
  const prevFocusedItemIdRef = useRef<ItemId | null>(null)

  const handlersRef = useRef({
    outsideClick: (event: PointerEvent) => { ... },
    keyDown: (event: KeyboardEvent) => { ... },
  })

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
      case 'FOCUS_ITEM':
        const element = store.getElement(effect.itemId, 'item')
        element?.focus()
        break
    }
  }, [store])

  // Status 전환 Effect
  useLayoutEffect(() => {
    const effects = getEffectsOnStatusChange(prevStatusRef.current, status)
    effects.forEach(runEffect)
    prevStatusRef.current = status
  }, [status, runEffect])

  // Focus 변경 Effect
  useLayoutEffect(() => {
    const effects = getEffectsOnFocusChange(
      prevFocusedItemIdRef.current,
      state.focusedItemId,
    )
    effects.forEach(runEffect)
    prevFocusedItemIdRef.current = state.focusedItemId
  }, [state.focusedItemId, runEffect])

  // 언마운트 Cleanup
  useEffect(() => {
    const handlers = handlersRef.current
    return () => {
      // 리스너 직접 제거
      document.removeEventListener('pointerdown', handlers.outsideClick, true)
      document.removeEventListener('keydown', handlers.keyDown)

      // ref 초기화
      prevStatusRef.current = 'idle'
      prevFocusedItemIdRef.current = null
    }
  }, [])
}
```

---

## React Strict Mode 고려

Strict Mode에서는 effect가 두 번 실행됩니다:

```
1차 마운트 → cleanup → 2차 마운트
```

### prevStatusRef 리셋의 중요성

```typescript
useEffect(() => {
  return () => {
    // Strict Mode에서 cleanup 후 재마운트 시
    // idle → open 전환이 다시 일어나도록 함
    prevStatusRef.current = 'idle'
  }
}, [])
```

**흐름:**

```
1차 마운트:
  prevStatusRef = 'idle'
  status = 'open' (defaultOpen={true})
  idle → open: ADD_LISTENERS 실행 ✓

Strict Mode cleanup:
  REMOVE_LISTENERS (직접 정리)
  prevStatusRef = 'idle' ← 리셋!

2차 마운트:
  prevStatusRef = 'idle'
  status = 'open'
  idle → open: ADD_LISTENERS 실행 ✓ ← 정상!
```

**만약 리셋하지 않으면:**

```
1차 마운트:
  idle → open: ADD_LISTENERS ✓
  prevStatusRef = 'open'

Strict Mode cleanup:
  REMOVE_LISTENERS
  prevStatusRef = 'open' ← 그대로!

2차 마운트:
  prevStatusRef = 'open'
  status = 'open'
  open → open: 아무것도 안함! ❌ ← 리스너 없음!
```

---

## Cleanup이 필요한 리소스

| 리소스 유형 | 정리 방법 |
|------------|----------|
| 이벤트 리스너 | `removeEventListener` |
| Focus trap | `deactivate()` |
| Scroll lock | `overflow` 복원 |
| Timer | `clearTimeout`, `clearInterval` |
| Subscription | `unsubscribe()` |
| Portal | DOM 노드 제거 |

---

## 핵심 원칙

1. **Effect는 상태 전환용**: Core에서 결정, Shell에서 실행
2. **Cleanup은 안전망**: 비정상 종료 시 리소스 누수 방지
3. **빈 의존성 배열**: Cleanup은 언마운트 시에만 실행
4. **prevRef 리셋**: Strict Mode에서 재마운트 대응
5. **직접 정리**: Cleanup에서는 Effect 시스템을 거치지 않음
