# [컴포넌트명] 구현 계획

## 0. 핵심 원칙

> 이 원칙들은 과거 구현에서 발생한 실제 버그에서 도출됨

| 원칙 | 설명 | 위반 시 증상 |
|------|------|-------------|
| **Machine = 선언적 명세서** | Machine만 읽으면 컴포넌트 동작이 이해되어야 함 | Shell에 조건문/비즈니스 로직 과다 |
| **DOM helpers 패턴** | Machine은 "무엇을", Shell은 "언제/어떻게" | Effect가 DOM 렌더링 전에 실행되어 동작 안함 |
| **stopPropagation 금지** | 라이브러리 코드에서 이벤트 흐름 방해 금지 | 상위 컴포넌트가 이벤트 감지 불가 |
| **전역 레이어 스택** | 중첩 레이어는 상태 기반으로 topmost 판별 | 중첩 Modal에서 Escape가 모두 닫음 |
| **NodeStore 실시간 쿼리** | 스냅샷 아닌 이벤트 시점 직접 조회 | 동적 요소 클릭 시 깜빡임/오동작 |
| **첫 렌더링 데이터는 Context** | depth, parentId 등 첫 렌더링 필요 데이터는 React Context | 첫 렌더링 시 잘못된 값/깜빡임 |
| **파생 상태는 meta에 저장 금지** | 계산 가능한 값은 헬퍼로 제공 | useEffect 동기화 anti-pattern |
| **옵션/아이템 등록은 meta로** | Context 함수 전달 대신 useNode meta 사용 | 무한 렌더링 (함수 참조 불안정) |
| **ARIA domId는 useStoreSubscribe로** | 하드코딩 대신 store에서 동적 구독 | 커스텀 domId 사용 시 연결 실패 |

### 컴포넌트 유형 판별

| 유형 | 특징 | 필요 패턴 | 예시 |
|------|------|----------|------|
| **레이어 컴포넌트** | Escape로 닫힘, 중첩 가능, 오버레이 | DismissableLayer + DOM helpers | Modal, Dropdown, Popover, Tooltip |
| **인라인 컴포넌트** | 페이지 흐름 내 존재, 중첩 개념 없음 | Machine만 | Accordion, Tabs, Toggle |

> ⚠️ 레이어 컴포넌트는 반드시 **중첩 케이스 테스트** 필수

---

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

### Props 위치 결정
> Machine 로직에 필요한 prop은 반드시 Root에 배치

| Prop | 위치 | 이유 |
|------|------|------|
| `loop` | Root | 키보드 네비게이션 로직에 필요 |
| `activationMode` | Root | 포커스 시 활성화 여부 결정에 필요 |
| `disabled` (개별) | 하위 컴포넌트 | 해당 요소만 영향 |

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
  actions: ActionsType  // 문자열 union (예: 'select' | 'focus')
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

**NodeStore 핵심 원칙: 실시간 쿼리 사용**

> ⚠️ **중요**: NodeStore는 실시간 요소 추적을 위해 설계됨. 스냅샷이 아닌 실시간 쿼리 사용 필수.

```ts
// ❌ 잘못된 패턴: useLayoutEffect로 스냅샷 저장
const [excludeRefs, setExcludeRefs] = useState<RefObject<HTMLElement>[]>([])
useLayoutEffect(() => {
  const triggers = store.getNodesByRole('sub-trigger')
  setExcludeRefs(triggers.map(n => ({ current: n.element })))
}, [store])
// 문제: SubTrigger 마운트 타이밍에 따라 스냅샷이 불완전할 수 있음

// ✅ 올바른 패턴: 이벤트 발생 시점에 store 직접 쿼리
const handlePointerDownOutside = useCallback((event: PointerEvent) => {
  const target = event.target as Node | null
  if (!target) return

  // 클릭 시점에 store에서 최신 정보 조회
  const subTriggerNodes = store.getNodesByRole('sub-trigger')
  for (const node of subTriggerNodes) {
    if (node.element?.contains(target)) {
      return // sub-trigger 클릭은 외부 클릭 아님
    }
  }

  send('CLOSE_ALL')
}, [send, store])
```

