# Menu 구현 계획

## 0. 핵심 원칙 확인

| 원칙 | 적용 |
|------|------|
| **Machine = 선언적 명세서** | 모든 키보드/포커스 로직을 Machine에 |
| **DOM helpers 패턴** | 포커스 이동은 Shell에서 처리 |
| **stopPropagation 금지** | DismissableLayer로 Escape 처리 |
| **전역 레이어 스택** | 중첩 메뉴 각각 DismissableLayer 사용 |

### 컴포넌트 유형

**레이어 컴포넌트** ✅
- Escape로 닫힘
- 중첩 가능 (무한)
- 오버레이/팝업 형태

---

## 1. 요구사항

### 기능 요구사항
- [x] 메뉴 버튼 클릭/키보드로 메뉴 열기
- [x] 메뉴 아이템 선택 시 콜백 호출
- [x] 서브메뉴 무한 중첩 지원
- [x] 메뉴 외부 클릭 시 닫기
- [x] Escape로 닫기 (중첩 시 현재 레벨만)
- [x] 문자 검색 (A-Z 입력 시 해당 문자로 시작하는 아이템으로 이동)

### 접근성 요구사항 (W3C APG)

**키보드 - Menu Button**
| 키 | 동작 | 필수 |
|----|------|------|
| `Enter` | 메뉴 열고 첫 아이템 포커스 | O |
| `Space` | 메뉴 열고 첫 아이템 포커스 | O |
| `ArrowDown` | 메뉴 열고 첫 아이템 포커스 | O |
| `ArrowUp` | 메뉴 열고 마지막 아이템 포커스 | O |

**키보드 - Menu Items**
| 키 | 동작 | 필수 |
|----|------|------|
| `Enter` | 아이템 활성화 (onSelect) | O |
| `Space` | 아이템 활성화 (onSelect) | O |
| `Escape` | 메뉴 닫고 트리거로 포커스 복귀 | O |
| `ArrowUp` | 이전 아이템 포커스 (순환) | O |
| `ArrowDown` | 다음 아이템 포커스 (순환) | O |
| `Home` | 첫 번째 아이템 포커스 | O |
| `End` | 마지막 아이템 포커스 | O |
| `A-Z, a-z` | 해당 문자로 시작하는 아이템 포커스 | |

**키보드 - Submenu**
| 키 | 동작 | 필수 |
|----|------|------|
| `ArrowRight` | 서브메뉴 열고 첫 아이템 포커스 | O |
| `ArrowLeft` | 서브메뉴 닫고 부모 아이템으로 포커스 복귀 | O |
| `Enter` | 서브메뉴 열고 첫 아이템 포커스 | O |

**ARIA**
| 속성 | 적용 대상 | 값 |
|------|----------|-----|
| `role="menu"` | Content | 메뉴 컨테이너 |
| `role="menuitem"` | Item | 메뉴 아이템 |
| `role="none"` | Item wrapper (li) | 시맨틱 숨김 |
| `aria-haspopup` | Trigger, SubTrigger | "menu" |
| `aria-expanded` | Trigger, SubTrigger | true/false |
| `aria-controls` | Trigger, SubTrigger | content id |
| `aria-labelledby` | Content | trigger id |
| `tabindex="-1"` | Item | 탭 순서에서 제외, 포커스 가능 |

---

## 2. 컴포넌트 구조

### 사용 예시

**기본 메뉴**
```tsx
<Menu.Root>
  <Menu.Trigger>Actions</Menu.Trigger>
  <Menu.Portal>
    <Menu.Content>
      <Menu.Item onSelect={() => {}}>Edit</Menu.Item>
      <Menu.Item onSelect={() => {}}>Delete</Menu.Item>
      <Menu.Separator />
      <Menu.Item disabled>Disabled</Menu.Item>
    </Menu.Content>
  </Menu.Portal>
</Menu.Root>
```

