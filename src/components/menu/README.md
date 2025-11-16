# Menu Component

접근성을 고려한 메뉴 컴포넌트입니다. 키보드 네비게이션, ARIA 속성, Floating UI 기반 포지셔닝을 지원합니다.

## Features

- ✅ **Uncontrolled & Controlled 모드 지원**
- ✅ **Floating UI 기반 포지셔닝** (flip, shift, arrow 지원)
- ✅ **키보드 네비게이션** (Arrow keys, Escape, Tab 방지)
- ✅ **activedescendant 패턴** (ARIA 활성 항목 표시)
- ✅ **Portal 렌더링 지원**
- ✅ **애니메이션 완료까지 DOM 유지** (usePresence 기반)
- ✅ **ActionItem & LinkItem 지원**
- ✅ **접근성 기능** (ARIA attributes, 키보드 네비게이션)
- ✅ **자동 ID 관리**

## Installation

```tsx
import Menu from './components/menu'
// 또는 styled 버전 사용
import Menu from './components/menu/styled'
```

## Basic Usage

### Uncontrolled Mode

```tsx
import Menu from './components/menu/styled'

function MyComponent() {
  return (
    <Menu.Root>
      <Menu.Trigger>Open Menu</Menu.Trigger>
      <Menu.Positioner offset={8}>
        <Menu.PositionerArrow />
        <Menu.Content>
          <Menu.ActionItem value="item-1">Action Item 1</Menu.ActionItem>
          <Menu.ActionItem value="item-2">Action Item 2</Menu.ActionItem>
          <Menu.LinkItem value="link-1" href="/docs">
            Documentation
          </Menu.LinkItem>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}
```

### Controlled Mode

```tsx
import { useState } from 'react'
import Menu from './components/menu/styled'

function MyComponent() {
  const [open, setOpen] = useState(false)

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger>Open Menu</Menu.Trigger>
      <Menu.Positioner offset={8}>
        <Menu.PositionerArrow />
        <Menu.Content>
          <Menu.ActionItem value="item-1">Action Item 1</Menu.ActionItem>
          <Menu.ActionItem value="item-2">Action Item 2</Menu.ActionItem>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}
```

## Components

### `Menu.Root`

메뉴의 최상위 컨테이너입니다. 상태와 ID를 관리합니다.

#### Props

| Prop           | Type                      | Default | Description                             |
| -------------- | ------------------------- | ------- | --------------------------------------- |
| `open`         | `boolean`                 | -       | Controlled 모드에서 메뉴 열림/닫힘 상태 |
| `onOpenChange` | `(open: boolean) => void` | -       | Controlled 모드의 onChange 핸들러       |
| `defaultOpen`  | `boolean`                 | `false` | Uncontrolled 모드의 초기 상태           |
| `idRules`      | `object`                  | -       | 커스텀 ID 규칙 (자동 생성됨)            |

#### idRules

| Property            | Type                        | Description               |
| ------------------- | --------------------------- | ------------------------- |
| `rootId`            | `string`                    | Root 요소의 ID            |
| `triggerId`         | `string`                    | Trigger 버튼의 ID         |
| `positionerId`      | `string`                    | Positioner 요소의 ID      |
| `positionerArrowId` | `string`                    | PositionerArrow 요소의 ID |
| `contentId`         | `string`                    | Content 요소의 ID         |
| `actionItemId`      | `(value: string) => string` | ActionItem ID 생성 함수   |
| `linkItemId`        | `(value: string) => string` | LinkItem ID 생성 함수     |

### `Menu.Trigger`

메뉴를 열고 닫는 트리거 버튼입니다.

#### Props

모든 표준 `button` props를 지원합니다 (`className`, `style` 등).

### `Menu.Positioner`

메뉴의 위치를 계산하고 관리하는 컨테이너입니다. Floating UI를 사용하여 트리거를 기준으로 위치를 계산합니다.

#### Props

| Prop           | Type                              | Default    | Description                                    |
| -------------- | --------------------------------- | ---------- | ---------------------------------------------- |
| `placement`    | `Placement`                       | `'bottom'` | 메뉴의 배치 위치 (top, bottom, left, right 등) |
| `flipOptions`  | `Parameters<typeof flip>[0]`      | -          | flip middleware 옵션                           |
| `shiftOptions` | `Parameters<typeof shift>[0]`     | -          | shift middleware 옵션                          |
| `offset`       | `number`                          | `0`        | 트리거와 메뉴 사이의 거리                      |
| `arrowOffset`  | `number`                          | `4`        | 화살표의 오프셋                                |
| `...rest`      | `ComponentPropsWithoutRef<'div'>` | -          | div 요소의 모든 표준 props                     |

### `Menu.PositionerArrow`

메뉴와 트리거를 연결하는 화살표입니다.

#### Props