**사용 사례별 패턴:**
| 사용 사례 | 패턴 | 이유 |
|----------|------|------|
| Machine helper 함수 | 실시간 쿼리 | 호출 시점의 정확한 상태 필요 |
| DismissableLayer excludeRefs | 실시간 쿼리 | 클릭 시점의 정확한 요소 목록 필요 |
| ARIA id 연결 | useNode의 domId | 자동 생성, 렌더링과 동기화 |
| 조건부 렌더링 체크 | 실시간 쿼리 | 마운트/언마운트 타이밍 이슈 방지 |

**React Context vs NodeStore 사용 시점:**

> ⚠️ **중요**: 첫 렌더링에 필요한 데이터와 이벤트 시점에 필요한 데이터를 구분해야 함

```
렌더링 단계 (Render Phase)
├── React Context 사용 가능 ✅
│   ├── useParentId() → 부모 ID
│   └── useLevel() → 현재 depth
│
└── Store 비어있음 ❌
    └── store.getNode() → null (아직 등록 안됨)

커밋 단계 (Commit Phase)
├── useNode의 ref callback 실행 → Store에 등록
└── useLogicalNode의 useLayoutEffect 실행 → Store에 등록

이후 렌더링/이벤트
└── Store 데이터 사용 가능 ✅
```

| 필요한 것 | 사용할 도구 | 사용 시점 |
|----------|------------|----------|
| 렌더링 중 depth/level | `useLevel()` | 동기적 (첫 렌더링 OK) |
| 렌더링 중 부모 ID | `useParentId()` | 동기적 (첫 렌더링 OK) |
| DOM element 등록 | `useNode()` | 비동기 (커밋 후) |
| DOM 없이 논리적 노드 등록 | `useLogicalNode()` | 비동기 (커밋 후) |
| Store 데이터 구독 | `useStoreSubscribe()` | 동기적 구독 |

```tsx
// ❌ Bad: Store 쿼리로 depth 계산 (첫 렌더링 실패)
function useDepth(): number {
  const store = useNodeStore()
  let depth = 0
  let parent = useParentId()
  while (parent) {
    depth++
    const node = store.getNode(parent, 'item') // 첫 렌더링: null!
    parent = node?.meta.parentValue
  }
  return depth
}

// ✅ Good: React Context로 depth 계산 (첫 렌더링 OK)
function useDepth(): number {
  const level = useLevel()
  return level - 1
}
```

**파생 상태는 meta에 저장하지 않기:**

> ⚠️ **중요**: 다른 노드의 존재 여부로 계산되는 값은 meta에 저장하지 말 것

```tsx
// ❌ Bad: hasChildren을 meta에 저장 후 useEffect로 동기화
const { ref } = useNode({
  role: 'item',
  meta: { value, hasChildren }, // hasChildren은 group 존재 여부로 결정됨
})

// 비동기로 결정되므로 동기화 필요 (anti-pattern!)
useEffect(() => {
  const node = store.getNode(value, 'item')
  if (node) node.meta.hasChildren = hasChildren
}, [hasChildren])

// ✅ Good: meta에서 제거하고 헬퍼로 계산
const { ref } = useNode({
  role: 'item',
  meta: { value, disabled, parentValue, depth, textValue },
})

// Machine helper로 제공
const getHasChildren = useCallback((value: ItemValue): boolean => {
  const groups = store.getNodesByRole('group')
  return groups.some(
    node => 'parentValue' in node.meta && node.meta.parentValue === value
  )
}, [store])
```

**Store 구독은 항상 useStoreSubscribe 사용:**

```tsx
// ❌ Bad: useState + useEffect (깜빡임 발생)
const [hasChildren, setHasChildren] = useState(false)
useEffect(() => {
  const check = () => {
    const groups = store.getNodesByRole('group')
    setHasChildren(groups.some(...))
  }
  check()
  return store.subscribe(check)
}, [store])

// ✅ Good: useStoreSubscribe (동기적 구독, 깜빡임 없음)
const hasChildren = useStoreSubscribe(store, (s) => {
  const groups = s.getNodesByRole('group')
  return groups.some(
    node => 'parentValue' in node.meta && node.meta.parentValue === value
  )
})
```

**옵션/아이템 등록은 Context 함수 대신 meta 사용:**

> ⚠️ **중요**: Context로 등록 함수를 전달하면 무한 렌더링 발생 가능

