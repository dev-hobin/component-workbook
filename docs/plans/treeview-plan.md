# TreeView 구현 계획

## 0. 핵심 원칙 체크

| 원칙 | 적용 |
|------|------|
| **Machine = 선언적 명세서** | TreeView의 모든 키보드/선택 로직을 Machine에 |
| **DOM helpers 패턴** | 포커스 이동은 DOM helper로 |
| **stopPropagation 금지** | 이벤트 흐름 유지 |
| **NodeStore 실시간 쿼리** | 동적 트리 구조 조회에 실시간 쿼리 사용 |

### 컴포넌트 유형
- **인라인 컴포넌트**: 페이지 흐름 내 존재, DismissableLayer 불필요
- 중첩 구조이지만 "레이어"가 아닌 "계층적 데이터 구조"

---

## 1. 요구사항

### 기능 요구사항
- [ ] 계층적 트리 구조 표시
- [ ] 부모 노드 확장/축소
- [ ] 단일 선택 모드 (single-select)
- [ ] 다중 선택 모드 (multi-select) - 선택적
- [ ] 키보드 네비게이션
- [ ] 문자 검색 (type-ahead)

### 접근성 요구사항 (W3C APG)

**키보드**
| 키 | 동작 | 필수 |
|----|------|------|
| `ArrowRight` | 닫힌 노드 열기 / 열린 노드의 첫 자식으로 이동 / 끝 노드에서는 무동작 | O |
| `ArrowLeft` | 열린 노드 닫기 / 부모 노드로 이동 / 닫힌 루트 노드에서는 무동작 | O |
| `ArrowDown` | 다음 포커스 가능한 노드로 이동 (확장/축소 없음) | O |
| `ArrowUp` | 이전 포커스 가능한 노드로 이동 (확장/축소 없음) | O |
| `Home` | 첫 번째 노드로 이동 | O |
| `End` | 마지막 보이는 노드로 이동 | O |
| `Enter` | 노드 활성화 (부모: 토글, 끝 노드: 선택) | O |
| `Space` | (multi-select) 선택 토글 | 조건부 |
| `A-Z, a-z` | 문자로 시작하는 노드로 이동 | O |
| `*` | (선택적) 같은 레벨의 모든 형제 노드 확장 | |

**ARIA**
| 속성 | 적용 대상 | 값 |
|------|----------|-----|
| `role="tree"` | Root 컨테이너 | |
| `role="treeitem"` | 각 노드 | |
| `role="group"` | 자식 노드 컨테이너 | |
| `aria-expanded` | 부모 노드만 | `true` / `false` |
| `aria-selected` | 모든 노드 | `true` / `false` |
| `aria-multiselectable` | Root (multi-select 시) | `true` |
| `aria-label` / `aria-labelledby` | Root | |
| `tabindex` | 포커스된 노드: `0`, 나머지: `-1` | roving tabindex |

---

## 2. 컴포넌트 구조

### 사용 예시
```tsx
// 기본 사용
<Tree.Root>
  <Tree.Item value="1">
    <Tree.ItemLabel>Documents</Tree.ItemLabel>
    <Tree.ItemGroup>
      <Tree.Item value="1-1">
        <Tree.ItemLabel>Work</Tree.ItemLabel>
      </Tree.Item>
      <Tree.Item value="1-2">
        <Tree.ItemLabel>Personal</Tree.ItemLabel>
      </Tree.Item>
    </Tree.ItemGroup>
  </Tree.Item>
  <Tree.Item value="2">
    <Tree.ItemLabel>Downloads</Tree.ItemLabel>
  </Tree.Item>
</Tree.Root>

// 또는 데이터 기반 (렌더링은 사용자 책임)
const items = [
  { value: '1', label: 'Documents', children: [...] },
  { value: '2', label: 'Downloads' },
]
```

### Props