**중첩 서브메뉴**
```tsx
<Menu.Root>
  <Menu.Trigger>Actions</Menu.Trigger>
  <Menu.Portal>
    <Menu.Content>
      <Menu.Item>Edit</Menu.Item>

      {/* 서브메뉴 */}
      <Menu.Sub>
        <Menu.SubTrigger>Share</Menu.SubTrigger>
        <Menu.Portal>
          <Menu.SubContent>
            <Menu.Item>Email</Menu.Item>
            <Menu.Item>Twitter</Menu.Item>

            {/* 무한 중첩 가능 */}
            <Menu.Sub>
              <Menu.SubTrigger>More...</Menu.SubTrigger>
              <Menu.Portal>
                <Menu.SubContent>
                  <Menu.Item>LinkedIn</Menu.Item>
                </Menu.SubContent>
              </Menu.Portal>
            </Menu.Sub>
          </Menu.SubContent>
        </Menu.Portal>
      </Menu.Sub>
    </Menu.Content>
  </Menu.Portal>
</Menu.Root>
```

### Props

**Root**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `open` | `boolean` | - | | Controlled 열림 상태 |
| `defaultOpen` | `boolean` | `false` | | 기본 열림 상태 |
| `onOpenChange` | `(open: boolean) => void` | - | | 상태 변경 콜백 |

**Trigger**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `disabled` | `boolean` | `false` | | 비활성화 |

**Content**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `loop` | `boolean` | `true` | | 포커스 순환 |
| `onCloseAutoFocus` | `(e: Event) => void` | - | | 닫힐 때 포커스 전 콜백 |

**Item**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `disabled` | `boolean` | `false` | | 비활성화 |
| `onSelect` | `() => void` | - | | 선택 시 콜백 |
| `textValue` | `string` | - | | 문자 검색용 텍스트 |

**Sub**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `open` | `boolean` | - | | Controlled 열림 상태 |
| `defaultOpen` | `boolean` | `false` | | 기본 열림 상태 |
| `onOpenChange` | `(open: boolean) => void` | - | | 상태 변경 콜백 |

**SubTrigger**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `disabled` | `boolean` | `false` | | 비활성화 |
| `textValue` | `string` | - | | 문자 검색용 텍스트 |

**SubContent**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `loop` | `boolean` | `true` | | 포커스 순환 |

### Props 위치 결정

| Prop | 위치 | 이유 |
|------|------|------|
| `open/onOpenChange` | Root, Sub | 해당 레벨의 상태 관리 |
| `loop` | Content, SubContent | 해당 메뉴의 네비게이션 로직 |
| `disabled` | Item, SubTrigger | 개별 요소 상태 |
| `onSelect` | Item | 개별 아이템 동작 |

---

## 3. Data 속성 매트릭스

| 컴포넌트 | data-part | data-state | data-disabled | data-highlighted |
|---------|-----------|------------|---------------|------------------|
| Trigger | "trigger" | open/closed | ✅ | - |
| Content | "content" | open/closed | - | - |
| Item | "item" | - | ✅ | ✅ |
| Separator | "separator" | - | - | - |
| SubTrigger | "sub-trigger" | open/closed | ✅ | ✅ |
| SubContent | "sub-content" | open/closed | - | - |

> `data-highlighted`: 현재 포커스된 아이템 (키보드/호버로 하이라이트)

---

## 4. 외부 의존성 API

### 라이브러리 1: controlled-machine
```ts
import { createMachine } from 'controlled-machine'

const machine = createMachine<{
  input: MenuInput
  events: MenuEvents
  computed: MenuComputed
  actions: MenuActions
}>({
  computed: { ... },
  on: { ... },
  actions: { ... },
})
```

### 라이브러리 2: @floating-ui/dom
```ts
import { computePosition, flip, shift, offset } from '@floating-ui/dom'

// Content 위치 계산
computePosition(triggerElement, contentElement, {
  placement: 'bottom-start',
  middleware: [offset(4), flip(), shift()],
})

// SubContent 위치 계산 (오른쪽으로)
computePosition(subTriggerElement, subContentElement, {
  placement: 'right-start',
  middleware: [offset(4), flip(), shift()],
})
```

### 프리미티브 1: DismissableLayer
```tsx
// 각 Content, SubContent에서 사용
<DismissableLayer
  isActive={open}
  dismissOnEscape={true}
  onEscapeKeyDown={handleEscape}
  onPointerDownOutside={handleOutsideClick}
  contentRef={contentRef}
>
  {children}
</DismissableLayer>
```