```tsx
// ❌ Bad: Context로 등록 함수 전달 (무한 렌더링 위험)
// Root에서:
const [options, setOptions] = useState<Option[]>([])
const registerOption = (option) => setOptions(prev => [...prev, option])
const unregisterOption = (id) => setOptions(prev => prev.filter(o => o.id !== id))
// 문제: 함수가 매 렌더마다 새로 생성 → Option의 useEffect 재실행 → 무한 루프

// Option에서:
useEffect(() => {
  registerOption({ id, value, label, disabled })
  return () => unregisterOption(id)
}, [registerOption, unregisterOption, ...]) // 함수 참조 변경 → 재실행

// ✅ Good: NodeStore meta로 등록
// Option에서:
type OptionMeta = { value: string; label: string; disabled: boolean }

const { ref, domId } = useNode<ComponentRole, OptionMeta>({
  role: 'option',
  id: optionId,
  meta: { value, label, disabled }, // useNode 내부에서 안정적으로 등록/해제
})

// Root에서 필요할 때 store에서 조회:
const getOptions = useCallback(() => {
  const optionNodes = store.getNodesByRole('option')
  return optionNodes.map(node => ({
    id: node.id,
    value: node.meta.value,
    label: node.meta.label,
    disabled: node.meta.disabled,
  }))
}, [store])
```

**ARIA 속성에 필요한 다른 컴포넌트의 domId 구독:**

> ⚠️ **중요**: domId를 하드코딩하면 커스텀 domId 사용 시 연결 실패

```tsx
// ❌ Bad: domId 패턴 하드코딩
const Input = () => {
  const listboxDomId = `listbox::${comboboxId}` // 가정에 의존
  return <input aria-controls={listboxDomId} />
}

// ✅ Good: useStoreSubscribe로 동적 구독
const Input = () => {
  const { comboboxId, store } = useComboboxContext()

  // Listbox의 domId 구독 (Listbox가 마운트되면 자동 업데이트)
  const listboxDomId = useStoreSubscribe(
    store,
    (s) => s.getNode(comboboxId, 'listbox')?.domId ?? null,
  )

  return <input aria-controls={listboxDomId ?? undefined} />
}
```

**ComponentNode에 domId가 저장되어 있음:**
```ts
interface ComponentNode<Role, Meta> {
  id: NodeId
  parentId: NodeId | null
  role: Role
  domId: string  // DOM element의 id 속성 값 (useNode에서 자동 설정)
  meta: Meta
  element: HTMLElement | null
}
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

### 프리미티브 1: DismissableLayer
```ts
// 중첩된 dismissable 컴포넌트(Modal, Dropdown, Popover 등)에서
// Escape 키가 최상위 레이어만 닫도록 처리

import { DismissableLayer } from '@/primitives/dismissable-layer'

// 사용 패턴
<DismissableLayer
  isActive={open}                    // 레이어가 활성화되었는지 (스택에 등록)
  dismissOnEscape={closeOnEscape}    // Escape 키로 닫을 수 있는지
  onEscapeKeyDown={handleEscape}     // Escape 키 핸들러 (isTopmost일 때만 호출)
  onPointerDownOutside={handleOutsideClick}  // 외부 클릭 핸들러
  contentRef={contentRef}            // 외부 클릭 감지 대상 요소
>
  {children}
