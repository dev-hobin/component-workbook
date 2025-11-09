# Tabs Component

접근성을 고려한 탭 컴포넌트입니다. 키보드 네비게이션, ARIA 속성, Controlled/Uncontrolled 모드를 지원합니다.

## Features

- ✅ **Controlled & Uncontrolled 모드 지원**
- ✅ **Horizontal & Vertical orientation**
- ✅ **키보드 네비게이션** (Arrow keys)
- ✅ **Disabled 탭 지원**
- ✅ **커스텀 ID 생성 함수**
- ✅ **접근성 기능** (ARIA attributes, focus 관리)
- ✅ **스타일링 컴포넌트 제공**

## Installation

```tsx
import Tabs from './components/tabs'
// 또는 styled 버전 사용
import Tabs from './components/tabs/styled'
```

## Basic Usage

### Uncontrolled Mode

`defaultValue`를 사용하여 초기 탭을 설정합니다.

```tsx
import Tabs from './components/tabs/styled'

function MyComponent() {
  return (
    <Tabs.Root defaultValue="tab1" orientation="horizontal">
      <Tabs.List>
        <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
        <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
        <Tabs.Tab value="tab3">Tab 3</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="tab1">Panel 1 Content</Tabs.Panel>
      <Tabs.Panel value="tab2">Panel 2 Content</Tabs.Panel>
      <Tabs.Panel value="tab3">Panel 3 Content</Tabs.Panel>
    </Tabs.Root>
  )
}
```

### Controlled Mode

`value`와 `onValueChange`를 사용하여 외부에서 상태를 관리합니다.

```tsx
import { useState } from 'react'
import Tabs from './components/tabs/styled'

function MyComponent() {
  const [activeTab, setActiveTab] = useState('tab1')

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={setActiveTab}
      orientation="horizontal"
    >
      <Tabs.List>
        <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
        <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
        <Tabs.Tab value="tab3">Tab 3</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="tab1">Panel 1 Content</Tabs.Panel>
      <Tabs.Panel value="tab2">Panel 2 Content</Tabs.Panel>
      <Tabs.Panel value="tab3">Panel 3 Content</Tabs.Panel>
    </Tabs.Root>
  )
}
```

## Components

### `Tabs.Root`

탭의 최상위 컨테이너입니다.

#### Props

| Prop            | Type                                         | Default        | Description                                  |
| --------------- | -------------------------------------------- | -------------- | -------------------------------------------- |
| `value`         | `TabValue \| undefined`                      | `undefined`    | Controlled 모드에서 현재 활성 탭             |
| `onValueChange` | `(value: TabValue) => void \| undefined`     | `undefined`    | Controlled 모드에서 탭 변경 시 호출되는 콜백 |
| `defaultValue`  | `TabValue \| undefined`                      | `undefined`    | Uncontrolled 모드에서 초기 활성 탭           |
| `orientation`   | `"horizontal" \| "vertical"`                 | `"horizontal"` | 탭 목록의 방향                               |
| `ids`           | `{ listId?, tabId?, panelId? } \| undefined` | `undefined`    | 커스텀 ID 생성 함수                          |
| `id`            | `string \| undefined`                        | `undefined`    | Root 요소의 ID (기본값: 자동 생성)           |
| `...rest`       | `ComponentPropsWithoutRef<"div">`            | -              | div 요소의 모든 표준 props                   |

#### Custom IDs

각 요소의 ID를 커스터마이징할 수 있습니다:

```tsx
<Tabs.Root
  ids={{
    listId: 'my-tabs-list',
    tabId: (value) => `my-tab-${value}`,
    panelId: (value) => `my-panel-${value}`,
  }}
>
  {/* ... */}
</Tabs.Root>
```

### `Tabs.List`

탭 목록 컨테이너입니다.

#### Props

모든 표준 `div` props를 지원합니다.

### `Tabs.Tab`

개별 탭 버튼입니다.

#### Props

| Prop       | Type                                                | Required | Description                                |
| ---------- | --------------------------------------------------- | -------- | ------------------------------------------ |
| `value`    | `TabValue`                                          | ✅       | 탭의 고유 값                               |
| `disabled` | `boolean \| undefined`                              | ❌       | 탭 비활성화 여부                           |
| `children` | `ReactNode`                                         | ✅       | 탭에 표시될 내용                           |
| `...rest`  | `Omit<ComponentPropsWithoutRef<"button">, "value">` | -        | button 요소의 모든 표준 props (value 제외) |

### `Tabs.Panel`

탭 패널 콘텐츠입니다. 활성 탭과 일치하는 `value`를 가진 패널만 렌더링됩니다.

#### Props

