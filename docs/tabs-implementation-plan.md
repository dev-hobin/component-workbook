# Tabs 구현 계획

## 1. 요구사항

### 기능 요구사항
- [ ] 단일 탭만 활성화 (항상 하나는 선택됨)
- [ ] Controlled / Uncontrolled 모드 지원
- [ ] Automatic / Manual 활성화 모드
- [ ] 가로(horizontal) / 세로(vertical) 방향 지원
- [ ] 개별 탭 비활성화
- [ ] lazyMount / unmountOnExit 옵션
- [ ] 애니메이션 인디케이터 (선택된 탭 표시)

### 접근성 요구사항 (W3C APG)

**키보드**
| 키 | 동작 | 필수 |
|----|------|------|
| `Tab` | 탭 리스트 진입 시 활성 탭으로 포커스, 탭 리스트에서 탭패널로 이동 | O |
| `ArrowLeft/Right` | 이전/다음 탭으로 포커스 이동 (horizontal) | O |
| `ArrowUp/Down` | 이전/다음 탭으로 포커스 이동 (vertical) | O |
| `Enter/Space` | Manual 모드에서 탭 활성화 | O |
| `Home` | 첫 번째 탭으로 포커스 | |
| `End` | 마지막 탭으로 포커스 | |

**ARIA**
| 속성 | 적용 대상 | 값 |
|------|----------|-----|
| `role="tablist"` | List | - |
| `role="tab"` | Trigger | - |
| `role="tabpanel"` | Content | - |
| `aria-selected` | Trigger | `"true"` / `"false"` |
| `aria-controls` | Trigger | Content의 id |
| `aria-labelledby` | Content | Trigger의 id |
| `aria-orientation` | List | `"horizontal"` / `"vertical"` |
| `aria-disabled` | Trigger | `"true"` (disabled일 때) |
| `tabindex` | Trigger | 활성 탭: `0`, 비활성 탭: `-1` |
| `tabindex` | Content | `0` (focusable 요소 없을 때) |

---

## 2. 컴포넌트 구조

### 사용 예시
```tsx
<Tabs.Root defaultValue="tab1">
  <Tabs.List>
    <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
    <Tabs.Trigger value="tab3" disabled>Tab 3</Tabs.Trigger>
    <Tabs.Indicator />
  </Tabs.List>
  <Tabs.Content value="tab1">Content 1</Tabs.Content>
  <Tabs.Content value="tab2">Content 2</Tabs.Content>
  <Tabs.Content value="tab3">Content 3</Tabs.Content>
</Tabs.Root>
```

### Props

**Root**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `value` | `string` | - | | 활성 탭 (controlled) |
| `defaultValue` | `string` | - | | 초기 활성 탭 |
| `onValueChange` | `(value: string) => void` | - | | 값 변경 콜백 |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | | 방향 |
| `activationMode` | `'automatic' \| 'manual'` | `'automatic'` | | 활성화 모드 |
| `disabled` | `boolean` | `false` | | 전체 비활성화 |

**List**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `loop` | `boolean` | `true` | | 포커스 순환 여부 |

**Trigger**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `value` | `string` | - | O | 탭 식별자 |
| `disabled` | `boolean` | `false` | | 비활성화 |

**Content**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `value` | `string` | - | O | 연결된 탭 식별자 |
| `lazyMount` | `boolean` | `false` | | 최초 활성화 시까지 렌더링 지연 |
| `unmountOnExit` | `boolean` | `false` | | 비활성화 시 언마운트 |

**Indicator**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| - | - | - | - | 스타일링용 순수 컴포넌트 |

---

## 3. Data 속성 매트릭스

| 컴포넌트 | data-part | data-state | data-disabled | data-orientation |
|---------|-----------|------------|---------------|------------------|
| Root | `"root"` | - | ✅ | ✅ |
| List | `"list"` | - | - | ✅ |
| Trigger | `"trigger"` | `"active"` / `"inactive"` | ✅ | - |
| Content | `"content"` | `"active"` / `"inactive"` | - | - |
| Indicator | `"indicator"` | - | - | ✅ |

