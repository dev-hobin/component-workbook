# Status 패턴

## 개요

Status 패턴은 **복잡한 상태 객체(State)에서 단순한 상태 전환값(Status)을 파생**하여, 부수효과를 안전하게 실행하는 패턴입니다.

## 문제: State를 직접 의존성으로 사용할 때

```typescript
// ❌ 문제 있는 코드
useLayoutEffect(() => {
  if (state.open) {
    focusTrap.activate()
    document.body.style.overflow = 'hidden'
  } else {
    focusTrap.deactivate()
    document.body.style.overflow = ''
  }
}, [state]) // state가 객체이므로 매 렌더마다 실행됨!
```

### 왜 문제인가?

1. **객체는 참조가 매번 바뀜**: `useMemo`로 감싸도 내부 값 변경 시 새 객체 생성
2. **불필요한 effect 실행**: `state.focusedId`만 바뀌어도 effect 실행
3. **초기 상태 처리 어려움**: `defaultOpen={true}`일 때 어떻게 구분?

---

## 해결: Status 파생

```typescript
// State: 복잡한 객체
type ModalState = {
  open: boolean
  closeOnEscape: boolean
  closeOnOutsideClick: boolean
}

// Status: 단순한 primitive
type ModalStatus = 'idle' | 'closed' | 'open'

// 파생 함수
function deriveStatus(state: ModalState): ModalStatus {
  return state.open ? 'open' : 'closed'
}
```

### Status의 특징

| 구분 | State | Status |
|------|-------|--------|
| 타입 | 객체 (product type) | 문자열 (sum type) |
| 비교 | 참조 비교 (항상 다름) | 값 비교 (실제 변경만 감지) |
| 용도 | 전체 상태 관리 | 상태 전환 감지 |
| 예시 | `{ open: true, closeOnEscape: true }` | `'open'` |

---

## 구현 상세

### 1. Core에서 타입과 파생 함수 정의

```typescript
// core.ts

// Status 타입 - idle은 초기 마운트 전 상태
export type ModalStatus = 'idle' | 'closed' | 'open'

// 파생 함수 - 순수 함수
export function deriveStatus(state: ModalState): ModalStatus {
  return state.open ? 'open' : 'closed'
}
```

### 2. Shell에서 Status와 prevStatusRef 관리

```typescript
// index.tsx

function RootInner({ open, defaultOpen, ... }: RootProps) {
  // State 구성
  const state: ModalState = useMemo(
    () => ({ open: openValue, closeOnEscape, closeOnOutsideClick }),
    [openValue, closeOnEscape, closeOnOutsideClick],
  )

  // Status 파생
  const status: ModalStatus = deriveStatus(state)

  // 이전 Status 저장 (초기값 'idle')
  const prevStatusRef = useRef<ModalStatus>('idle')

  // ...
}
```

### 3. Status 전환에 따른 Effect 실행

```typescript
useLayoutEffect(() => {
  const effects = getEffectsOnStatusChange(prevStatusRef.current, status, context)
  effects.forEach(runEffect)
  prevStatusRef.current = status
}, [status, runEffect, context])
```

---

## idle 상태의 역할

`idle`은 **컴포넌트가 마운트되기 전의 상태**를 나타냅니다.

### 상태 전환 다이어그램

```
                 ┌─────────────┐
                 │    idle     │  (마운트 전)
                 └──────┬──────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
   ┌─────────────┐             ┌─────────────┐
   │   closed    │◄───────────►│    open     │
   └─────────────┘             └─────────────┘
```

### 초기 상태별 Effect

```typescript
function getEffectsOnStatusChange(
  prevStatus: ModalStatus,
  nextStatus: ModalStatus,
  context: ModalContext,
): ModalEffect[] {
  // idle → open (defaultOpen={true}로 마운트)
  if (prevStatus === 'idle' && nextStatus === 'open') {
    return [
      { type: 'LOCK_BODY_SCROLL' },
      { type: 'ACTIVATE_FOCUS_TRAP', context },
    ]
  }

  // idle → closed (defaultOpen={false}로 마운트)
  if (prevStatus === 'idle' && nextStatus === 'closed') {
    return [] // 아무 effect도 실행하지 않음
  }

  // closed → open (사용자가 열기)
  if (prevStatus === 'closed' && nextStatus === 'open') {
    return [
      { type: 'LOCK_BODY_SCROLL' },
      { type: 'ACTIVATE_FOCUS_TRAP', context },
    ]
  }

  // open → closed (사용자가 닫기)
  if (prevStatus === 'open' && nextStatus === 'closed') {
    return [
      { type: 'DEACTIVATE_FOCUS_TRAP' },
      { type: 'UNLOCK_BODY_SCROLL' },
    ]
  }

  return []
}
```

---

## React Strict Mode 대응

Strict Mode에서는 effect가 두 번 실행됩니다:
1. 마운트 → cleanup → 재마운트

### 문제 상황

```
1차 마운트: idle → open (리스너 등록)
cleanup: prevStatusRef.current = ??? (무엇으로 리셋?)
2차 마운트: ??? → open (리스너 중복 등록?)
```

### 해결: cleanup에서 idle로 리셋