**중첩 메뉴에서의 동작:**
- 각 메뉴 레벨이 독립적인 DismissableLayer
- Escape: 현재 레벨만 닫힘 (topmost)
- 외부 클릭: 모든 메뉴 닫힘 (Root의 onOpenChange(false))

---

## 5. 상태 관리

### Focus vs Selection 분석

| 항목 | 설명 |
|------|------|
| Focus | 현재 하이라이트된 아이템 (키보드/마우스) |
| Selection | 없음 (메뉴는 선택 개념 없음, 활성화만) |

**Focus ≠ Selection 패턴 적용:**
- `highlightedId` 상태 별도 추적
- 마우스 호버, 키보드 이동 시 업데이트
- DOM focus는 Content/SubContent에, 시각적 하이라이트는 Item에

### Machine 설계

> 중첩 메뉴는 각 레벨이 독립 Machine 인스턴스

**Input**
```ts
type MenuInput = {
  // 핵심 상태
  open: boolean
  onOpenChange: (open: boolean) => void

  // 하이라이트 추적
  highlightedId: string | null
  onHighlightedIdChange: (id: string | null) => void

  // 옵션
  loop: boolean

  // 지연 헬퍼
  getItemIds: () => string[]          // 모든 아이템 ID (순서대로)
  getEnabledItemIds: () => string[]   // 비활성화 제외
  getItemTextValue: (id: string) => string  // 문자 검색용

  // DOM helpers
  dom: MenuDom
}

type MenuDom = {
  focusContent: () => void           // Content에 포커스
  focusTrigger: () => void           // Trigger로 포커스 복귀
}
```

**Events**
```ts
type MenuEvents = {
  // 열기/닫기
  OPEN: { focusFirst?: boolean }      // true면 첫 아이템, false면 마지막
  CLOSE: undefined

  // 아이템 하이라이트
  HIGHLIGHT: { id: string }
  HIGHLIGHT_FIRST: undefined
  HIGHLIGHT_LAST: undefined
  HIGHLIGHT_NEXT: undefined
  HIGHLIGHT_PREV: undefined

  // 문자 검색
  TYPE_CHARACTER: { character: string }

  // 아이템 활성화
  ACTIVATE_HIGHLIGHTED: undefined

  // 서브메뉴 관련 (SubTrigger에서 발송)
  OPEN_SUBMENU: { id: string }
  CLOSE_SUBMENU: undefined
}
```

**Computed**
```ts
type Computed = {
  isOpen: boolean
  highlightedId: string | null
  firstItemId: string | null
  lastItemId: string | null
  nextItemId: string | null
  prevItemId: string | null
}
```

**Actions**
```ts
type Actions =
  | 'open'
  | 'close'
  | 'highlightFirst'
  | 'highlightLast'
  | 'highlightNext'
  | 'highlightPrev'
  | 'highlightById'
  | 'highlightByCharacter'
  | 'activateHighlighted'
```

**Effects**
```ts
effects: [
  {
    // 열릴 때 Content에 포커스
    watch: (context) => context.open,
    enter: (context) => {
      context.dom.focusContent()

      return () => {
        context.dom.focusTrigger()
      }
    },
  },
],
```

**Event Handlers (on)**
```ts
on: {
  // 열기: focusFirst 옵션에 따라 첫/마지막 아이템 하이라이트
  OPEN: [
    { when: (ctx, { focusFirst }) => focusFirst !== false, do: ['open', 'highlightFirst'] },
    { do: ['open', 'highlightLast'] },
  ],

  CLOSE: 'close',

  // 하이라이트 이동
  HIGHLIGHT: 'highlightById',
  HIGHLIGHT_FIRST: 'highlightFirst',
  HIGHLIGHT_LAST: 'highlightLast',
  HIGHLIGHT_NEXT: [
    { when: (ctx) => ctx.loop || ctx.highlightedId !== lastId, do: 'highlightNext' },
  ],
  HIGHLIGHT_PREV: [
    { when: (ctx) => ctx.loop || ctx.highlightedId !== firstId, do: 'highlightPrev' },
  ],

  // 문자 검색
  TYPE_CHARACTER: 'highlightByCharacter',

  // 활성화 (onSelect 호출 + 메뉴 닫기는 Shell에서)
  ACTIVATE_HIGHLIGHTED: 'activateHighlighted',
}
```