---

## 4. 외부 의존성 API

### 라이브러리 1: controlled-machine
```ts
import { createMachine } from 'controlled-machine'

const tabsMachine = createMachine<{
  input: TabsInput
  events: TabsEvents
  computed: TabsComputed
  actions: TabsActions
}>({
  computed: {
    // 현재 활성 탭
  },
  on: {
    SELECT: 'select',
  },
  actions: {
    select: (context, { value }) => {
      context.input.onValueChange(value)
    },
  },
})
```

### 라이브러리 2: NodeStore
```ts
// Role 타입 정의
type TabsRole = 'root' | 'list' | 'trigger' | 'content' | 'indicator'

// Meta 타입 정의
type TabsMeta = {
  disabled?: boolean
}

// Trigger에서 사용
const { ref, domId } = useNode<TabsRole, TabsMeta>({
  role: 'trigger',
  id: value, // 탭의 value
  meta: { disabled },
})
```

### 라이브러리 3: usePresence (Content용)
```ts
// Content에서 lazyMount/unmountOnExit 처리
const { isPresent, transitionState } = usePresence({
  isVisible: isActive,
  resolveElement: () => elementRef.current,
})
```

---

## 5. 상태 관리

### Machine 설계

**Input**
```ts
type TabsInput = {
  value: string
  onValueChange: (value: string) => void
}
```

**Events**
```ts
type TabsEvents = {
  type: 'SELECT'
  value: string
}
```

**Computed**
```ts
type TabsComputed = {
  // 단순해서 computed 필요 없음
}
```

**Actions**
```ts
select: (context, { value }) => {
  context.input.onValueChange(value)
}
```

### Context 구조
```
TabsContext (Root)
├── value (활성 탭)
├── send
├── store
├── disabled
├── orientation
├── activationMode
├── getEnabledTriggerValues()
└── getTriggerElement(value)
```

### 상태 추적 방식
| 상태 | 저장 위치 | 이유 |
|------|----------|------|
| active tab | Machine input (value) | 핵심 상태 |
| disabled tabs | NodeStore meta | DOM 순서 기반 조회 필요 |
| focus | DOM (activeElement) | 브라우저 관리 |
| indicator position | DOM (getBoundingClientRect) | 실시간 위치 계산 |

---

## 6. 애니메이션 상세

### 지원 유형
- [x] CSS Transition (Content fade)
- [x] Indicator 위치 애니메이션

### Content 상태 흐름
```
[마운트]
isActive=true → 'idle' (애니메이션 없음)

[활성화: false → true]
undefined → 'starting' → (rAF) → (waitForAnimations) → 'idle'

[비활성화: true → false]
'idle' → 'ending' → (rAF) → (waitForAnimations) → undefined → unmount
```

### Indicator 위치 계산
```ts
// 활성 탭의 위치/크기 기반으로 Indicator 스타일 계산
const activeTab = getTriggerElement(value)
const rect = activeTab.getBoundingClientRect()
const listRect = listElement.getBoundingClientRect()

// horizontal
style = {
  left: rect.left - listRect.left,
  width: rect.width,
}

// vertical
style = {
  top: rect.top - listRect.top,
  height: rect.height,
}
```

### CSS 예시
```css
/* Content transition */
.content[data-state="inactive"] { display: none; }
.content[data-state="active"] { display: block; }

/* Indicator animation */
.indicator {
  position: absolute;
  transition: left 200ms, width 200ms, top 200ms, height 200ms;
}
```

---

## 7. 파일 구조

```
src/components/tabs/
├── machine.ts
├── index.tsx
└── __tests__/
    └── tabs.test.tsx
```

---

## 8. 테스트 계획

### 테스트 환경 요구사항
- [x] jsdom `getAnimations` 폴리필 (이미 설정됨)
- [x] `@testing-library/user-event` (이미 설치됨)
- [x] `afterEach` cleanup (이미 설정됨)

### 테스트 케이스