```typescript
// 언마운트 시 리소스 정리
useEffect(() => {
  return () => {
    // 리소스 정리
    focusTrap.deactivate()
    document.body.style.overflow = ''

    // prevStatusRef를 idle로 리셋
    // → 재마운트 시 idle → open 전환으로 올바르게 처리
    prevStatusRef.current = 'idle'
  }
}, [])
```

### 흐름

```
1차 마운트: idle → open (리스너 등록) ✓
cleanup: 리소스 정리, prevStatusRef = 'idle'
2차 마운트: idle → open (리스너 등록) ✓  ← 정상 동작!
```

---

## Status 패턴이 필요한 경우

| 조건 | 설명 | 예시 |
|------|------|------|
| 외부 리소스 관리 | document 이벤트, focus-trap, scroll-lock | Modal, Menu |
| 초기값에 따른 부수효과 | `defaultOpen`으로 열린 상태 마운트 | Modal, Dropdown |
| 외부 제어 가능 | controlled 모드에서 외부가 상태 변경 | Modal |

### 불필요한 경우

| 컴포넌트 | 이유 |
|---------|------|
| Accordion | 상태 변경이 렌더링에만 영향 |
| Tabs | 외부 리소스 없음 |
| Pagination | 순수하게 UI만 업데이트 |

---

## 전체 예시: Modal

### core.ts

```typescript
export type ModalState = {
  open: boolean
  closeOnEscape: boolean
  closeOnOutsideClick: boolean
}

export type ModalStatus = 'idle' | 'closed' | 'open'

export type ModalContext = {
  closeOnEscape: boolean
  closeOnOutsideClick: boolean
}

export type ModalEffect =
  | { type: 'ACTIVATE_FOCUS_TRAP'; context: ModalContext }
  | { type: 'DEACTIVATE_FOCUS_TRAP' }
  | { type: 'LOCK_BODY_SCROLL' }
  | { type: 'UNLOCK_BODY_SCROLL' }

export function deriveStatus(state: ModalState): ModalStatus {
  return state.open ? 'open' : 'closed'
}

export function getEffectsOnStatusChange(
  prevStatus: ModalStatus,
  nextStatus: ModalStatus,
  context: ModalContext,
): ModalEffect[] {
  if (prevStatus === 'idle' && nextStatus === 'open') {
    return [
      { type: 'LOCK_BODY_SCROLL' },
      { type: 'ACTIVATE_FOCUS_TRAP', context },
    ]
  }

  if (prevStatus === 'idle' && nextStatus === 'closed') {
    return []
  }

  if (prevStatus === 'closed' && nextStatus === 'open') {
    return [
      { type: 'LOCK_BODY_SCROLL' },
      { type: 'ACTIVATE_FOCUS_TRAP', context },
    ]
  }

  if (prevStatus === 'open' && nextStatus === 'closed') {
    return [
      { type: 'DEACTIVATE_FOCUS_TRAP' },
      { type: 'UNLOCK_BODY_SCROLL' },
    ]
  }

  return []
}
```

### index.tsx (Shell)

```typescript
function RootInner({ open, defaultOpen, closeOnEscape, closeOnOutsideClick, onOpenChange }: RootProps) {
  const [openValue, setOpenValue] = useControllableState({
    prop: open,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  })

  const state: ModalState = useMemo(
    () => ({ open: openValue, closeOnEscape, closeOnOutsideClick }),
    [openValue, closeOnEscape, closeOnOutsideClick],
  )

  // Status 파생
  const status = deriveStatus(state)
  const prevStatusRef = useRef<ModalStatus>('idle')

  // Context (Effect에 전달할 추가 정보)
  const context: ModalContext = useMemo(
    () => ({ closeOnEscape, closeOnOutsideClick }),
    [closeOnEscape, closeOnOutsideClick],
  )
  const contextRef = useLatestRef(context)

  // Effect 실행 함수
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
        // focus-trap 활성화
        break
      case 'DEACTIVATE_FOCUS_TRAP':
        // focus-trap 비활성화
        break
    }
  }, [])

  // Status 전환 시 효과 실행
  useLayoutEffect(() => {
    const effects = getEffectsOnStatusChange(
      prevStatusRef.current,
      status,
      contextRef.current,
    )
    effects.forEach(runEffect)
    prevStatusRef.current = status
  }, [status, runEffect, contextRef])

  // 언마운트 시 리소스 정리
  useEffect(() => {
    return () => {
      // 리소스 직접 정리
      document.body.style.overflow = prevOverflowRef.current
      if (trapRef.current) {
        trapRef.current.deactivate()
      }
      // idle로 리셋 (Strict Mode 대응)
      prevStatusRef.current = 'idle'
    }
  }, [])

  // ...
}
```

---

## 핵심 원칙

1. **Status는 primitive**: 문자열로 값 비교 가능
2. **idle은 마운트 전**: 초기 상태 구분에 사용
3. **Effect는 Core에서 결정**: Shell은 해석만 담당
4. **Cleanup은 Effect와 분리**: 예상치 못한 언마운트 대비
5. **prevStatusRef를 idle로 리셋**: Strict Mode 대응
