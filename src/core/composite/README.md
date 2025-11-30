# Composite System

복잡한 Composite UI(Menu / Nested Menu / TreeView / Listbox / Tabs
...)를 위한**DOM · ID · 역할(role) 관리 인프라**

Composite UI는 "여러 역할을 가진 요소들이 하나의 스코프 안에서 협력하며
동작하는 UI"다.\
하지만 리액트 환경에서 이런 UI를 직접 구현하려고 하면 다음과 같은
반복적인 문제가 발생한다:

- 논리적 ID(itemId)와 DOM에서 사용하는 id가 뒤섞임\
- DOM 요소를 role 단위로 수집하기 위해 querySelector를 매번 반복\
- 중첩된 UI(Menu 안의 Menu, Tree 안의 Tree 등) 간에 DOM 정보가 섞임\
- roving tabIndex, activedescendant, aria-labelledby 같은 접근성
  로직이 불안정\
- UI 인스턴스가 여러 번 렌더될 때 DOM 참조가 꼬임

Composite System은 이 문제들을 **하나의 추상화 계층**으로 해결한다.

---

# 1. 이 시스템이 해결하는 문제

## 1) 논리적 ID(itemId)와 물리적 DOM ID(domId) 분리

기존 UI 구현에서는 다음을 동일하게 쓰는 경우가 많다:

- itemId → UI 상태에서 특정 항목을 식별\
- id → DOM에서 aria 연결 및 focus 이동을 위해 사용하는 HTML id

이 둘을 함께 사용하면 문제가 생긴다:

- 여러 UI 인스턴스가 렌더되면 같은 DOM id가 문서 안에서 중복\
- aria-controls/labelledby가 원하지 않는 요소를 가리킬 수 있음\
- 중첩 UI(메뉴 안의 메뉴)에서 DOM id 규칙이 충돌

**Composite System은 다음처럼 명확히 분리한다:**

- itemId: 개발자가 정의하는 "논리적 ID"\
- domId: scope + role + itemId 조합으로 만들어지는 "물리적 DOM ID"

따라서 충돌 없이 안정적으로 DOM을 다룰 수 있다.

---

## 2) 매번 반복되던 querySelector 로직 제거

Menu, Tree, Listbox 등에서는 role 기반 DOM 탐색이 반복된다:

- item 요소 전체 수집\
- siblings 탐색\
- depth/parent 기반 탐색\
- disabled filtering\
- floating-ui 위치 계산\
- roving tabIndex, activedescendant 구현

Composite System에서는 **모든 DOM 요소가 mount 시 registry에 자동
등록**된다.

UI 로직은 DOM을 직접 검색할 필요 없이 다음만 호출하면 된다:

```ts
registry.entriesByRole('item')
registry.getNode('trigger', someId)
registry.getDomId('item', selected)
```

querySelector 없이도 모든 Composite UI 로직이 안정적으로 구현된다.

---

## 3) 중첩 Composite UI 스코프 분리

UI는 종종 중첩된다:

- 메뉴 안의 메뉴\
- 트리 안의 트리\
- 리스트박스 안에서 또 다른 Composite UI 등장

Provider는 UI 인스턴스마다 **독립된 scopeId와 registry를 생성**한다.

덕분에:

- 중첩 UI끼리 DOM 데이터가 섞이지 않고\
- 각 UI가 완전히 독립적으로 동작한다.

---

# 2. Composite System의 구성 요소

## 1) Provider --- Composite UI 스코프 정의

```tsx
<Composite.Provider>...</Composite.Provider>
```

- 고유한 scopeId 생성\
- scope 전용 registry 보유\
- domId 생성 전략(IdStrategy) 설정

---

## 2) Item Registration --- DOM + meta 자동 등록

```ts
const { domId, ref } = useCompositeItemRegistration(role, itemId)
```

- mount 시 registry에 자동 등록\
- unmount 시 자동 제거\
- role, itemId, DOM node, meta 모두 저장\
- domId는 자동 생성되어 HTML id에 사용

---

## 3) Registry --- role 기반 DOM 관리의 핵심

```ts
registry.entries()
registry.entriesByRole('item')
registry.get('item', itemId)
registry.getNode('item', itemId)
registry.getDomId('trigger', itemId)
```

이를 기반으로 다음이 자연스럽게 구현된다:

- roving tabIndex\
- keyboard navigation\
- aria-labelledby / aria-controls\
- floating-ui position 계산\
- siblings / depth / parent 기반 navigation

---

# 3. 적용 가능한 UI 패턴

- Menu / Nested Menu\
- TreeView\
- Listbox / Combobox\
- Tabs\
- Select\
- Popover 내부 구조\
- Command Menu\
- Toolbar\
- Context Menu

Composite UI의 모든 패턴에 재사용 가능하다.

---

# 4. 요약

문제 Composite System 해결 방식

---

논리적 ID와 DOM ID 혼재 itemId ↔ domId 분리 + 자동 생성
querySelector 반복 registration 기반 DOM 자동 수집
중첩 UI 충돌 Provider 단위 스코프 분리
role 기반 DOM 순회 불편 `entriesByRole`
DOM 참조 불안정 `getNode(role, itemId)`
depth/parent/disabled 구조화 어려움 meta 기반 표현 가능

---

# 5. 한 문장 요약

**Composite System은 "논리적 ID 분리 + DOM 자동 수집 + role 기반
구조화 + 중첩 스코프 분리"를 통해 복잡한 Composite UI를 안정적이고
재사용 가능하게 만드는 기반 시스템이다.**
