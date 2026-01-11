# Modal 구현 계획

## 1. 요구사항

### 기능 요구사항
- [ ] 트리거 클릭으로 모달 열기
- [ ] 닫기 버튼/Escape로 모달 닫기
- [ ] 백드롭 클릭으로 모달 닫기 (옵션)
- [ ] 모달 열릴 때 포커스 이동
- [ ] 모달 닫힐 때 트리거로 포커스 복귀
- [ ] 포커스 트랩 (Tab/Shift+Tab 순환)
- [ ] 열기/닫기 애니메이션

### 접근성 요구사항 (W3C APG)

**키보드**
| 키 | 동작 | 필수 |
|----|------|------|
| `Tab` | 다음 포커스 가능 요소로 이동, 마지막→첫번째 순환 | O |
| `Shift+Tab` | 이전 포커스 가능 요소로 이동, 첫번째→마지막 순환 | O |
| `Escape` | 모달 닫기 | O |

**ARIA**
| 속성 | 적용 대상 | 값 |
|------|----------|-----|
| `role` | Content | "dialog" |
| `aria-modal` | Content | "true" |
| `aria-labelledby` | Content | Title 요소의 id |
| `aria-describedby` | Content | Description 요소의 id (선택) |

**포커스 관리**
- 열릴 때: Content 내부의 첫 번째 포커스 가능 요소로 이동
- 닫힐 때: 트리거 요소로 포커스 복귀
- 포커스 트랩: Tab/Shift+Tab이 Content 내부에서 순환

---

## 2. 컴포넌트 구조

### 사용 예시
```tsx
<Modal.Root>
  <Modal.Trigger>Open Modal</Modal.Trigger>
  <Modal.Portal>
    <Modal.Backdrop />
    <Modal.Content>
      <Modal.Title>Modal Title</Modal.Title>
      <Modal.Description>Modal description text.</Modal.Description>
      <Modal.Close>Close</Modal.Close>
    </Modal.Content>
  </Modal.Portal>
</Modal.Root>
```

### Props

**Root**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| open | boolean | - | | 제어 모드: 열림 상태 |
| defaultOpen | boolean | false | | 비제어 모드: 초기 열림 상태 |
| onOpenChange | (open: boolean) => void | - | | 열림 상태 변경 콜백 |
| closeOnEscape | boolean | true | | Escape로 닫기 |
| closeOnBackdropClick | boolean | true | | 백드롭 클릭으로 닫기 |

**Trigger**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| asChild | boolean | false | | 자식 요소를 트리거로 사용 |

**Portal**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| container | HTMLElement | document.body | | 포탈 마운트 위치 |

**Content**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| initialFocusRef | RefObject | - | | 초기 포커스 대상 |
| returnFocusRef | RefObject | - | | 닫힐 때 포커스 복귀 대상 |

**Close**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| asChild | boolean | false | | 자식 요소를 닫기 버튼으로 사용 |

### Props 위치 결정
> Machine 로직에 필요한 prop은 반드시 Root에 배치

| Prop | 위치 | 이유 |
|------|------|------|
| open/onOpenChange | Root | 핵심 상태 |
| closeOnEscape | Root | Machine에서 Escape 처리 여부 결정 |
| closeOnBackdropClick | Root | Machine에서 백드롭 클릭 처리 여부 결정 |
| initialFocusRef | Content | 해당 요소가 마운트되어야 접근 가능 |

---

## 3. Data 속성 매트릭스

| 컴포넌트 | data-part | data-state | data-transition |
|---------|-----------|------------|-----------------|
| Trigger | "trigger" | open/closed | - |
| Backdrop | "backdrop" | open/closed | ✅ |
| Content | "content" | open/closed | ✅ |
| Title | "title" | - | - |
| Description | "description" | - | - |
| Close | "close" | - | - |

---

## 4. 외부 의존성 API

### 라이브러리 1: controlled-machine
```ts
import { createMachine } from 'controlled-machine'

const machine = createMachine<{
  input: InputType
  events: EventsType
  computed: ComputedType
  actions: ActionsType
}>({
  computed: { ... },
  on: { ... },
  actions: { ... },
})
```

### 라이브러리 2: focus-trap
```ts
import { createFocusTrap, FocusTrap } from 'focus-trap'

const trap = createFocusTrap(container, {
  initialFocus: element | selector | (() => element),
  fallbackFocus: element | selector,
  escapeDeactivates: false, // Machine에서 처리
  clickOutsideDeactivates: false, // Machine에서 처리
  returnFocusOnDeactivate: true,
  allowOutsideClick: true,
})

trap.activate()
trap.deactivate()
```