</DismissableLayer>
```

**핵심 동작:**
- 전역 레이어 스택으로 활성화된 레이어 순서 추적
- `isTopmost`인 레이어만 Escape 키/외부 클릭 이벤트 처리
- 중첩 Modal에서 Escape 누르면 최상위 Modal만 닫힘

**언제 사용하는가:**
| 컴포넌트 | DismissableLayer 필요? | 이유 |
|---------|----------------------|------|
| Modal | ✅ | 중첩 Modal에서 Escape가 최상위만 닫아야 함 |
| Dropdown | ✅ | Modal 안에 Dropdown이 있을 때 |
| Popover | ✅ | 중첩 가능한 모든 레이어 컴포넌트 |
| Accordion | ❌ | 중첩/레이어 개념 없음 |
| Tabs | ❌ | 중첩/레이어 개념 없음 |

**주의: stopPropagation 금지**
> 라이브러리 수준 코드에서 `event.stopPropagation()`은 절대 사용하면 안 됨
> 사용자가 상위에서 이벤트를 감지할 수 없게 되어 예측 불가능한 동작 발생

---

## 5. 상태 관리

### Focus vs Selection 분석
> 컴포넌트에서 Focus와 Selection이 분리되는지 확인

| 컴포넌트 | Focus = Selection? | 처리 방식 |
|----------|-------------------|-----------|
| Accordion | Yes | DOM focus만 사용 |
| Tabs (automatic) | Yes | focusedValue + value 동시 업데이트 |
| Tabs (manual) | **No** | focusedValue 별도 추적, Enter/Space로 활성화 |
| Menu | No | focusedItem 별도 추적 |

**Focus ≠ Selection인 경우:**
- Machine input에 `focusedValue` 추가
- 모든 focus 진입점에서 FOCUS 이벤트 발송
  - Click
  - Tab 키
  - Arrow 키
  - Programmatic focus (element.focus())

### Machine 설계

> ⚠️ **핵심 원칙**: Machine은 컴포넌트의 **선언적 명세서**여야 함
>
> - Machine만 읽으면 컴포넌트의 모든 동작이 **글처럼 읽혀야** 함
> - W3C APG 요구사항, 상태 변경 로직, 조건부 동작이 모두 Machine에 선언적으로 존재
> - Shell은 Machine에 필요한 **데이터 제공**과 **실행 시점 결정**만 담당
> - "이 컴포넌트는 어떻게 동작하나요?" → Machine 파일을 읽으면 답이 나와야 함

**Input**
```ts
type Input = {
  // 핵심 상태
  value: string
  onValueChange: (value: string) => void

  // Focus 추적 (focus ≠ selection인 경우)
  focusedValue: string | null
  onFocusedValueChange: (value: string | null) => void

  // 옵션 (Machine 로직에 필요한 것만)
  activationMode: 'automatic' | 'manual'
  loop: boolean

  // 지연 헬퍼 (NodeStore에서 계산)
  getEnabledValues: () => string[]
}
```

**Events**
```ts
// W3C 키보드 요구사항을 이벤트로 매핑
type Events = {
  // 상태 변경
  SELECT: { value: string }

  // Focus 동기화 (focus 진입점마다 발송)
  FOCUS: { value: string }

  // 키보드 네비게이션 (W3C APG 직접 반영)
  // 페이로드 없는 이벤트는 undefined 사용
  FOCUS_NEXT: undefined    // ArrowRight/Down
  FOCUS_PREV: undefined    // ArrowLeft/Up
  FOCUS_FIRST: undefined   // Home
  FOCUS_LAST: undefined    // End

  // Manual 모드 활성화
  ACTIVATE_FOCUSED: undefined  // Enter/Space
}
```

**Computed**
```ts
type Computed = {
  enabledValues: string[]
  nextValue: string | null
  prevValue: string | null
  firstValue: string | null
  lastValue: string | null
}
```

**Actions**
```ts
// 각 action의 동작 명시
focusNext: (context) => {
  // 1. 다음 enabled 값 계산
  // 2. focusedValue 업데이트
  // 3. automatic 모드면 value도 업데이트
}
```

**Effects (부수효과)**
```ts
// 상태 변화 감지 후 부수효과 실행
effects: [
  {
    watch: (context) => context.open,
    enter: (context) => {
      // open이 true가 될 때 실행
      context.dom.lockScroll()
      context.dom.activateFocusTrap()

      // cleanup 함수 반환
      return () => {
        context.dom.deactivateFocusTrap()
        context.dom.unlockScroll()
      }
    },
  },
],
```

> ⚠️ **핵심**: Machine effects는 "무엇을 할지"만 선언 (`dom.activateFocusTrap()`)
> 타이밍, 렌더링 대기, 외부 라이브러리 연동은 Shell이 제공하는 DOM helper가 처리

**DOM helpers 타입 (Input에 포함)**
```ts
type ComponentDom = {
  // Shell이 구현하는 DOM 조작 함수들
  activateFocusTrap: () => void    // 타이밍 처리 포함
  deactivateFocusTrap: () => void
  lockScroll: () => void
  unlockScroll: () => void
}

type Input = {
  // ...기존 props
  dom: ComponentDom
}
```

**Shell에서 DOM helper 구현**
```ts
// Shell (index.tsx)
const activateFocusTrap = useCallback(() => {
  // Shell이 타이밍 책임 - DOM 렌더링 대기
  requestAnimationFrame(() => {
    const contentElement = contentRef.current
    if (!contentElement) return

    // 외부 라이브러리 사용
    const trap = createFocusTrap(contentElement, { ... })
    trap.activate()
    trapRef.current = trap
  })
}, [])