### Machine과 Shell의 역할 분리

| 역할 | Machine | Shell |
|------|---------|-------|
| open/close 로직 | ✅ | ❌ |
| 하이라이트 이동 계산 | ✅ | ❌ |
| 문자 검색 로직 | ✅ | ❌ |
| 키보드 이벤트 리스닝 | ❌ | ✅ |
| DOM 포커스 실행 | ❌ | ✅ (DOM helpers) |
| 위치 계산 (floating-ui) | ❌ | ✅ |
| DismissableLayer 래핑 | ❌ | ✅ |

### Context 구조

```
MenuContext (Root)
├── open, send, computed
├── triggerId, contentId
├── triggerRef, contentRef
│
└── MenuItemContext (각 Item/SubTrigger)
    └── itemId, disabled, highlighted
```

**서브메뉴 구조:**
```
MenuContext (Root)
└── SubContext (Sub)
    ├── open, send, computed  // 별도 Machine 인스턴스
    ├── subTriggerId, subContentId
    └── parentMenuContext     // 부모 메뉴 참조 (ArrowLeft 처리)
```

---

## 6. 콘텐츠 전환 전략

### 전환 방식

| 컴포넌트 | 전환 방식 | 이유 |
|----------|----------|------|
| Content | 애니메이션 | 메뉴 진입/퇴장 시각화 |
| SubContent | 애니메이션 | 서브메뉴 슬라이드 효과 |

### usePresence 활용
```tsx
const { isPresent, transitionState } = usePresence({
  isVisible: open,
  resolveElement: () => contentRef.current,
})

<div
  data-state={open ? 'open' : 'closed'}
  data-transition={transitionState}
/>
```

---

## 7. 파일 구조

```
src/components/menu/
├── machine.ts          # 상태 머신
├── index.tsx           # 컴포넌트 (primitives)
├── styled.tsx          # 스타일 적용 버전
└── __tests__/
    └── menu.test.tsx
```

---

## 8. 테스트 계획

### 테스트 환경 요구사항
- [x] jsdom `getAnimations` 폴리필
- [x] `@testing-library/user-event` 설치
- [x] `afterEach` cleanup 설정

### 테스트 케이스

**렌더링**
- [ ] 모든 컴포넌트 렌더링
- [ ] data-part 속성 확인
- [ ] data-state 속성 확인

**메뉴 열기/닫기**
- [ ] Trigger 클릭으로 열기
- [ ] Enter/Space로 열기 (첫 아이템 포커스)
- [ ] ArrowDown으로 열기 (첫 아이템 포커스)
- [ ] ArrowUp으로 열기 (마지막 아이템 포커스)
- [ ] Escape로 닫기
- [ ] 외부 클릭으로 닫기
- [ ] 아이템 선택 시 닫기

**키보드 네비게이션**
- [ ] ArrowDown으로 다음 아이템
- [ ] ArrowUp으로 이전 아이템
- [ ] Home으로 첫 아이템
- [ ] End로 마지막 아이템
- [ ] 포커스 순환 (loop=true)
- [ ] disabled 아이템 건너뛰기
- [ ] 문자 검색 (A-Z)

**서브메뉴**
- [ ] ArrowRight로 서브메뉴 열기
- [ ] Enter로 서브메뉴 열기
- [ ] ArrowLeft로 서브메뉴 닫기 + 부모로 포커스
- [ ] Escape로 서브메뉴만 닫기 (부모는 열려있음)
- [ ] 3단계 이상 중첩 테스트

**Controlled 모드**
- [ ] open prop으로 제어
- [ ] onOpenChange 콜백

**ARIA**
- [ ] role="menu" on Content
- [ ] role="menuitem" on Item
- [ ] aria-haspopup on Trigger/SubTrigger
- [ ] aria-expanded 상태
- [ ] aria-controls ↔ id 연결
- [ ] aria-labelledby 연결
- [ ] tabindex="-1" on Items