### 라이브러리 3: usePresence
```ts
const { isPresent, transitionState } = usePresence({
  isVisible: open,
  resolveElement: () => contentRef.current,
})
// transitionState: 'starting' | 'idle' | 'ending' | undefined
```

### 라이브러리 4: React Portal
```tsx
import { createPortal } from 'react-dom'
createPortal(children, container)
```

---

## 5. 상태 관리

### Focus vs Selection 분석
| 컴포넌트 | Focus = Selection? | 처리 방식 |
|----------|-------------------|-----------|
| Modal | N/A | 포커스 트랩만 존재, 선택 개념 없음 |

### Machine 설계

> Machine은 모달의 **선언적 명세서**
> - "모달은 OPEN 이벤트로 열리고, CLOSE 이벤트로 닫힌다"
> - "Escape를 누르면 닫힌다 (closeOnEscape가 true일 때)"
> - "백드롭을 클릭하면 닫힌다 (closeOnBackdropClick이 true일 때)"

**Input**
```ts
type Input = {
  // 핵심 상태
  open: boolean
  onOpenChange: (open: boolean) => void

  // 옵션
  closeOnEscape: boolean
  closeOnBackdropClick: boolean
}
```

**Events**
```ts
type Events = {
  // 상태 변경
  OPEN: undefined
  CLOSE: undefined

  // 사용자 인터랙션 (조건부 닫기)
  ESCAPE_KEY: undefined
  BACKDROP_CLICK: undefined
}
```

**Computed**
```ts
type Computed = {
  isOpen: boolean
}
```

**Actions**
```ts
type Actions = 'open' | 'close'

actions: {
  open: (context) => {
    if (!context.open) {
      context.onOpenChange(true)
    }
  },
  close: (context) => {
    if (context.open) {
      context.onOpenChange(false)
    }
  },
}

on: {
  OPEN: 'open',
  CLOSE: 'close',
  ESCAPE_KEY: {
    when: (context) => context.closeOnEscape,
    do: 'close',
  },
  BACKDROP_CLICK: {
    when: (context) => context.closeOnBackdropClick,
    do: 'close',
  },
}
```

### Machine과 Shell의 역할 분리

| 역할 | Machine | Shell |
|------|---------|-------|
| **동작 명세 (What/How)** | | |
| 열기/닫기 상태 변경 | ✅ | ❌ |
| 조건부 닫기 로직 (escape, backdrop) | ✅ | ❌ |
| **실행 컨텍스트 (When/Where)** | | |
| 키보드 이벤트 리스닝 | ❌ | ✅ |
| 클릭 이벤트 리스닝 | ❌ | ✅ |
| 포커스 트랩 활성화/비활성화 | ❌ | ✅ (useEffect) |
| Portal 렌더링 | ❌ | ✅ |
| 트리거 ref 저장 (포커스 복귀용) | ❌ | ✅ |
| ARIA 속성 적용 | ❌ | ✅ |

### Context 구조
```
RootContext
├── open, send, computed
├── closeOnEscape, closeOnBackdropClick
├── triggerRef (포커스 복귀용)
├── contentId, titleId, descriptionId (ARIA 연결용)
```

### 상태 추적 방식
| 상태 | 저장 위치 | 이유 |
|------|----------|------|
| open | Machine input | 핵심 상태 |
| triggerRef | Context (useRef) | 포커스 복귀 대상 |
| contentId/titleId/descriptionId | Context (useId) | ARIA 연결 |

---

## 6. 콘텐츠 전환 전략

### 전환 방식 결정
| 컴포넌트 | 전환 방식 | 이유 |
|----------|----------|------|
| Modal | 애니메이션 | 모달 진입/퇴장 시각화 필요 |

### 애니메이션 전환
```tsx
// usePresence의 transitionState 활용
<Content
  data-state={open ? 'open' : 'closed'}
  data-transition={transitionState}
/>

<Backdrop
  data-state={open ? 'open' : 'closed'}
  data-transition={transitionState}
/>
```