// Machine에 전달
const { send, computed } = useMachine(machine, {
  ...props,
  dom: {
    activateFocusTrap,
    deactivateFocusTrap,
    lockScroll,
    unlockScroll,
  },
})
```

### Machine과 Shell의 역할 분리

> Machine = **"무엇을, 어떻게"** (선언적 명세)
> Shell = **"언제, 어디서"** (데이터 제공 + 실행 시점 + 타이밍)

| 역할 | Machine | Shell |
|------|---------|-------|
| **동작 명세 (What/How)** | | |
| 상태 변경 로직 | ✅ | ❌ |
| 네비게이션 계산 | ✅ | ❌ |
| 조건부 로직 (automatic/manual) | ✅ | ❌ |
| 비즈니스 규칙 (collapsible, multiple 등) | ✅ | ❌ |
| 부수효과 선언 (effects) | ✅ (`dom.xxx()` 호출) | ❌ |
| **실행 컨텍스트 (When/Where)** | | |
| DOM 이벤트 리스닝 | ❌ | ✅ |
| 이벤트 발송 시점 결정 | ❌ | ✅ |
| DOM 노드 데이터 제공 (getEnabledValues 등) | ❌ | ✅ |
| DOM 포커스 실행 | ❌ | ✅ (useEffect) |
| ARIA 속성 적용 | ❌ | ✅ |
| **DOM helpers (타이밍 책임)** | | |
| 렌더링 타이밍 처리 (requestAnimationFrame) | ❌ | ✅ |
| 외부 라이브러리 연동 (focus-trap 등) | ❌ | ✅ |
| cleanup 로직 구현 | ❌ | ✅ |

### Context 구조
```
RootContext
├── value, focusedValue, send, computed, store
├── disabled, orientation, activationMode
│
└── ItemContext (필요시)
    └── itemId, isDisabled, isExpanded
```

### 상태 추적 방식
| 상태 | 저장 위치 | 이유 |
|------|----------|------|
| selected value | Machine input | 핵심 상태 |
| focused value | Machine input | 키보드 네비게이션에 필요 |
| disabled items | NodeStore meta | DOM 순서 기반 조회 필요 |
| DOM focus | Shell (useEffect) | Machine에서 focusedValue 변경 시 동기화 |

---

## 6. 콘텐츠 전환 전략

### 전환 방식 결정
| 컴포넌트 | 전환 방식 | 이유 |
|----------|----------|------|
| Accordion | 애니메이션 | 높이 변화 시각화 필요 |
| Tabs | **즉시 전환** | 패널 간 빠른 전환 기대 |
| Dialog | 애니메이션 | 모달 진입/퇴장 시각화 |

### 즉시 전환 (Tabs 등)
```tsx
// styled.tsx에서 inactive 숨김 처리
<Content className="data-[state=inactive]:hidden" />
```
- usePresence는 lazyMount/unmountOnExit 용으로만 사용
- CSS로 inactive 즉시 숨김

### 애니메이션 전환 (Accordion 등)
```tsx
// usePresence의 transitionState 활용
<Content
  data-state={isActive ? 'open' : 'closed'}
  data-transition={transitionState}
/>
```

### 상태 흐름
```
[마운트]
isVisible=true → 'idle' (애니메이션 없음)

[열기: false → true]
undefined → 'starting' → (rAF) → (waitForAnimations) → 'idle'

[닫기: true → false]
'idle' → 'ending' → (rAF) → (waitForAnimations) → undefined → unmount
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
- [ ] 클릭으로 토글/선택
- [ ] disabled 상태에서 클릭 무시
- [ ] 옵션별 동작 (multiple/collapsible 등)

**키보드 상호작용**
- [ ] Enter/Space로 활성화
- [ ] Arrow로 포커스 이동
- [ ] disabled item 건너뛰기
- [ ] Home/End로 처음/끝 이동
- [ ] 포커스 순환 (loop=true/false)
- [ ] Activation mode (automatic/manual)

**Controlled 모드**
- [ ] value prop으로 제어
- [ ] onValueChange 콜백

**ARIA**
- [ ] role 속성
- [ ] aria-selected/aria-expanded 상태
- [ ] aria-controls ↔ id 연결
- [ ] aria-labelledby ↔ id 연결
- [ ] tabindex 관리

