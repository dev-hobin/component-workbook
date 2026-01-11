# [컴포넌트명] 구현 계획

## 1. 요구사항

### 기능 요구사항
- [ ] 요구사항 1
- [ ] 요구사항 2

### 접근성 요구사항 (W3C APG)

**키보드**
| 키 | 동작 | 필수 |
|----|------|------|
| `Enter` | | O |
| `Space` | | O |
| `Tab` | | O |
| `ArrowDown/Up` | | |
| `Home/End` | | |

**ARIA**
| 속성 | 적용 대상 | 값 |
|------|----------|-----|
| `role` | | |
| `aria-expanded` | | |
| `aria-controls` | | |
| `aria-labelledby` | | |
| `aria-disabled` | | |

---

## 2. 컴포넌트 구조

### 사용 예시
```tsx
<Component.Root>
  <Component.Item>
    <Component.Trigger />
    <Component.Content />
  </Component.Item>
</Component.Root>
```

### Props

**Root**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| | | | | |

**Item**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| | | | | |

*(다른 하위 컴포넌트도 동일하게)*

---

## 3. Data 속성 매트릭스

| 컴포넌트 | data-part | data-state | data-disabled | data-orientation | data-transition |
|---------|-----------|------------|---------------|------------------|-----------------|
| Root | "root" | - | ✅ | ✅ | - |
| Item | "item" | open/closed | ✅ | - | - |
| Trigger | "trigger" | open/closed | ✅ | - | - |
| Content | "content" | open/closed | ✅ | - | ✅ |
| Indicator | "indicator" | open/closed | ✅ | - | - |

---

## 4. 외부 의존성 API

### 라이브러리 1: controlled-machine
```ts
// 사용할 정확한 API 형태
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

### 라이브러리 2: NodeStore
```ts
// Role 타입 정의
type ComponentRole = 'root' | 'item' | 'trigger' | 'content' | 'indicator'

// Meta 타입 정의 (필요시)
type ComponentMeta = {
  disabled?: boolean
}

// 사용 패턴
const { ref, domId } = useNode<ComponentRole, ComponentMeta>({
  role: 'trigger',
  id: itemId,
  meta: { disabled },
})
```

### 라이브러리 3: usePresence
```ts
// 초기 상태 동작
const [transitionState] = useState(isVisible ? 'idle' : undefined)
// - 'idle': 마운트 시 애니메이션 없음 (권장)
// - 'starting': 마운트 시 애니메이션 있음

// CSS Transition 지원
// - starting(0fr) → idle(1fr) 전환 시 transition 발생
// - ending(0fr) → undefined 시 transition 후 unmount

// CSS Animation 지원
// - starting 진입 시 @keyframes animation 시작
// - waitForAnimations()로 완료 대기 후 idle 전환
// - rAF 1 frame 대기 필요 (CSS 적용 보장)

rafId = requestAnimationFrame(() => {
  waitForAnimations(() => scheduleTransitionUpdate('idle'))
})
```

---

## 5. 상태 관리

### Machine 설계

**Input**
```ts
type Input = {
  value: string[]
  // ...
}
```

**Events**
```ts
type Events =
  | { type: 'EVENT_1'; payload: string }
  | { type: 'EVENT_2' }
```

**Computed**
```ts
type Computed = {
  derivedValue: DerivedType
}
```

**Actions**
```ts
// 각 action의 동작 명시
toggle: (context, { itemId }) => {
  // expanded면 collapse, 아니면 expand
  // multiple=false면 다른 item 닫기
  // collapsible=false면 마지막 item 닫기 방지
}
```

### Context 구조
```
RootContext
├── value, send, computed, store, disabled
│
└── ItemContext
    └── itemId, isDisabled, isExpanded