모든 표준 `div` props를 지원합니다 (`className`, `style` 등).

### `Menu.Content`

메뉴 아이템들을 포함하는 컨테이너입니다.

#### Props

모든 표준 `div` props를 지원합니다 (`className`, `style` 등).

### `Menu.ActionItem`

액션을 수행하는 메뉴 아이템입니다 (button 요소).

#### Props

| Prop       | Type                                                | Required | Description                       |
| ---------- | --------------------------------------------------- | -------- | --------------------------------- |
| `value`    | `string`                                            | ✅       | 아이템의 고유 값 (ID 생성에 사용) |
| `children` | `ReactNode`                                         | ✅       | 아이템에 표시될 내용              |
| `...rest`  | `Omit<ComponentPropsWithoutRef<'button'>, 'value'>` | -        | button 요소의 모든 표준 props     |

### `Menu.LinkItem`

링크로 이동하는 메뉴 아이템입니다 (anchor 요소).

#### Props

| Prop       | Type                                           | Required | Description                       |
| ---------- | ---------------------------------------------- | -------- | --------------------------------- |
| `value`    | `string`                                       | ✅       | 아이템의 고유 값 (ID 생성에 사용) |
| `children` | `ReactNode`                                    | ✅       | 아이템에 표시될 내용              |
| `...rest`  | `Omit<ComponentPropsWithoutRef<'a'>, 'value'>` | -        | anchor 요소의 모든 표준 props     |

### `Menu.Portal`

메뉴를 Portal을 통해 렌더링합니다.

#### Props

| Prop        | Type                          | Default         | Description                |
| ----------- | ----------------------------- | --------------- | -------------------------- |
| `children`  | `React.ReactNode`             | -               | Portal에 렌더링할 내용     |
| `container` | `Element \| DocumentFragment` | `document.body` | Portal이 렌더링될 컨테이너 |
| `key`       | `React.Key \| null`           | -               | React key                  |

## Advanced Usage

### Custom Placement

```tsx
<Menu.Root>
  <Menu.Trigger>Open Menu</Menu.Trigger>
  <Menu.Positioner placement="top" offset={8}>
    <Menu.PositionerArrow />
    <Menu.Content>
      <Menu.ActionItem value="item-1">Item 1</Menu.ActionItem>
    </Menu.Content>
  </Menu.Positioner>
</Menu.Root>
```

### With Portal

```tsx
<Menu.Root>
  <Menu.Trigger>Open Menu</Menu.Trigger>
  <Menu.Portal>
    <Menu.Positioner offset={8}>
      <Menu.PositionerArrow />
      <Menu.Content>
        <Menu.ActionItem value="item-1">Item 1</Menu.ActionItem>
      </Menu.Content>
    </Menu.Positioner>
  </Menu.Portal>
</Menu.Root>
```

### Custom ID Rules

```tsx
<Menu.Root
  idRules={{
    rootId: 'my-menu',
    contentId: 'my-menu-content',
    actionItemId: (value) => `my-action-${value}`,
  }}
>
  {/* 커스텀 ID 사용 */}
</Menu.Root>
```

### Mixed Items

```tsx
<Menu.Root>
  <Menu.Trigger>Open Menu</Menu.Trigger>
  <Menu.Positioner offset={8}>
    <Menu.PositionerArrow />
    <Menu.Content>
      <Menu.ActionItem value="new">New File</Menu.ActionItem>
      <Menu.ActionItem value="open">Open File</Menu.ActionItem>
      <Menu.LinkItem value="docs" href="/docs">
        Documentation
      </Menu.LinkItem>
      <Menu.LinkItem value="github" href="https://github.com">
        GitHub
      </Menu.LinkItem>
    </Menu.Content>
  </Menu.Positioner>
</Menu.Root>
```

## Keyboard Navigation

컴포넌트는 WAI-ARIA 가이드라인을 따르는 키보드 네비게이션을 지원합니다:

### Trigger에 포커스가 있을 때

- **ArrowDown**: 메뉴를 열고 첫 번째 아이템에 activedescendant 설정
- **ArrowUp**: 메뉴를 열고 마지막 아이템에 activedescendant 설정

### 메뉴가 열려있을 때

- **ArrowDown**: 다음 아이템으로 activedescendant 이동
- **ArrowUp**: 이전 아이템으로 activedescendant 이동
- **Escape**: 메뉴 닫기
- **Tab**: Tab 키 이동 방지 (메뉴 내부에 포커스 유지)

## Activedescendant Pattern

Menu 컴포넌트는 ARIA의 `activedescendant` 패턴을 사용합니다:

- Content 요소에 `aria-activedescendant` 속성이 설정됩니다
- 활성화된 아이템의 ID가 `aria-activedescendant`에 설정됩니다
- 활성화된 아이템은 `data-active="true"` 속성을 가집니다
- 스타일링을 통해 활성화된 아이템을 시각적으로 강조할 수 있습니다

