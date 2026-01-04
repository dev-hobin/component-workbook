# Effect as Data 패턴

## 개요

Effect as Data는 **부수효과를 즉시 실행하지 않고, 데이터로 표현한 뒤 Shell에서 해석하여 실행**하는 패턴입니다.

```
┌─────────────────────────────────────────────────────────────┐
│                      Core (순수)                             │
│                                                             │
│   상태 전환 → Effect[] 반환                                   │
│   { type: 'LOCK_SCROLL' }, { type: 'FOCUS_TRAP' }          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Effect 데이터
┌─────────────────────────────────────────────────────────────┐
│                      Shell (React)                          │
│                                                             │
│   Effect 해석 → 실제 부수효과 실행                            │
│   document.body.style.overflow = 'hidden'                   │
│   focusTrap.activate()                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 왜 Effect를 데이터로 표현하는가?

### 1. Core의 순수성 유지

```typescript
// ❌ Core에서 직접 부수효과 실행
function openModal(state: ModalState): ModalState {
  document.body.style.overflow = 'hidden' // 부수효과!
  focusTrap.activate() // 부수효과!
  return { ...state, open: true }
}

// ✅ Core는 "무엇을 해야 하는지"만 반환
function getEffectsOnOpen(): ModalEffect[] {
  return [
    { type: 'LOCK_BODY_SCROLL' },
    { type: 'ACTIVATE_FOCUS_TRAP' },
  ]
}
```

### 2. 테스트 용이성

```typescript
// Effect를 데이터로 반환하면 테스트가 쉬움
test('모달 열릴 때 스크롤 잠금과 포커스 트랩이 필요함', () => {
  const effects = getEffectsOnStatusChange('closed', 'open', context)

  expect(effects).toContainEqual({ type: 'LOCK_BODY_SCROLL' })
  expect(effects).toContainEqual({ type: 'ACTIVATE_FOCUS_TRAP', context })
})
```

### 3. 실행 시점 제어

Shell이 Effect를 받아서 **적절한 시점에 실행**할 수 있습니다:
- `useLayoutEffect`에서 실행 (DOM 업데이트 직후)
- `useEffect`에서 실행 (렌더 후)
- 조건부 실행, 디바운스, 배치 처리 등

---

## Effect 타입 설계

### Discriminated Union 사용

```typescript
export type ModalEffect =
  | { type: 'ACTIVATE_FOCUS_TRAP'; context: ModalContext }
  | { type: 'DEACTIVATE_FOCUS_TRAP' }
  | { type: 'LOCK_BODY_SCROLL' }
  | { type: 'UNLOCK_BODY_SCROLL' }
  | { type: 'CLOSE_MODAL' }

export type MenuEffect =
  | { type: 'ADD_OUTSIDE_CLICK_LISTENER' }
  | { type: 'REMOVE_OUTSIDE_CLICK_LISTENER' }
  | { type: 'ADD_KEYBOARD_LISTENER' }
  | { type: 'REMOVE_KEYBOARD_LISTENER' }
  | { type: 'FOCUS_ITEM'; itemId: ItemId }
```

### Effect 설계 원칙

1. **명확한 의도**: `type`이 무엇을 해야 하는지 설명
2. **필요한 데이터 포함**: payload로 실행에 필요한 정보 전달
3. **대칭적 쌍**: ADD ↔ REMOVE, LOCK ↔ UNLOCK
4. **원자적 동작**: 하나의 Effect = 하나의 동작

---

## Effect 생성 함수

### 상태 전환 기반

```typescript
// Status 전환에 따른 Effect
export function getEffectsOnStatusChange(
  prevStatus: ModalStatus,
  nextStatus: ModalStatus,
  context: ModalContext,
): ModalEffect[] {
  // idle → open
  if (prevStatus === 'idle' && nextStatus === 'open') {
    return [
      { type: 'LOCK_BODY_SCROLL' },
      { type: 'ACTIVATE_FOCUS_TRAP', context },
    ]
  }

  // closed → open
  if (prevStatus === 'closed' && nextStatus === 'open') {
    return [
      { type: 'LOCK_BODY_SCROLL' },
      { type: 'ACTIVATE_FOCUS_TRAP', context },
    ]
  }

  // open → closed
  if (prevStatus === 'open' && nextStatus === 'closed') {
    return [
      { type: 'DEACTIVATE_FOCUS_TRAP' },
      { type: 'UNLOCK_BODY_SCROLL' },
    ]
  }

  return []
}
```

### 값 변경 기반

```typescript
// focusedItemId 변경에 따른 Effect
export function getEffectsOnFocusChange(
  prevFocusedItemId: ItemId | null,
  nextFocusedItemId: ItemId | null,
): MenuEffect[] {
  if (nextFocusedItemId && nextFocusedItemId !== prevFocusedItemId) {
    return [{ type: 'FOCUS_ITEM', itemId: nextFocusedItemId }]
  }
  return []
}
```

### 이벤트 기반

```typescript
// 외부 클릭 이벤트에 따른 Effect
export function handleOutsideClick(state: ModalState): ModalEffect[] {
  if (state.open && state.closeOnOutsideClick) {
    return [{ type: 'CLOSE_MODAL' }]
  }
  return []
}
```

---

## Shell에서 Effect 해석

### runEffect 함수

```typescript
const runEffect = useCallback(
  (effect: ModalEffect) => {
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
          trapRef.current = createFocusTrap(contentRef.current, {
            escapeDeactivates: effect.context.closeOnEscape,
            clickOutsideDeactivates: effect.context.closeOnOutsideClick,
            onDeactivate: () => setOpenValue(false),
          })
          trapRef.current.activate()
        }
        break

      case 'DEACTIVATE_FOCUS_TRAP':
        if (trapRef.current) {
          trapRef.current.deactivate({ onDeactivate: () => {} })
          trapRef.current = null
        }
        break

      case 'CLOSE_MODAL':
        setOpenValue(false)
        break
    }
  },
  [setOpenValue],
)
```

### Effect 실행 시점

```typescript
// Status 전환 시 (동기적으로 DOM 업데이트 직후)
useLayoutEffect(() => {
  const effects = getEffectsOnStatusChange(
    prevStatusRef.current,
    status,
    contextRef.current,
  )
  effects.forEach(runEffect)
  prevStatusRef.current = status
}, [status, runEffect])

