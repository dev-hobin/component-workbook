# Modal 포스트모템

## 요약

Modal 컴포넌트 구현 중 발생한 두 가지 주요 이슈와 해결 과정을 기록합니다.

---

## 이슈 1: Focus Trap 타이밍 문제

### 증상
- Focus trap이 활성화되지 않음
- 콘솔에 에러 없음, 단순히 동작하지 않음

### 원인
Machine의 `effects`에서 focus trap을 직접 활성화했으나, effect가 실행되는 시점에 DOM이 아직 렌더링되지 않음.

```ts
// 문제가 된 코드
effects: [
  {
    watch: (context) => context.open,
    enter: (context) => {
      // DOM이 아직 없음!
      const trap = createFocusTrap(contentElement)
      trap.activate()
    },
  },
],
```

### 시도한 해결책

**시도 1: Machine에 requestAnimationFrame 추가**
```ts
enter: (context) => {
  requestAnimationFrame(() => {
    // DOM 렌더링 대기
    const trap = createFocusTrap(contentElement)
    trap.activate()
  })
}
```

**문제점**: Machine에 타이밍 로직이 들어감 → "선언적 명세서" 원칙 위반

### 최종 해결책: DOM Helpers 패턴

**원칙**: Machine은 "무엇을" 선언, Shell이 "언제/어떻게" 처리

```ts
// machine.ts - 선언만
type ModalDom = {
  activateFocusTrap: () => void
  deactivateFocusTrap: () => void
}

effects: [
  {
    watch: (context) => context.open,
    enter: (context) => {
      context.dom.activateFocusTrap()  // 무엇을 할지만 선언
      return () => context.dom.deactivateFocusTrap()
    },
  },
],
```

```ts
// index.tsx (Shell) - 타이밍 처리
const activateFocusTrap = useCallback(() => {
  requestAnimationFrame(() => {  // Shell이 타이밍 책임
    const trap = createFocusTrap(contentRef.current, { ... })
    trap.activate()
  })
}, [])

useMachine(modalMachine, {
  ...props,
  dom: { activateFocusTrap, deactivateFocusTrap, ... },
})
```

### 교훈

> Machine에 `requestAnimationFrame`, `setTimeout`, DOM 조작 등 타이밍 관련 코드가 있다면 설계 오류

---

## 이슈 2: 중첩 Modal에서 Escape가 모두 닫힘

### 증상
- Outer Modal 열기 → Inner Modal 열기 → Escape 누름
- 예상: Inner Modal만 닫힘
- 실제: Outer Modal, Inner Modal 모두 닫힘

### 원인
각 Modal이 독립적으로 `keydown` 이벤트를 리스닝하여 Escape 처리.
중첩 시 두 리스너 모두 실행됨.

### 시도한 해결책 (거부됨)

**시도: event.stopPropagation()**
```ts
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.stopPropagation()  // ❌
    send('CLOSE')
  }
}
```

**거부 이유**:
> "라이브러리 수준 코드에서 stopPropagation은 절대로 해결책이 아니다"

- 사용자가 상위에서 Escape 이벤트를 감지할 수 없게 됨
- 예측 불가능한 동작 발생
- 라이브러리는 이벤트 흐름을 방해하면 안 됨

### 최종 해결책: DismissableLayer 프리미티브

전역 레이어 스택으로 활성화된 레이어 순서를 추적하고, `isTopmost`인 레이어만 Escape 처리.

```ts
// primitives/dismissable-layer.tsx
function createLayerStack() {
  const stack: LayerId[] = []

  return {
    push(id) { stack.push(id) },
    pop(id) { /* remove from stack */ },
    isTopmost(id) { return stack[stack.length - 1] === id },
  }
}

const globalLayerStack = createLayerStack()

function DismissableLayer({ isActive, onEscapeKeyDown, ... }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // isTopmost일 때만 처리
      if (event.key === 'Escape' && globalLayerStack.isTopmost(layerId)) {
        onEscapeKeyDown()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}
```

```tsx
// Modal Content에서 사용
<DismissableLayer
  isActive={open}
  dismissOnEscape={closeOnEscape}
  onEscapeKeyDown={() => send('ESCAPE_KEY')}
>
  <div role="dialog">...</div>
</DismissableLayer>
```

### 교훈

> stopPropagation 대신 상태 기반 조건 처리로 해결해야 함
> 중첩 가능한 레이어 컴포넌트는 DismissableLayer 프리미티브 필수

---

## 템플릿 업데이트 사항

### 추가된 섹션
1. **프리미티브: DismissableLayer** - 사용 패턴, 적용 대상 컴포넌트 표
2. **프리모템 위험** - 중첩 레이어 Escape 처리, stopPropagation 사용

### 추가된 체크리스트
- 계획 시: DismissableLayer 필요 여부 확인
- 구현 완료 시: 중첩 케이스 테스트, stopPropagation 미사용 확인

---

## 핵심 원칙 정리

| 원칙 | 설명 |
|------|------|
| Machine = 선언적 명세서 | Machine만 읽으면 컴포넌트 동작이 이해되어야 함 |
| DOM helpers 패턴 | Machine은 "무엇을", Shell은 "언제/어떻게" |
| stopPropagation 금지 | 라이브러리 코드에서 이벤트 흐름 방해 금지 |
| 전역 레이어 스택 | 중첩 레이어는 상태 기반으로 topmost 판별 |

---

## 다음 컴포넌트에 적용할 점

1. **Dropdown, Popover 구현 시** DismissableLayer 적용 필수
2. **부수효과 필요한 컴포넌트**는 DOM helpers 패턴 사용
3. **중첩 가능성** 있는 컴포넌트는 반드시 중첩 케이스 테스트