**레이어 컴포넌트 전용**
- [ ] **중첩 테스트: Escape가 topmost 서브메뉴만 닫는지**
- [ ] **중첩 테스트: 외부 클릭 시 모든 메뉴 닫힘**
- [ ] Focus trap 없음 (메뉴는 Tab으로 닫힘)
- [ ] 닫을 때 Trigger로 포커스 복귀

---

## 9. 구현 순서

1. [ ] `machine.ts` - 상태 머신
2. [ ] `index.tsx` - Types, Context 정의
3. [ ] `Root` 구현 (machine 연결)
4. [ ] `Trigger` 구현 (키보드 이벤트 → machine)
5. [ ] `Portal` 구현
6. [ ] `Content` 구현 (DismissableLayer, 키보드 이벤트)
7. [ ] `Item` 구현 (하이라이트, onSelect)
8. [ ] `Separator` 구현
9. [ ] `Sub`, `SubTrigger`, `SubContent` 구현 (중첩 Machine)
10. [ ] `styled.tsx` 작성
11. [ ] 테스트 작성
12. [ ] 예제 페이지 작성

---

## 10. 프리모템 (Pre-mortem)

### 높은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| 서브메뉴 포커스 관리 | ArrowLeft로 부모 복귀 안됨 | parentMenuContext로 부모 참조 |
| 중첩 Escape 처리 | 모든 메뉴가 닫힘 | DismissableLayer 각 레벨에 적용 |
| 하이라이트 동기화 | 마우스/키보드 하이라이트 불일치 | 단일 highlightedId 상태 |

### 중간 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| 위치 계산 오류 | 서브메뉴가 화면 밖에 | floating-ui flip/shift 적용 |
| 문자 검색 타이밍 | 빠른 타이핑 시 검색 안됨 | debounce 또는 버퍼 구현 |
| 외부 클릭 처리 | 서브메뉴 클릭 시 닫힘 | 이벤트 타겟 검증 |

### 낮은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| aria-controls 타이밍 | id 연결 시 null | nullable 처리 |

---

## 11. 성공 기준

- [ ] 모든 테스트 통과
- [ ] W3C APG 키보드 요구사항 충족
- [ ] ARIA 속성 올바르게 적용
- [ ] controlled/uncontrolled 모드 동작
- [ ] 3단계 이상 서브메뉴 중첩 정상 동작

**레이어 컴포넌트 추가 기준:**
- [ ] 중첩 시 Escape가 topmost만 닫음
- [ ] stopPropagation 미사용
- [ ] Machine에 타이밍 로직 없음 (DOM helpers 사용)

---

## 부록: 중첩 메뉴 상태 흐름

```
[초기 상태]
Root.open = false

[Trigger 클릭]
Root.open = true
Root.highlightedId = firstItemId
→ DismissableLayer 스택: [Root]

[SubTrigger에서 ArrowRight]
Sub.open = true
Sub.highlightedId = firstSubItemId
→ DismissableLayer 스택: [Root, Sub]

[Sub에서 Escape]
→ isTopmost(Sub) = true
→ Sub.open = false, 포커스 → SubTrigger
→ DismissableLayer 스택: [Root]

[Root에서 Escape]
→ isTopmost(Root) = true
→ Root.open = false, 포커스 → Trigger
→ DismissableLayer 스택: []
```

---

## 12. 포스트모템 (Post-mortem)

### 발생한 문제들

#### 1. SubTrigger 클릭 시 메뉴 깜빡임 (flickering)

**증상:**
- SubTrigger를 클릭해서 서브메뉴를 열거나 닫으려 하면 전체 메뉴가 깜빡이며 재오픈

**원인:**
- DismissableLayer의 `pointerdown` (capture phase) → `excludeRefs` 체크 → `CLOSE_ALL` → `click` 순서
- SubTrigger가 `excludeRefs`에 포함되지 않아 "외부 클릭"으로 인식됨