// Focus 변경 시
useLayoutEffect(() => {
  const effects = getEffectsOnFocusChange(
    prevFocusedItemIdRef.current,
    state.focusedItemId,
  )
  effects.forEach(runEffect)
  prevFocusedItemIdRef.current = state.focusedItemId
}, [state.focusedItemId, runEffect])
```

---

## 여러 Effect 소스 통합

하나의 컴포넌트에서 여러 종류의 Effect가 필요한 경우:

```typescript
// Menu 컴포넌트
export type MenuEffect =
  | { type: 'ADD_OUTSIDE_CLICK_LISTENER' }    // Status 기반
  | { type: 'REMOVE_OUTSIDE_CLICK_LISTENER' } // Status 기반
  | { type: 'ADD_KEYBOARD_LISTENER' }         // Status 기반
  | { type: 'REMOVE_KEYBOARD_LISTENER' }      // Status 기반
  | { type: 'FOCUS_ITEM'; itemId: ItemId }    // Focus 기반

// 단일 runEffect로 모든 Effect 처리
const runEffect = useCallback((effect: MenuEffect) => {
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

// 각각의 트리거에서 Effect 실행
useLayoutEffect(() => {
  const effects = getEffectsOnStatusChange(prevStatusRef.current, status)
  effects.forEach(runEffect)
  prevStatusRef.current = status
}, [status, runEffect])

useLayoutEffect(() => {
  const effects = getEffectsOnFocusChange(prevFocusedItemIdRef.current, focusedItemId)
  effects.forEach(runEffect)
  prevFocusedItemIdRef.current = focusedItemId
}, [focusedItemId, runEffect])
```

---

## Cleanup과의 관계

Effect as Data는 **정상적인 상태 전환**을 다룹니다.
Cleanup은 **예상치 못한 언마운트**를 다룹니다.

```typescript
// 정상 전환: open → closed
// getEffectsOnStatusChange가 DEACTIVATE_FOCUS_TRAP 반환
// runEffect가 focusTrap.deactivate() 실행

// 비정상 종료: 사용자가 페이지 이동
// useEffect cleanup이 리소스 직접 정리
useEffect(() => {
  return () => {
    // Effect 시스템을 거치지 않고 직접 정리
    if (trapRef.current) {
      trapRef.current.deactivate()
    }
    document.body.style.overflow = prevOverflowRef.current
  }
}, [])
```

### 왜 Cleanup에서 Effect를 실행하지 않는가?

```typescript
// ❌ 잘못된 접근
useEffect(() => {
  return () => {
    // cleanup에서 DEACTIVATE effect 실행?
    runEffect({ type: 'DEACTIVATE_FOCUS_TRAP' })
  }
}, [runEffect])

// 문제점:
// 1. runEffect 의존성이 변경되면 cleanup 실행됨
// 2. 정상 전환과 비정상 종료 구분 불가
// 3. 상태 불일치 가능성
```

---

## Effect 설계 예시

### Modal

```typescript
export type ModalEffect =
  | { type: 'ACTIVATE_FOCUS_TRAP'; context: ModalContext }
  | { type: 'DEACTIVATE_FOCUS_TRAP' }
  | { type: 'LOCK_BODY_SCROLL' }
  | { type: 'UNLOCK_BODY_SCROLL' }
  | { type: 'CLOSE_MODAL' }  // 이벤트 핸들러에서 사용
```

### Menu

```typescript
export type MenuEffect =
  | { type: 'ADD_OUTSIDE_CLICK_LISTENER' }
  | { type: 'REMOVE_OUTSIDE_CLICK_LISTENER' }
  | { type: 'ADD_KEYBOARD_LISTENER' }
  | { type: 'REMOVE_KEYBOARD_LISTENER' }
  | { type: 'FOCUS_ITEM'; itemId: ItemId }
```

### Tooltip (가상 예시)

```typescript
export type TooltipEffect =
  | { type: 'START_SHOW_TIMER'; delay: number }
  | { type: 'CANCEL_SHOW_TIMER' }
  | { type: 'START_HIDE_TIMER'; delay: number }
  | { type: 'CANCEL_HIDE_TIMER' }
  | { type: 'UPDATE_POSITION' }
```

---

## 핵심 원칙

1. **Core는 결정만**: "무엇을 해야 하는가"를 데이터로 반환
2. **Shell은 실행만**: Effect 데이터를 받아 실제 부수효과 실행
3. **Effect는 선언적**: 명령형 코드 대신 의도를 표현
4. **테스트 용이**: Effect 목록을 단순 비교로 테스트
5. **실행 시점 분리**: Shell이 적절한 시점에 실행 결정
