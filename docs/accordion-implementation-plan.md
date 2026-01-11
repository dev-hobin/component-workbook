# Accordion 컴포넌트 구현 계획

## 1. 요구사항 정리

### W3C APG 접근성 요구사항

**키보드**
- `Enter` / `Space`: 포커스된 트리거 토글
- `Tab`: 다음 포커스 가능한 요소로 이동
- `ArrowDown` / `ArrowUp`: 트리거 간 포커스 이동 (optional)
- `Home` / `End`: 첫/마지막 트리거로 포커스 (optional)

**ARIA**
- 트리거: `aria-expanded`, `aria-controls`, `aria-disabled`
- 트리거를 감싸는 heading 요소 (h3 등)
- 콘텐츠: `role="region"`, `aria-labelledby`

### 컴포넌트 구조 (Ark UI 기반)

```tsx
<Accordion.Root>
  <Accordion.Item value="item-1">
    <Accordion.ItemTrigger>
      <Accordion.ItemIndicator />
      Trigger 1
    </Accordion.ItemTrigger>
    <Accordion.ItemContent>
      Content 1
    </Accordion.ItemContent>
  </Accordion.Item>
</Accordion.Root>
```

### Props 설계

**Root**

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `value` | `string[]` | - | 확장된 아이템들 (controlled) |
| `defaultValue` | `string[]` | `[]` | 초기 확장 아이템들 |
| `onValueChange` | `(value: string[]) => void` | - | 값 변경 콜백 |
| `multiple` | `boolean` | `false` | 다중 확장 허용 |
| `collapsible` | `boolean` | `true` | 모두 닫기 허용 |
| `disabled` | `boolean` | `false` | 전체 비활성화 |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | 방향 |

**Item**

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `value` | `string` | 필수 | 아이템 식별자 |
| `disabled` | `boolean` | `false` | 개별 비활성화 |

**ItemContent**

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `lazyMount` | `boolean` | `false` | 최초 확장 시까지 렌더링 지연 |
| `unmountOnExit` | `boolean` | `false` | 닫힐 때 언마운트 |

---

## 2. 아키텍처 설계

### 상태 관리
- `controlled-machine` 라이브러리 사용
- `@radix-ui/react-use-controllable-state`로 controlled/uncontrolled 지원

### 노드 추적
- `NodeStore` primitives 사용
- Role: `'trigger'` | `'content'`
- 트리거-콘텐츠 간 id 연결 (`aria-controls`, `aria-labelledby`)

### 애니메이션
- `usePresence` 훅 사용
- `transitionState`: `'starting'` | `'idle'` | `'ending'`
- CSS transition 완료 감지로 unmount 타이밍 제어

### Context 구조

```
AccordionContext (Root)
├── value, send, store, disabled, orientation
│
└── ItemContext (Item)
    └── itemId, isDisabled, isExpanded
```

---

## 3. 파일 구조

```
src/components/accordion/
├── machine.ts      # 상태 머신
└── index.tsx       # 컴포넌트
```

---

## 4. Machine 설계

### Input

```ts
type AccordionInput = {
  value: string[]
  multiple: boolean
  collapsible: boolean
  onValueChange: (value: string[]) => void
}
```

### Events

```ts
type AccordionEvents =
  | { type: 'TOGGLE'; itemId: string }
  | { type: 'EXPAND'; itemId: string }
  | { type: 'COLLAPSE'; itemId: string }
```

### Computed

```ts
type AccordionComputed = {
  expandedSet: Set<string>
}
```

### 로직
- `TOGGLE`: expanded면 collapse, 아니면 expand
- `EXPAND`: multiple이면 추가, 아니면 교체
- `COLLAPSE`: collapsible이거나 다른 item이 있으면 제거

---

## 5. 컴포넌트별 구현

### Root
- `NodeStoreProvider` 래핑
- `useControllableState`로 value 관리
- `useMachine`으로 machine 연결
- 키보드 핸들러 (Arrow, Home, End)
- `AccordionContext.Provider`

### Item
- `useNode`로 등록 (role 없이 id만)
- `ItemContext.Provider`로 itemId, disabled, expanded 제공
- `data-state="open|closed"`, `data-disabled`

### ItemTrigger
- `useNode`로 등록 (role: 'trigger')
- `useStoreSubscribe`로 content id 구독 → `aria-controls`
- heading 요소로 래핑
- `aria-expanded`, `aria-disabled`
- 클릭 → `send('TOGGLE', { itemId })`
- `data-state`, `data-disabled`