**Root**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `children` | `ReactNode` | | O | |
| `defaultExpandedValues` | `string[]` | `[]` | | 초기 확장 노드 |
| `expandedValues` | `string[]` | | | 제어 모드 확장 노드 |
| `onExpandedValuesChange` | `(values: string[]) => void` | | | |
| `defaultSelectedValues` | `string[]` | `[]` | | 초기 선택 노드 |
| `selectedValues` | `string[]` | | | 제어 모드 선택 노드 |
| `onSelectedValuesChange` | `(values: string[]) => void` | | | |
| `selectionMode` | `'single' \| 'multiple'` | `'single'` | | 선택 모드 |

**Item**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `value` | `string` | | O | 노드 고유 식별자 |
| `disabled` | `boolean` | `false` | | |
| `children` | `ReactNode` | | O | ItemLabel + ItemGroup |

**ItemLabel**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `children` | `ReactNode` | | O | 노드 레이블 |

**ItemGroup**
| Prop | Type | Default | 필수 | 설명 |
|------|------|---------|------|------|
| `children` | `ReactNode` | | O | 자식 Item들 |

### Props 위치 결정
| Prop | 위치 | 이유 |
|------|------|------|
| `expandedValues` | Root | Machine 로직에 필요 |
| `selectedValues` | Root | Machine 로직에 필요 |
| `selectionMode` | Root | Machine 로직에 필요 |
| `disabled` | Item | 해당 노드만 영향 |
| `value` | Item | 노드 식별 |

---

## 3. Data 속성 매트릭스

| 컴포넌트 | data-part | data-state | data-disabled | data-selected | data-depth |
|---------|-----------|------------|---------------|---------------|------------|
| Root | "tree" | - | - | - | - |
| Item | "item" | open/closed | ✅ | ✅ | ✅ (level) |
| ItemLabel | "label" | open/closed | ✅ | ✅ | - |
| ItemGroup | "group" | open/closed | - | - | - |

---

## 4. 외부 의존성 API

### NodeStore 사용

```ts
// Role 정의
type TreeRole = 'tree' | 'item' | 'label' | 'group'

// Meta 정의
type TreeItemMeta = {
  value: string
  disabled: boolean
  parentValue: string | null  // 부모 노드 value
  depth: number               // 깊이 (0부터 시작)
  hasChildren: boolean        // 자식 존재 여부
}

// 사용 패턴
const { ref, domId } = useNode<TreeRole, TreeItemMeta>({
  role: 'item',
  id: value,
  meta: { value, disabled, parentValue, depth, hasChildren },
})
```

### Primitives 체크
- [x] **NodeStore**: 트리 구조 추적, 실시간 쿼리
- [x] **useNode**: 자동 ID 생성, DOM ref 관리
- [x] **ParentProvider**: 부모-자식 관계 추적 (depth 계산용)
- [ ] **DismissableLayer**: 불필요 (인라인 컴포넌트)

---

## 5. 상태 관리

### Focus vs Selection 분석

| 상태 | 설명 | 추적 방식 |
|------|------|----------|
| **Focus (highlight)** | 키보드로 탐색 중인 노드 | `highlightedValue` |
| **Selection** | 실제 선택된 노드(들) | `selectedValues` |
| **Expanded** | 확장된 부모 노드들 | `expandedValues` |

> TreeView는 Focus ≠ Selection.
> - 화살표 키로 포커스 이동 시 선택은 변경되지 않음
> - Enter/Space로 명시적 선택

### Machine 설계

**Input**
```ts
type TreeInput = {
  // 확장 상태
  expandedValues: string[]
  onExpandedValuesChange: (values: string[]) => void

  // 선택 상태
  selectedValues: string[]
  onSelectedValuesChange: (values: string[]) => void

  // 하이라이트 (포커스)
  highlightedValue: string | null
  onHighlightedValueChange: (value: string | null) => void

  // 옵션
  selectionMode: 'single' | 'multiple'

  // 지연 헬퍼 (NodeStore에서 계산)
  getVisibleItemValues: () => string[]           // 보이는 노드만
  getItemMeta: (value: string) => TreeItemMeta | null
  getParentValue: (value: string) => string | null
  getChildValues: (value: string) => string[]    // 직계 자식
  getItemTextValue: (value: string) => string    // 문자 검색용

  // DOM helpers
  dom: TreeDom
}

type TreeDom = {
  focusItem: (value: string) => void
  focusTree: () => void
}
```