```tsx
// Content 요소
<div
  role="menu"
  aria-activedescendant="menu-root-action-item-item-1"
>
  {/* ... */}
</div>

// 활성화된 ActionItem
<button
  role="menuitem"
  id="menu-root-action-item-item-1"
  data-active="true"
>
  Action Item 1
</button>
```

## Styling

Menu는 data attributes를 활용해 상태별 스타일링이 가능합니다.

### Data Attributes

#### ActionItem & LinkItem

- `data-active="true"`: 현재 activedescendant로 설정된 아이템

### Example

```tsx
// styled.tsx
export function ActionItem({ className, ...rest }: ActionItemProps) {
  return (
    <MenuPrimitives.ActionItem
      className={cn(
        'w-full text-left px-4 py-2 text-sm text-gray-700',
        'hover:bg-gray-100 focus:outline-none focus:bg-gray-100',
        'data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700',
        className,
      )}
      {...rest}
    />
  )
}
```

## Architecture

- **Headless UI 패턴**: 로직(`index.tsx`)과 스타일(`styled.tsx`) 분리
- **Context API**: Root에서 상태와 ID를 관리하고 하위 컴포넌트에 제공
- **Floating UI**: `@floating-ui/dom`을 사용하여 포지셔닝 계산
- **usePresence**: 애니메이션 완료까지 DOM에 요소를 유지하고 전환 상태를 관리
- **Portal**: `react-dom`의 `createPortal`을 사용하여 body에 직접 렌더링 가능

## Implementation Details

### Positioning

Menu는 Floating UI를 사용하여 포지셔닝을 계산합니다:

- **computePosition**: 트리거를 기준으로 메뉴 위치 계산
- **autoUpdate**: 스크롤, 리사이즈 등에 따라 위치 자동 업데이트
- **flip middleware**: 공간이 부족할 때 자동으로 반대편으로 이동
- **shift middleware**: 화면 밖으로 나가지 않도록 위치 조정
- **arrow middleware**: 화살표 위치 계산

### Keyboard Navigation

Menu는 키보드 네비게이션을 다음과 같이 처리합니다:

1. **Trigger 포커스 시**: ArrowDown/ArrowUp으로 메뉴 열기
2. **메뉴 열림 시**: ArrowDown/ArrowUp으로 activedescendant 이동
3. **Escape 키**: 메뉴 닫기
4. **Tab 키**: 메뉴 내부에서 Tab 이동 방지

### Activedescendant Management

Menu는 내부적으로 activedescendant를 관리합니다:

1. 메뉴가 열릴 때 `initialFocus`에 따라 첫 번째 또는 마지막 아이템에 activedescendant 설정
2. ArrowDown/ArrowUp 키로 activedescendant 이동
3. Content의 `aria-activedescendant` 속성에 현재 활성 아이템 ID 설정
4. 활성 아이템에 `data-active="true"` 속성 추가

### Click Outside Handling

메뉴가 열려있을 때 외부 클릭을 감지하여 메뉴를 닫습니다:

- Content나 Trigger 내부 클릭은 무시
- 그 외의 영역 클릭 시 메뉴 닫기

### Animation Management

Menu는 `usePresence` 훅을 사용하여 애니메이션을 관리합니다:

- **애니메이션 완료 감지**: Web Animations API를 사용하여 CSS 애니메이션이 완료될 때까지 대기
- **DOM 유지**: Exit 애니메이션이 완료될 때까지 요소를 DOM에 유지
- **상태 전환**: `starting` → `idle` → `ending` → `undefined` 순서로 상태 전환

Positioner와 Content 모두 `usePresence`를 사용하므로, 각각 독립적으로 애니메이션을 관리합니다.

## Accessibility

Menu는 접근성 표준을 준수합니다:

- ✅ **ARIA roles**: `menu`, `menuitem`
- ✅ **ARIA attributes**: `aria-haspopup`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-labelledby`
- ✅ **Keyboard navigation**: 화살표 키로 아이템 간 이동
- ✅ **Focus management**: activedescendant 패턴 사용
- ✅ **Tab trapping**: 메뉴 내부에서 Tab 키 이동 방지

## Examples

실제 사용 예제는 `examples.tsx` 파일을 참고하세요:

- UncontrolledExample
- ActivedescendantExample
- MixedItemsExample
- PlacementExample
- PortalExample
- ControlledExample

## TypeScript

모든 컴포넌트는 TypeScript로 작성되어 있으며, 타입 정의가 제공됩니다:

```tsx
import type {
  RootProps,
  TriggerProps,
  PositionerProps,
  PositionerArrowProps,
  ContentProps,
  ActionItemProps,
  LinkItemProps,
  PortalProps,
} from './components/menu'
```