| Prop       | Type                              | Required | Description                                      |
| ---------- | --------------------------------- | -------- | ------------------------------------------------ |
| `value`    | `TabValue`                        | ✅       | 패널의 고유 값 (해당 탭의 `value`와 일치해야 함) |
| `children` | `ReactNode`                       | ✅       | 패널에 표시될 내용                               |
| `...rest`  | `ComponentPropsWithoutRef<"div">` | -        | div 요소의 모든 표준 props                       |

## Orientation

### Horizontal (기본값)

```tsx
<Tabs.Root orientation="horizontal" defaultValue="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
    <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
  </Tabs.List>
  {/* ... */}
</Tabs.Root>
```

### Vertical

```tsx
<Tabs.Root orientation="vertical" defaultValue="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
    <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
  </Tabs.List>
  {/* ... */}
</Tabs.Root>
```

## Keyboard Navigation

컴포넌트는 WAI-ARIA 가이드라인을 따르는 키보드 네비게이션을 지원합니다:

- **Horizontal orientation:**
  - `ArrowRight`: 다음 탭으로 이동
  - `ArrowLeft`: 이전 탭으로 이동

- **Vertical orientation:**
  - `ArrowDown`: 다음 탭으로 이동
  - `ArrowUp`: 이전 탭으로 이동

Disabled 탭은 키보드 네비게이션에서 자동으로 건너뜁니다.

## Disabled Tabs

`disabled` prop을 사용하여 탭을 비활성화할 수 있습니다:

```tsx
<Tabs.Tab value="tab1" disabled>
  Disabled Tab
</Tabs.Tab>
```

Disabled 탭은:

- 클릭할 수 없습니다
- 키보드 네비게이션에서 건너뜁니다
- 시각적으로 비활성화된 상태로 표시됩니다

## Styled Components

`styled.tsx` 파일에서 Tailwind CSS로 스타일링된 컴포넌트를 제공합니다:

```tsx
import Tabs from './components/tabs/styled'

// styled 버전은 기본적으로 다음 스타일이 적용됩니다:
// - 탭 목록: 하단 border
// - 활성 탭: 파란색 텍스트와 하단 border
// - Hover/Focus 효과
// - Disabled 상태 스타일
```

스타일을 커스터마이징하려면 `className` prop을 사용하세요:

```tsx
<Tabs.Tab className="custom-class">Custom Styled Tab</Tabs.Tab>
```

## Data Attributes

컴포넌트는 스타일링과 테스트를 위한 다양한 data attributes를 제공합니다:

### Root

- `data-orientation`: `"horizontal"` 또는 `"vertical"`
- `data-active-value`: 현재 활성 탭 값
- `data-focused-value`: 현재 포커스된 탭 값

### Tab

- `data-orientation`: 방향 설정
- `data-value`: 탭 값
- `data-active`: 활성 상태 (`"true"` 또는 `undefined`)
- `data-disabled`: 비활성화 상태 (`"true"` 또는 `undefined`)
- `data-focused-value`: 포커스 상태

### Panel

- `data-orientation`: 방향 설정
- `data-value`: 패널 값
- `data-active`: 활성 상태
- `data-focused-value`: 포커스 상태

## Accessibility

컴포넌트는 접근성 표준을 준수합니다:

- ✅ **ARIA roles**: `tablist`, `tab`, `tabpanel`
- ✅ **ARIA orientation**: `aria-orientation` 속성
- ✅ **Keyboard navigation**: 화살표 키로 탭 간 이동
- ✅ **Focus management**: 활성 탭에만 `tabIndex={0}` 설정
- ✅ **Disabled state**: 비활성화된 탭은 키보드 네비게이션에서 제외

## Examples

자세한 사용 예제는 `examples.tsx` 파일을 참고하세요:

- Uncontrolled 예제 (Horizontal/Vertical)
- Controlled 예제
- 여러 탭 그룹 예제
- Disabled 탭 예제

## TypeScript

모든 컴포넌트는 TypeScript로 작성되어 있으며, 타입 정의가 제공됩니다:

```tsx
import type {
  RootProps,
  ListProps,
  TabProps,
  PanelProps,
} from './components/tabs'

export type TabValue = string | number
export type TabsOrientation = 'horizontal' | 'vertical'
```

## Implementation Details

### Focus Management

컴포넌트는 내부적으로 두 가지 상태를 관리합니다:

1. **Active Tab Value**: 현재 선택된 탭 (활성화된 패널 결정)
2. **Focused Tab Value**: 현재 키보드 포커스가 있는 탭 (키보드 네비게이션용)

### DOM Utilities

내부적으로 `createDomUtils` 함수가 다음을 제공합니다:

- ID 생성 함수 (`createListId`, `createTabId`, `createPanelId`)
- 키보드 네비게이션을 위한 탭 찾기 함수 (`findNextTab`, `findPreviousTab`)

이 함수들은 클로저를 통해 각 탭 인스턴스의 고유한 `rootId`와 커스텀 `ids` 설정을 유지합니다.