```

### 상태 추적 방식
| 상태 | 저장 위치 | 이유 |
|------|----------|------|
| expanded items | Machine input | 핵심 상태 |
| disabled items | NodeStore meta | DOM 순서 기반 조회 필요 |
| focus | DOM (activeElement) | 브라우저 관리 |

---

## 6. 애니메이션 상세

### 지원 유형
- [ ] CSS Transition
- [ ] CSS Animation (@keyframes)

### 상태 흐름
```
[마운트]
isVisible=true → 'idle' (애니메이션 없음)

[열기: false → true]
undefined → 'starting' → (rAF) → (waitForAnimations) → 'idle'

[닫기: true → false]
'idle' → 'ending' → (rAF) → (waitForAnimations) → undefined → unmount
```

### CSS 예시
```css
/* Transition 방식 */
.content[data-transition="starting"] { height: 0; opacity: 0; }
.content[data-transition="idle"] { height: auto; opacity: 1; }
.content[data-transition="ending"] { height: 0; opacity: 0; }

/* Animation 방식 */
.content[data-transition="starting"] {
  animation: slideIn 300ms forwards;
}
.content[data-transition="ending"] {
  animation: slideOut 300ms forwards;
}
```

---

## 7. 파일 구조

```
src/components/[component]/
├── machine.ts          # 상태 머신
├── index.tsx           # 컴포넌트 (primitives)
├── styled.tsx          # 스타일 적용 버전 (optional)
└── __tests__/
    └── [component].test.tsx
```

---

## 8. 테스트 계획

### 테스트 환경 요구사항
- [ ] jsdom `getAnimations` 폴리필
- [ ] `@testing-library/user-event` 설치
- [ ] `afterEach` cleanup 설정

### 테스트 케이스

**렌더링**
- [ ] 모든 컴포넌트 렌더링
- [ ] defaultValue로 초기 상태 설정
- [ ] data-part 속성 확인
- [ ] data-state 속성 확인

**클릭 상호작용**
- [ ] 클릭으로 토글
- [ ] disabled 상태에서 클릭 무시
- [ ] multiple/collapsible 옵션 동작

**키보드 상호작용**
- [ ] Enter/Space로 토글
- [ ] Arrow로 포커스 이동
- [ ] disabled item 건너뛰기
- [ ] Home/End로 처음/끝 이동
- [ ] 포커스 순환 (wrap)

**Controlled 모드**
- [ ] value prop으로 제어
- [ ] onValueChange 콜백

**ARIA**
- [ ] aria-expanded 상태
- [ ] aria-controls ↔ id 연결
- [ ] aria-labelledby ↔ id 연결
- [ ] role 속성

---

## 9. 구현 순서

1. [ ] `machine.ts` - 상태 머신
2. [ ] `index.tsx` - Types, Context 정의
3. [ ] `Root` 구현
4. [ ] 하위 컴포넌트 구현
5. [ ] 키보드 네비게이션
6. [ ] 테스트 작성
7. [ ] 예제 작성 (App.tsx)

---

## 10. 프리모템 (Pre-mortem)

> 이 구현이 실패한다면 왜?

### 높은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| | | |

### 중간 위험도
| 위험 | 증상 | 예방 |
|------|------|------|

### 낮은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|

---

## 11. 성공 기준

- [ ] 모든 테스트 통과
- [ ] W3C APG 키보드 요구사항 충족
- [ ] ARIA 속성 올바르게 적용
- [ ] controlled/uncontrolled 모드 동작
- [ ] 애니메이션 정상 동작 (transition + animation)
- [ ] 빠른 연속 토글에도 깨지지 않음

---

## 부록: 체크리스트

### 계획 작성 시
- [ ] 외부 라이브러리의 **정확한 API** 문서화했는가?
- [ ] **모든 data 속성** 매트릭스 작성했는가?
- [ ] **Role/Type 전체** 열거했는가?
- [ ] 애니메이션 **초기 상태와 전환 흐름** 명시했는가?
- [ ] **테스트 환경** 요구사항 포함했는가?

### 구현 완료 시
- [ ] 프리모템에서 예상한 위험들 확인했는가?
- [ ] 예상 못한 이슈가 있었다면 템플릿에 반영할 것은?