**렌더링**
- [ ] 모든 컴포넌트 렌더링
- [ ] defaultValue로 초기 활성 탭 설정
- [ ] data-part 속성 확인
- [ ] data-state 속성 확인 (active/inactive)

**클릭 상호작용**
- [ ] 클릭으로 탭 전환
- [ ] disabled 탭 클릭 무시
- [ ] 전체 disabled 시 모든 클릭 무시

**키보드 상호작용**
- [ ] Arrow로 포커스 이동
- [ ] disabled 탭 건너뛰기
- [ ] Home/End로 처음/끝 이동
- [ ] 포커스 순환 (loop)
- [ ] Automatic 모드: 포커스 시 활성화
- [ ] Manual 모드: Enter/Space로 활성화

**Controlled 모드**
- [ ] value prop으로 제어
- [ ] onValueChange 콜백

**ARIA**
- [ ] role="tablist", role="tab", role="tabpanel"
- [ ] aria-selected 상태
- [ ] aria-controls ↔ id 연결
- [ ] aria-labelledby ↔ id 연결
- [ ] tabindex 관리 (활성: 0, 비활성: -1)

---

## 9. 구현 순서

1. [ ] `machine.ts` - 상태 머신
2. [ ] `index.tsx` - Types, Context 정의
3. [ ] `Root` 구현
4. [ ] `List` 구현 (키보드 핸들러)
5. [ ] `Trigger` 구현
6. [ ] `Content` 구현 (usePresence)
7. [ ] `Indicator` 구현 (위치 계산)
8. [ ] 테스트 작성
9. [ ] 예제 페이지 작성

---

## 10. 프리모템 (Pre-mortem)

> 이 구현이 실패한다면 왜?

### 높은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| Indicator 위치 계산 | 애니메이션이 튀거나 위치가 맞지 않음 | ResizeObserver로 크기 변화 감지, getBoundingClientRect 사용 |
| tabindex 관리 | Tab 키로 탭 간 이동됨 (잘못된 동작) | 활성 탭만 tabindex=0, 나머지는 -1 |
| Automatic vs Manual 모드 혼동 | 포커스만으로 활성화되거나 안 됨 | activationMode prop 명확히 구분 |

### 중간 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| lazyMount + 초기 활성 탭 | 초기 활성 탭 콘텐츠가 안 보임 | wasEverActive 상태로 추적 |
| orientation 키보드 매핑 | vertical에서 Left/Right가 동작 | orientation별 키 매핑 분기 |

### 낮은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| Content id 연결 타이밍 | aria-controls가 null | nullable 처리, useStoreSubscribe |

---

## 11. 성공 기준

- [ ] 모든 테스트 통과
- [ ] W3C APG 키보드 요구사항 충족
- [ ] ARIA 속성 올바르게 적용
- [ ] controlled/uncontrolled 모드 동작
- [ ] automatic/manual 활성화 모드 동작
- [ ] Indicator 애니메이션 정상 동작
- [ ] horizontal/vertical 방향 지원

---

## 부록: Accordion과의 차이점

| 항목 | Accordion | Tabs |
|------|-----------|------|
| 활성 상태 | 여러 개 가능 (multiple) | 항상 1개만 |
| 모두 닫기 | 가능 (collapsible) | 불가능 |
| 컨텐츠 위치 | 트리거 바로 아래 | 분리된 영역 |
| 키보드 | Arrow로 트리거 간 이동 | Arrow로 탭 간 이동 + Tab으로 패널 진입 |
| tabindex | 트리거는 항상 focusable | 활성 탭만 tabindex=0 |
| 추가 컴포넌트 | - | List (tablist), Indicator |

---

## 부록: 체크리스트

### 계획 작성 시
- [x] 외부 라이브러리의 **정확한 API** 문서화했는가?
- [x] **모든 data 속성** 매트릭스 작성했는가?
- [x] **Role/Type 전체** 열거했는가?
- [x] 애니메이션 **초기 상태와 전환 흐름** 명시했는가?
- [x] **테스트 환경** 요구사항 포함했는가?