### ItemContent
- `useNode`로 등록 (role: 'content')
- `useStoreSubscribe`로 trigger id 구독 → `aria-labelledby`
- `usePresence`로 애니메이션 상태 관리
- `lazyMount`: 한 번도 열린 적 없으면 렌더링 안 함
- `unmountOnExit`: 닫히고 transition 끝나면 언마운트
- `role="region"`, `data-state`, `data-transition`

### ItemIndicator
- 순수 래퍼 컴포넌트
- `data-state="open|closed"` 제공
- 아이콘 회전 등 스타일링용

---

## 6. 구현 순서

1. `machine.ts` 작성
2. `index.tsx` - Types, Context 정의
3. `Root` 구현
4. `Item` 구현
5. `ItemTrigger` 구현
6. `ItemContent` 구현 (usePresence 포함)
7. `ItemIndicator` 구현
8. Export

---

## 7. 프리모템 (Pre-mortem)

> 이 구현이 실패했다고 가정할 때, 가능한 실패 원인들

### 높은 위험도

#### 1. usePresence와 lazyMount/unmountOnExit 조합 버그
- **증상**: 애니메이션이 끊기거나, 콘텐츠가 갑자기 사라지거나, 아예 안 보임
- **원인**: `usePresence`의 `isPresent`와 `lazyMount` 상태 간의 타이밍 불일치
- **예방**:
  - `wasEverExpanded` 상태를 별도로 추적
  - `isPresent`와 `shouldRender` 로직을 명확히 분리
  - 테스트 케이스: 빠른 토글, 초기 expanded 상태, transition 중 토글

#### 2. NodeStore 등록 타이밍 이슈
- **증상**: `aria-controls`나 `aria-labelledby`가 null, 콘솔에 warning
- **원인**: Content가 lazyMount로 아직 렌더링 안 됐는데 Trigger가 content id를 참조
- **예방**:
  - `aria-controls`에 null 허용 (undefined로 제거)
  - `useStoreSubscribe` 결과가 없을 때 graceful 처리

#### 3. 키보드 포커스 관리 복잡성
- **증상**: Arrow 키로 이동 시 disabled item 건너뛰기 실패, 포커스 순서 꼬임
- **원인**: DOM 순서와 논리적 순서 불일치, disabled 상태 변경 시 동기화 문제
- **예방**:
  - `getEnabledItemIds()`를 DOM 순서 기반으로 구현
  - 포커스 이동은 직접 DOM element.focus() 호출

### 중간 위험도

#### 4. multiple=false + collapsible=false 엣지케이스
- **증상**: 아무것도 선택 안 된 상태에서 시작하면 닫을 수 없는 상태 진입 불가
- **원인**: 초기 상태 처리 누락
- **예방**:
  - 초기 value가 비어있으면 첫 번째 item 자동 expand 고려
  - 또는 문서에 "defaultValue 필수" 명시

#### 5. Controlled/Uncontrolled 모드 전환
- **증상**: 런타임에 value prop이 undefined에서 값으로 바뀌면 경고 또는 버그
- **원인**: React의 controlled/uncontrolled 전환 감지
- **예방**:
  - `useControllableState`가 이를 처리하는지 확인
  - 또는 초기 모드 고정

#### 6. heading 레벨 하드코딩
- **증상**: 페이지 구조에 따라 h3가 접근성 위반
- **원인**: heading 레벨을 h3로 고정
- **예방**:
  - `asChild` 패턴 또는 `headingLevel` prop 추가 고려
  - 또는 heading 없이 button만 제공하고 사용자가 감싸도록

### 낮은 위험도

#### 7. orientation="horizontal" 미구현
- **증상**: horizontal에서 Arrow Left/Right가 동작 안 함
- **원인**: vertical 기준으로만 키보드 핸들러 구현
- **예방**:
  - orientation에 따라 Arrow 키 매핑 분기
  - 또는 MVP에서 vertical만 지원하고 문서화

#### 8. 스타일링 책임 불명확
- **증상**: 애니메이션이 안 되거나 레이아웃 깨짐
- **원인**: CSS grid 트릭 vs usePresence 역할 혼동
- **예방**:
  - 문서에 "height 애니메이션은 사용자가 CSS로 구현" 명시
  - 예제 코드 제공

---

## 8. 성공 기준

- [ ] 모든 W3C APG 키보드 요구사항 충족
- [ ] 모든 ARIA 속성 올바르게 적용
- [ ] controlled/uncontrolled 모드 정상 동작
- [ ] multiple, collapsible 조합 정상 동작
- [ ] lazyMount, unmountOnExit 정상 동작
- [ ] 빠른 연속 토글에도 애니메이션 깨지지 않음
- [ ] disabled 상태에서 상호작용 차단