**레이어 컴포넌트 전용 (Modal, Dropdown, Popover 등)**
- [ ] 열기/닫기 기본 동작
- [ ] Escape로 닫기
- [ ] 외부 클릭으로 닫기
- [ ] Focus trap 동작 (Tab 순환)
- [ ] 닫을 때 트리거로 포커스 복귀
- [ ] **중첩 테스트: Escape가 topmost만 닫는지**
- [ ] **중첩 테스트: 외부 클릭 시 동작**
- [ ] Scroll lock 동작

---

## 9. 구현 순서

1. [ ] `machine.ts` - 상태 머신 (모든 W3C 이벤트 포함)
2. [ ] `index.tsx` - Types, Context 정의
3. [ ] `Root` 구현 (machine 연결, focusedValue 상태)
4. [ ] `List` 구현 (키보드 이벤트 → machine 이벤트)
5. [ ] `Trigger` 구현 (onFocus로 FOCUS 이벤트 발송)
6. [ ] `Content` 구현 (usePresence)
7. [ ] `Indicator` 구현 (위치 계산)
8. [ ] `styled.tsx` 작성 (콘텐츠 전환 전략 적용)
9. [ ] 테스트 작성
10. [ ] 예제 페이지 작성

---

## 10. 프리모템 (Pre-mortem)

> 이 구현이 실패한다면 왜?

### 높은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| Focus 동기화 누락 | 프로그래밍 방식 focus 후 키보드 동작 오류 | 모든 focus 진입점에 FOCUS 이벤트 |
| Machine 로직 부족 | Shell에 조건문 과다 | W3C 요구사항 → Machine 이벤트 매핑 검토 |
| Effect 타이밍 이슈 | Effect가 DOM 렌더링 전에 실행되어 동작 안함 | DOM helpers 패턴 사용 (Shell이 타이밍 책임) |
| **NodeStore 스냅샷 사용** | 동적 요소 클릭 시 깜빡임/오동작 | **이벤트 핸들러에서 store 실시간 쿼리** |
| **첫 렌더링 Store 쿼리** | 첫 렌더링 시 잘못된 값 (depth=0 등) | **React Context (useLevel, useParentId) 사용** |
| **파생 상태 meta 저장** | useEffect 동기화 anti-pattern | **헬퍼 함수로 계산, meta에 저장 안함** |
| **Context로 등록 함수 전달** | `Maximum update depth exceeded` 무한 렌더링 | **NodeStore meta 사용** |
| **domId 하드코딩** | 커스텀 domId 사용 시 ARIA 연결 실패 | **useStoreSubscribe로 동적 구독** |

### 중간 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| 콘텐츠 깜빡임 | 전환 시 두 콘텐츠 동시 표시 | 콘텐츠 전환 전략 사전 결정 |
| Props 위치 오류 | Machine에서 prop 접근 불가 | Props 위치 결정 섹션 체크 |
| Machine에 타이밍 로직 포함 | requestAnimationFrame 등이 machine에 존재 | DOM helpers로 추상화 |
| 중첩 레이어 Escape 처리 | 중첩 Modal에서 Escape가 모두 닫음 | DismissableLayer 프리미티브 사용 |
| stopPropagation 사용 | 상위 컴포넌트가 이벤트 감지 불가 | 전역 레이어 스택으로 해결 |

### 낮은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| aria-controls 타이밍 | id 연결 시 null | nullable 처리, useStoreSubscribe |

---

## 11. 성공 기준

- [ ] 모든 테스트 통과
- [ ] W3C APG 키보드 요구사항 충족
- [ ] ARIA 속성 올바르게 적용
- [ ] controlled/uncontrolled 모드 동작
- [ ] 콘텐츠 전환 깜빡임 없음
- [ ] Focus/Selection 동기화 정상

**레이어 컴포넌트 추가 기준:**
- [ ] 중첩 시 Escape가 topmost만 닫음
- [ ] stopPropagation 미사용
- [ ] Machine에 타이밍 로직 없음 (DOM helpers 사용)

---

## 부록: 체크리스트