**초기 시도 (실패):**
```tsx
// useLayoutEffect에서 excludeRefs 스냅샷 생성
useLayoutEffect(() => {
  const refs = []
  for (const node of store.getNodesByRole('sub-trigger')) {
    refs.push({ current: node.element })  // ❌ 스냅샷
  }
  excludeRefsRef.current = refs
}, [store, openedPath])
```
→ 타이밍 이슈: SubTrigger 등록 전에 excludeRefs가 이미 계산됨

**해결:**
```tsx
// onPointerDownOutside에서 store 실시간 조회
const handlePointerDownOutside = useCallback(
  (event: PointerEvent) => {
    const target = event.target as Node

    // ✅ 클릭 시점에 실시간 조회
    const subTriggerNodes = store.getNodesByRole('sub-trigger')
    for (const node of subTriggerNodes) {
      if (node.element?.contains(target)) return
    }

    send('CLOSE_ALL')
  },
  [send, store],
)
```

#### 2. 수동 ID 생성 및 Ref 관리의 복잡성

**증상:**
- `const contentId = \`menu-content-${menuId}\`` 같은 수동 ID 생성
- `items`, `itemElements`, `contentRefs` 등 여러 Map을 수동 관리
- `registerItem`, `unregisterItem` 등 등록/해제 함수 중복

**원인:**
- primitives의 `useNode`/`NodeStore` 패턴을 인지하지 못함
- 기존 컴포넌트 구현 방식을 그대로 따라감

**해결:**
- `NodeStoreProvider`로 Root 감싸기
- 각 컴포넌트에서 `useNode` 사용
- Machine helper 함수들이 store를 직접 조회

### 핵심 교훈

#### NodeStore는 "실시간 요소 추적"을 위해 만들어졌다

| 상황 | 수동 Map/Ref | NodeStore |
|------|-------------|-----------|
| 새 요소 등록 | useLayoutEffect 필요 | useNode가 자동 처리 |
| 요소 조회 타이밍 | 스냅샷 → 타이밍 이슈 | 실시간 조회 가능 |
| ID 생성 | 수동 (충돌 위험) | useId() 자동 생성 |
| 메타데이터 관리 | 별도 Map 필요 | meta 옵션으로 통합 |

#### excludeRefs 스냅샷 vs 실시간 조회

```tsx
// ❌ 스냅샷 방식 - 타이밍 문제
const excludeRefs = [{ current: element }]  // 렌더 시점에 고정

// ✅ 실시간 조회 - 항상 최신
const handleOutside = (e) => {
  const nodes = store.getNodesByRole('sub-trigger')  // 클릭 시점에 조회
  for (const node of nodes) {
    if (node.element?.contains(e.target)) return
  }
}
```

### 개선된 구현 패턴

#### Before (수동 관리)
```tsx
// Root에서 여러 Map 관리
const [items] = useState(() => new Map<ItemId, ItemMeta>())
const [itemElements] = useState(() => new Map<ItemId, HTMLElement>())
const contentRefs = useRef(new Map<MenuId, RefObject<HTMLDivElement>>())

const registerItem = useCallback((id, meta) => items.set(id, meta), [items])
const unregisterItem = useCallback((id) => items.delete(id), [items])
```

#### After (NodeStore 활용)
```tsx
// Root
<NodeStoreProvider>
  <RootImpl>{children}</RootImpl>
</NodeStoreProvider>

// Item
const { id, ref } = useNode({
  role: 'item',
  meta: { menuId, disabled, textValue, onSelect }
})

// Machine helper
const getEnabledItemIds = (menuId) => {
  return store.filterNodesByRolesAndMeta(
    ['item', 'sub-trigger'],
    (meta) => meta.menuId === menuId && !meta.disabled
  ).map(node => node.id)
}
```

### 체크리스트 (향후 컴포넌트 구현 시)

- [ ] **primitives 먼저 확인**: useNode, NodeStore, ParentProvider 활용 가능성 검토
- [ ] **수동 Map 대신 NodeStore**: 요소 추적이 필요하면 NodeStore 사용
- [ ] **스냅샷 vs 실시간**: 이벤트 핸들러에서 요소 조회 시 store 실시간 조회
- [ ] **excludeRefs 주의**: DismissableLayer의 excludeRefs에 동적 요소 포함 시 실시간 체크 필요