**Events**
```ts
type TreeEvents = {
  // 확장/축소
  EXPAND: { value: string }
  COLLAPSE: { value: string }
  TOGGLE_EXPAND: { value: string }
  EXPAND_SIBLINGS: undefined  // * 키

  // 선택
  SELECT: { value: string }
  TOGGLE_SELECT: { value: string }  // multi-select

  // 하이라이트 이동
  HIGHLIGHT: { value: string }
  HIGHLIGHT_NEXT: undefined      // ArrowDown
  HIGHLIGHT_PREV: undefined      // ArrowUp
  HIGHLIGHT_FIRST: undefined     // Home
  HIGHLIGHT_LAST: undefined      // End
  HIGHLIGHT_PARENT: undefined    // ArrowLeft (부모로)
  HIGHLIGHT_CHILD: undefined     // ArrowRight (첫 자식으로)

  // 문자 검색
  TYPE_CHARACTER: { character: string }

  // 복합 액션 (키보드 매핑용)
  ARROW_RIGHT: undefined  // 닫힘 → 열기, 열림 → 자식으로
  ARROW_LEFT: undefined   // 열림 → 닫기, 닫힘 → 부모로
  ACTIVATE: undefined     // Enter: 부모면 토글, 끝노드면 선택
}
```

**Computed**
```ts
type TreeComputed = {
  visibleValues: string[]
  highlightedValue: string | null
  isMultiSelect: boolean
}
```

**Actions**
```ts
type TreeActions =
  | 'noop'
  | 'expand'
  | 'collapse'
  | 'toggleExpand'
  | 'expandSiblings'
  | 'select'
  | 'toggleSelect'
  | 'highlightById'
  | 'highlightNext'
  | 'highlightPrev'
  | 'highlightFirst'
  | 'highlightLast'
  | 'highlightParent'
  | 'highlightChild'
  | 'highlightByCharacter'
  | 'handleArrowRight'
  | 'handleArrowLeft'
  | 'handleActivate'
```

**Effects**
```ts
effects: [
  {
    // 하이라이트 변경 시 DOM 포커스
    watch: (ctx) => ctx.highlightedValue,
    change: (ctx) => {
      if (ctx.highlightedValue) {
        ctx.dom.focusItem(ctx.highlightedValue)
      }
    },
  },
]
```

### Context 구조
```
RootContext
├── expandedValues, selectedValues, highlightedValue
├── send, computed, store
├── selectionMode
│
└── ItemContext
    └── value, depth, parentValue, hasChildren, isExpanded, isSelected, isDisabled
```

---

## 6. 콘텐츠 전환 전략

### 전환 방식: 즉시 전환
- ItemGroup은 확장 시 즉시 표시, 축소 시 즉시 숨김
- 애니메이션 필요시 CSS로 처리 (height transition)

```tsx
// styled.tsx
<ItemGroup className="data-[state=closed]:hidden" />

// 또는 애니메이션
<ItemGroup className="
  grid transition-all duration-200
  data-[state=open]:grid-rows-[1fr]
  data-[state=closed]:grid-rows-[0fr]
" />
```

---

## 7. 파일 구조

```
src/components/tree/
├── machine.ts          # 상태 머신
├── index.tsx           # 컴포넌트 (primitives)
├── styled.tsx          # 스타일 적용 버전
└── __tests__/
    └── tree.test.tsx
```

---

## 8. 테스트 계획

### 렌더링
- [ ] 기본 트리 구조 렌더링
- [ ] defaultExpandedValues로 초기 확장 상태
- [ ] defaultSelectedValues로 초기 선택 상태
- [ ] data-part, data-state 속성 확인
- [ ] ARIA 속성 확인 (role, aria-expanded, aria-selected)