### 계획 작성 시
- [ ] **primitives 먼저 확인**: useNode, NodeStore, ParentProvider 활용 가능성 검토했는가?
- [ ] 외부 라이브러리의 **정확한 API** 문서화했는가?
- [ ] **모든 data 속성** 매트릭스 작성했는가?
- [ ] **Role/Type 전체** 열거했는가?
- [ ] 애니메이션 **초기 상태와 전환 흐름** 명시했는가?
- [ ] **테스트 환경** 요구사항 포함했는가?
- [ ] **Focus vs Selection 분석** 했는가?
- [ ] **모든 요구사항 → Machine 이벤트/액션 매핑** 했는가?
- [ ] Machine 로직에 필요한 **Props 위치 확인**했는가?
- [ ] **콘텐츠 전환 전략** 결정했는가?
- [ ] **부수효과(effects) 필요 여부** 확인했는가? (focus trap, scroll lock 등)
- [ ] **DOM helpers 인터페이스** 정의했는가? (effects 사용 시)
- [ ] **DismissableLayer 필요 여부** 확인했는가? (레이어/중첩 가능 컴포넌트)

### 레이어 컴포넌트 추가 체크 (Modal, Dropdown, Popover 등)
- [ ] **DismissableLayer로 Content 래핑**했는가?
- [ ] **DOM helpers 패턴** 적용했는가? (focus trap, scroll lock)
- [ ] **중첩 시나리오** 정의했는가?
  - 같은 컴포넌트 중첩 (Modal 안에 Modal)
  - 다른 컴포넌트 중첩 (Modal 안에 Dropdown)
- [ ] **Escape 동작** 명세했는가? (topmost만 닫힘)
- [ ] **외부 클릭 동작** 명세했는가? (중첩 시 어떻게 처리?)
- [ ] **포커스 복귀** 고려했는가? (닫힐 때 트리거로 복귀)

### 구현 완료 시
- [ ] **Machine만 읽으면 컴포넌트 동작이 이해되는가?** (선언적 명세)
- [ ] Shell에 조건문/비즈니스 로직이 없는가? (있다면 Machine으로 이동)
- [ ] **Machine에 타이밍 로직이 없는가?** (requestAnimationFrame 등은 DOM helpers로)
- [ ] 프리모템에서 예상한 위험들 확인했는가?
- [ ] 모든 focus 진입점에서 focusedValue 동기화되는가?
- [ ] **중첩 케이스 테스트했는가?** (레이어 컴포넌트는 중첩 시 Escape 동작 확인)
- [ ] **stopPropagation 사용하지 않았는가?** (DismissableLayer로 해결)
- [ ] **NodeStore 스냅샷 대신 실시간 쿼리 사용했는가?** (이벤트 핸들러에서 직접 조회)
- [ ] **첫 렌더링 데이터는 React Context 사용했는가?** (depth, parentId 등)
- [ ] **파생 상태를 meta에 저장하지 않았는가?** (다른 노드 존재 여부로 계산되는 값)
- [ ] **Store 구독에 useStoreSubscribe 사용했는가?** (useState + useEffect 금지)
- [ ] **옵션/아이템 등록에 NodeStore meta 사용했는가?** (Context 함수 전달 금지 → 무한 렌더링)
- [ ] **ARIA domId에 useStoreSubscribe 사용했는가?** (하드코딩 금지 → 커스텀 domId 지원)
- [ ] 예상 못한 이슈가 있었다면 템플릿에 반영할 것은?

### 코드 스멜 체크

> 아래 패턴이 보이면 설계 재검토 필요

**Machine 파일에서:**
```ts
// ❌ 타이밍 로직이 Machine에 있음
requestAnimationFrame(() => { ... })
setTimeout(() => { ... })

// ❌ DOM 직접 조작
document.body.style.overflow = 'hidden'
element.focus()

// ❌ 외부 라이브러리 직접 호출
createFocusTrap(element).activate()
```