### 상태 흐름
```
[열기: false → true]
undefined → 'starting' → (rAF) → (waitForAnimations) → 'idle'
  - 'starting' 진입 시 focus trap 활성화

[닫기: true → false]
'idle' → 'ending' → (rAF) → (waitForAnimations) → undefined → unmount
  - 'ending' 완료 후 focus trap 비활성화, 포커스 복귀
```

---

## 7. 파일 구조

```
src/components/modal/
├── machine.ts          # 상태 머신
├── index.tsx           # 컴포넌트 (primitives)
├── styled.tsx          # 스타일 적용 버전
└── __tests__/
    └── modal.test.tsx
```

---

## 8. 테스트 계획

### 테스트 환경 요구사항
- [ ] jsdom `getAnimations` 폴리필
- [ ] `@testing-library/user-event` 설치
- [ ] `afterEach` cleanup 설정
- [ ] Portal 테스트를 위한 container 설정

### 테스트 케이스

**렌더링**
- [ ] Trigger 렌더링
- [ ] 닫힌 상태에서 Content 미렌더링
- [ ] 열린 상태에서 Content 렌더링
- [ ] data-part 속성 확인
- [ ] data-state 속성 확인

**열기/닫기**
- [ ] Trigger 클릭으로 열기
- [ ] Close 버튼 클릭으로 닫기
- [ ] Escape로 닫기
- [ ] Escape로 닫기 비활성화 (closeOnEscape=false)
- [ ] 백드롭 클릭으로 닫기
- [ ] 백드롭 클릭으로 닫기 비활성화 (closeOnBackdropClick=false)

**포커스 관리**
- [ ] 열릴 때 Content 내부로 포커스 이동
- [ ] initialFocusRef로 특정 요소 포커스
- [ ] 닫힐 때 Trigger로 포커스 복귀
- [ ] Tab으로 포커스 순환 (마지막→첫번째)
- [ ] Shift+Tab으로 포커스 역순환 (첫번째→마지막)

**Controlled 모드**
- [ ] open prop으로 제어
- [ ] onOpenChange 콜백

**ARIA**
- [ ] role="dialog"
- [ ] aria-modal="true"
- [ ] aria-labelledby ↔ Title id 연결
- [ ] aria-describedby ↔ Description id 연결

---

## 9. 구현 순서

1. [ ] `machine.ts` - 상태 머신 (OPEN, CLOSE, ESCAPE_KEY, BACKDROP_CLICK)
2. [ ] `index.tsx` - Types, Context 정의
3. [ ] `Root` 구현 (machine 연결, triggerRef)
4. [ ] `Trigger` 구현 (클릭 → OPEN, ref 저장)
5. [ ] `Portal` 구현 (createPortal)
6. [ ] `Backdrop` 구현 (클릭 → BACKDROP_CLICK, usePresence)
7. [ ] `Content` 구현 (focus-trap, Escape → ESCAPE_KEY, usePresence)
8. [ ] `Title` 구현 (aria-labelledby 연결)
9. [ ] `Description` 구현 (aria-describedby 연결)
10. [ ] `Close` 구현 (클릭 → CLOSE)
11. [ ] `styled.tsx` 작성 (애니메이션 포함)
12. [ ] 테스트 작성
13. [ ] 예제 페이지 작성

---

## 10. 프리모템 (Pre-mortem)

> 이 구현이 실패한다면 왜?

### 높은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| 포커스 트랩 타이밍 | 열릴 때 포커스 안 잡힘 | usePresence isPresent와 focus-trap activate 동기화 |
| 포커스 복귀 실패 | 닫을 때 포커스 엉뚱한 곳으로 | triggerRef 저장 확인, deactivate 시 returnFocus 옵션 |

### 중간 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| Portal 렌더링 순서 | aria-labelledby 연결 실패 | useId로 미리 id 생성 |
| 애니메이션 중 언마운트 | 닫기 애니메이션 안 보임 | usePresence isPresent로 마운트 제어 |

### 낮은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| 중첩 모달 | 포커스 트랩 충돌 | 단일 모달만 지원 (v1) |

---

## 11. 성공 기준

- [ ] 모든 테스트 통과
- [ ] W3C APG 키보드 요구사항 충족 (Tab, Shift+Tab, Escape)
- [ ] ARIA 속성 올바르게 적용
- [ ] controlled/uncontrolled 모드 동작
- [ ] 열기/닫기 애니메이션 깜빡임 없음
- [ ] 포커스 트랩 정상 동작
- [ ] 포커스 복귀 정상 동작