### 클릭 상호작용
- [ ] 부모 노드 클릭 시 확장/축소 토글
- [ ] 노드 클릭 시 선택
- [ ] disabled 노드 클릭 무시

### 키보드 상호작용
- [ ] ArrowDown: 다음 보이는 노드로 이동
- [ ] ArrowUp: 이전 보이는 노드로 이동
- [ ] ArrowRight: 닫힌 노드 열기 / 열린 노드의 첫 자식으로
- [ ] ArrowLeft: 열린 노드 닫기 / 부모로 이동
- [ ] Home: 첫 노드로
- [ ] End: 마지막 보이는 노드로
- [ ] Enter: 활성화 (부모: 토글, 끝노드: 선택)
- [ ] 문자 입력: 매칭 노드로 이동
- [ ] disabled 노드 건너뛰기

### Controlled 모드
- [ ] expandedValues prop으로 제어
- [ ] selectedValues prop으로 제어
- [ ] onChange 콜백 호출

### Multi-select 모드 (선택적)
- [ ] Space로 선택 토글
- [ ] 여러 노드 동시 선택

---

## 9. 구현 순서

1. [ ] `machine.ts` - 상태 머신
2. [ ] `index.tsx` - Types, Context 정의
3. [ ] `Root` 구현 (NodeStoreProvider, machine 연결)
4. [ ] `Item` 구현 (useNode, ParentProvider)
5. [ ] `ItemLabel` 구현 (키보드 이벤트 처리)
6. [ ] `ItemGroup` 구현 (자식 컨테이너)
7. [ ] `styled.tsx` 작성
8. [ ] 테스트 작성
9. [ ] 예제 페이지 작성

---

## 10. 프리모템 (Pre-mortem)

### 높은 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| 보이는 노드 계산 오류 | ArrowDown/Up이 숨겨진 노드로 이동 | `getVisibleItemValues` 정확히 구현 |
| 부모-자식 관계 추적 실패 | ArrowLeft/Right 동작 오류 | ParentProvider로 depth 추적 |
| NodeStore 스냅샷 사용 | 동적 트리에서 노드 누락 | 이벤트 핸들러에서 실시간 쿼리 |

### 중간 위험도
| 위험 | 증상 | 예방 |
|------|------|------|
| roving tabindex 오류 | Tab으로 트리 진입 시 잘못된 노드 포커스 | highlightedValue 기반 tabindex 관리 |
| aria-expanded 오류 | 끝 노드에 aria-expanded 추가 | hasChildren 체크 |
| 문자 검색 wrap 안됨 | 마지막 매칭 후 처음으로 안감 | Menu와 동일한 로직 사용 |

---

## 11. 성공 기준

- [ ] 모든 테스트 통과
- [ ] W3C APG 키보드 요구사항 충족
- [ ] ARIA 속성 올바르게 적용
- [ ] controlled/uncontrolled 모드 동작
- [ ] Focus/Selection 분리 동작
- [ ] 깊은 중첩 (3+ levels) 정상 동작

---

## 부록: 키보드 동작 상세

### ArrowRight 로직
```
현재 노드가 닫힌 부모 → 열기
현재 노드가 열린 부모 → 첫 자식으로 이동
현재 노드가 끝 노드 → 무동작
```

### ArrowLeft 로직
```
현재 노드가 열린 부모 → 닫기
현재 노드가 닫힌 노드 or 끝 노드 → 부모로 이동
현재 노드가 루트 → 무동작
```

### 보이는 노드 계산
```ts
function getVisibleItemValues(): string[] {
  const result: string[] = []

  function traverse(values: string[]) {
    for (const value of values) {
      const meta = getItemMeta(value)
      if (!meta || meta.disabled) continue

      result.push(value)

      // 확장된 부모만 자식 순회
      if (meta.hasChildren && expandedValues.includes(value)) {
        traverse(getChildValues(value))
      }
    }
  }

  traverse(getRootValues())
  return result
}
```