**Shell 파일에서:**
```tsx
// ❌ 비즈니스 로직이 Shell에 있음
if (mode === 'automatic') { ... }
if (multiple && expandedIds.has(id)) { ... }

// ❌ stopPropagation 사용
event.stopPropagation()

// ❌ 중첩 레이어에서 직접 Escape 처리
if (event.key === 'Escape') { onClose() }  // DismissableLayer 없이

// ❌ NodeStore 스냅샷으로 excludeRefs 구성 (타이밍 버그 유발)
const [excludeRefs, setExcludeRefs] = useState<RefObject<HTMLElement>[]>([])
useLayoutEffect(() => {
  const nodes = store.getNodesByRole('sub-trigger')
  setExcludeRefs(nodes.map(n => ({ current: n.element })))
}, [store])
// 문제: 새 SubTrigger가 마운트되기 전에 스냅샷이 만들어져 클릭 감지 실패

// ❌ 첫 렌더링에 Store 쿼리 사용 (첫 렌더링 시 잘못된 값)
function useDepth(): number {
  const store = useNodeStore()
  let depth = 0
  let parent = useParentId()
  while (parent) {
    const node = store.getNode(parent, 'item') // 첫 렌더링: null!
    // ...
  }
  return depth
}

// ❌ 파생 상태를 meta에 저장 후 useEffect로 동기화 (anti-pattern)
const { ref } = useNode({
  meta: { hasChildren }, // group 존재 여부로 결정되는 값
})
useEffect(() => {
  const node = store.getNode(value, 'item')
  if (node) node.meta.hasChildren = hasChildren // 동기화 필요 = anti-pattern
}, [hasChildren])

// ❌ useState + useEffect로 Store 구독 (깜빡임 발생)
const [items, setItems] = useState([])
useEffect(() => {
  setItems(store.getNodesByRole('item'))
  return store.subscribe(() => setItems(store.getNodesByRole('item')))
}, [store])

// ❌ Context로 등록/해제 함수 전달 (무한 렌더링)
// Root:
const registerOption = (option) => setOptions(prev => [...prev, option])
// Option:
useEffect(() => {
  registerOption({ id, value })
  return () => unregisterOption(id)
}, [registerOption, unregisterOption]) // 함수 참조 매번 변경 → 무한 루프

// ❌ ARIA domId 하드코딩 (커스텀 domId 사용 시 연결 실패)
const listboxDomId = `listbox::${comboboxId}`
return <input aria-controls={listboxDomId} />
```

**올바른 패턴:**
```ts
// ✅ Machine: 선언만
effects: [{
  watch: (ctx) => ctx.open,
  enter: (ctx) => { ctx.dom.activateFocusTrap() }  // 무엇을 할지만
}]

// ✅ Shell: 타이밍 처리
const activateFocusTrap = useCallback(() => {
  requestAnimationFrame(() => { ... })  // 언제/어떻게
}, [])

// ✅ 중첩 레이어: DismissableLayer 사용
<DismissableLayer isActive={open} onEscapeKeyDown={handleEscape}>
  {children}
</DismissableLayer>

// ✅ NodeStore: 이벤트 핸들러에서 실시간 쿼리
const handlePointerDownOutside = useCallback((event: PointerEvent) => {
  const target = event.target as Node | null
  if (!target) return

  // 클릭 발생 시점에 store 직접 조회 (스냅샷 아님)
  const subTriggerNodes = store.getNodesByRole('sub-trigger')
  for (const node of subTriggerNodes) {
    if (node.element?.contains(target)) return
  }

  send('CLOSE_ALL')
}, [send, store])

// ✅ 첫 렌더링 데이터: React Context 사용
function useDepth(): number {
  const level = useLevel() // React Context - 첫 렌더링 OK
  return level - 1
}

// ✅ 파생 상태: meta에 저장하지 않고 헬퍼로 계산
const getHasChildren = useCallback((value: ItemValue): boolean => {
  const groups = store.getNodesByRole('group')
  return groups.some(
    node => 'parentValue' in node.meta && node.meta.parentValue === value
  )
}, [store])

// ✅ Store 구독: useStoreSubscribe 사용 (동기적, 깜빡임 없음)
const hasChildren = useStoreSubscribe(store, (s) => {
  const groups = s.getNodesByRole('group')
  return groups.some(
    node => 'parentValue' in node.meta && node.meta.parentValue === value
  )
})

// ✅ 옵션/아이템 등록: NodeStore meta 사용 (무한 렌더링 방지)
const { ref, domId } = useNode<ComponentRole, OptionMeta>({
  role: 'option',
  id: optionId,
  meta: { value, label, disabled }, // useNode 내부에서 안정적 등록/해제
})

// ✅ ARIA domId: useStoreSubscribe로 동적 구독
const listboxDomId = useStoreSubscribe(
  store,
  (s) => s.getNode(comboboxId, 'listbox')?.domId ?? null,
)
return <input aria-controls={listboxDomId ?? undefined} />
```
