# Menu Component

접근성을 고려한 중첩 메뉴 컴포넌트입니다. Composite System 기반의 DOM 레지스트리, 키보드 네비게이션, ARIA 속성, Floating UI 기반 포지셔닝을 지원합니다.

## Features

- ✅ **중첩 메뉴 지원** (Nested Menu with SubRoot)
- ✅ **Composite System 기반** (DOM 레지스트리로 요소 관리)
- ✅ **Floating UI 기반 포지셔닝** (flip, shift, arrow 지원)
- ✅ **키보드 네비게이션** (Arrow keys, Escape, Tab 처리)
- ✅ **Roving TabIndex 패턴** (키보드 포커스 관리)
- ✅ **Portal 렌더링 지원**
- ✅ **애니메이션 완료까지 DOM 유지** (usePresence 기반)
- ✅ **ActionItem & LinkItem 지원**
- ✅ **접근성 기능** (ARIA attributes, 키보드 네비게이션)
- ✅ **자동 ID 관리** (Composite System)

## Installation

```tsx
import Menu from './components/menu/menu'
// 또는 styled 버전 사용
import Menu from './components/menu/styled'
```

## Basic Usage

### Simple Menu

```tsx
import Menu from './components/menu/styled'

function MyComponent() {
  return (
    <Menu.Root>
      <Menu.Trigger>Open Menu</Menu.Trigger>
      <Menu.Positioner offset={8}>
        <Menu.Content>
          <Menu.ActionItem value="item-1">Action Item 1</Menu.ActionItem>
          <Menu.ActionItem value="item-2">Action Item 2</Menu.ActionItem>
          <Menu.LinkItem value="link-1" href="/docs">
            Documentation
          </Menu.LinkItem>
        </Menu.Content>
        <Menu.PositionerArrow />
      </Menu.Positioner>
    </Menu.Root>
  )
}
```

### Nested Menu

```tsx
import Menu from './components/menu/styled'

function MyComponent() {
  return (
    <Menu.Root>
      <Menu.Trigger>Root</Menu.Trigger>
      <Menu.Positioner offset={8}>
        <Menu.Content>
          <Menu.ActionItem value="a">A</Menu.ActionItem>

          <Menu.SubRoot>
            <Menu.SubTrigger>Sub 1</Menu.SubTrigger>
            <Menu.Positioner placement="right" offset={8}>
              <Menu.SubContent>
                <Menu.ActionItem value="s1-1">S1-1</Menu.ActionItem>
                <Menu.ActionItem value="s1-2">S1-2</Menu.ActionItem>
              </Menu.SubContent>
              <Menu.PositionerArrow />
            </Menu.Positioner>
          </Menu.SubRoot>

          <Menu.ActionItem value="b">B</Menu.ActionItem>
        </Menu.Content>
        <Menu.PositionerArrow />
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
  const [openedMenus, setOpenedMenus] = useState<string[]>([])

  return (
    <Menu.Root openedMenus={openedMenus} onOpenedMenusChange={setOpenedMenus}>
      <Menu.Trigger>Open Menu</Menu.Trigger>
      <Menu.Positioner offset={8}>
        <Menu.Content>
          <Menu.ActionItem value="item-1">Action Item 1</Menu.ActionItem>
          <Menu.ActionItem value="item-2">Action Item 2</Menu.ActionItem>
        </Menu.Content>
        <Menu.PositionerArrow />
      </Menu.Positioner>
    </Menu.Root>
  )
}
```

## Components

### `Menu.Root`

메뉴의 최상위 컨테이너입니다. 메뉴 트리 상태를 관리합니다.

#### Props

| Prop                  | Type                          | Default | Description                           |
| --------------------- | ----------------------------- | ------- | ------------------------------------- |
| `menuId`              | `string`                      | -       | 메뉴의 고유 ID (자동 생성됨)          |
| `openedMenus`         | `string[]`                    | -       | Controlled 모드에서 열린 메뉴 ID 배열 |
| `onOpenedMenusChange` | `(menuIds: string[]) => void` | -       | Controlled 모드의 onChange 핸들러     |
| `defaultOpenedMenus`  | `string[]`                    | `[]`    | Uncontrolled 모드의 초기 상태         |

**참고**: `openedMenus`는 메뉴 트리의 경로를 나타냅니다. 예를 들어 `['root', 'sub1']`은 root 메뉴와 그 하위의 sub1 메뉴가 열려있음을 의미합니다.

### `Menu.SubRoot`

서브메뉴의 루트 컨테이너입니다. `Menu.Root` 내부에서만 사용할 수 있습니다.

#### Props

| Prop     | Type     | Default | Description                      |
| -------- | -------- | ------- | -------------------------------- |
| `menuId` | `string` | -       | 서브메뉴의 고유 ID (자동 생성됨) |

### `Menu.Trigger`

최상위 메뉴를 열고 닫는 트리거 버튼입니다.

#### Props

모든 표준 `button` props를 지원합니다 (`className`, `style` 등).

### `Menu.SubTrigger`

서브메뉴를 열고 닫는 트리거 버튼입니다. `Menu.SubRoot` 내부에서 사용합니다.

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

최상위 메뉴 아이템들을 포함하는 컨테이너입니다.

#### Props

모든 표준 `div` props를 지원합니다 (`className`, `style` 등).

### `Menu.SubContent`

서브메뉴 아이템들을 포함하는 컨테이너입니다.

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
    <Menu.Content>
      <Menu.ActionItem value="item-1">Item 1</Menu.ActionItem>
    </Menu.Content>
    <Menu.PositionerArrow />
  </Menu.Positioner>
</Menu.Root>
```

### With Portal

```tsx
<Menu.Root>
  <Menu.Trigger>Open Menu</Menu.Trigger>
  <Menu.Portal>
    <Menu.Positioner offset={8}>
      <Menu.Content>
        <Menu.ActionItem value="item-1">Item 1</Menu.ActionItem>
      </Menu.Content>
      <Menu.PositionerArrow />
    </Menu.Positioner>
  </Menu.Portal>
</Menu.Root>
```

### Deep Nesting

```tsx
<Menu.Root>
  <Menu.Trigger>Root</Menu.Trigger>
  <Menu.Positioner offset={8}>
    <Menu.Content>
      <Menu.SubRoot>
        <Menu.SubTrigger>Level 1</Menu.SubTrigger>
        <Menu.Positioner placement="right" offset={8}>
          <Menu.SubContent>
            <Menu.SubRoot>
              <Menu.SubTrigger>Level 2</Menu.SubTrigger>
              <Menu.Positioner placement="right" offset={8}>
                <Menu.SubContent>
                  <Menu.ActionItem value="deep">Deep Item</Menu.ActionItem>
                </Menu.SubContent>
                <Menu.PositionerArrow />
              </Menu.Positioner>
            </Menu.SubRoot>
          </Menu.SubContent>
          <Menu.PositionerArrow />
        </Menu.Positioner>
      </Menu.SubRoot>
    </Menu.Content>
    <Menu.PositionerArrow />
  </Menu.Positioner>
</Menu.Root>
```

### Mixed Items

```tsx
<Menu.Root>
  <Menu.Trigger>Open Menu</Menu.Trigger>
  <Menu.Positioner offset={8}>
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
    <Menu.PositionerArrow />
  </Menu.Positioner>
</Menu.Root>
```

## Keyboard Navigation

컴포넌트는 WAI-ARIA 가이드라인을 따르는 키보드 네비게이션을 지원합니다:

### Top-level Trigger에 포커스가 있을 때

- **ArrowDown**: 메뉴를 열고 첫 번째 아이템에 포커스
- **ArrowUp**: 메뉴를 열고 마지막 아이템에 포커스

### SubTrigger에 포커스가 있을 때

- **ArrowRight**: 서브메뉴를 열고 첫 번째 아이템에 포커스 (메뉴가 닫혀있을 때)
- **ArrowRight**: 서브메뉴의 첫 번째 아이템으로 포커스 이동 (메뉴가 이미 열려있을 때)

### 메뉴가 열려있을 때

- **ArrowDown**: 다음 아이템으로 포커스 이동 (순환)
- **ArrowUp**: 이전 아이템으로 포커스 이동 (순환)
- **ArrowLeft**: 서브메뉴에서 상위 메뉴로 돌아가기 (서브메뉴만)
- **Escape**: 현재 메뉴 닫기
- **Shift+Tab**: 현재 메뉴 닫고 트리거로 포커스 이동
- **Tab**: 메뉴 트리 전체 닫기

## Roving TabIndex Pattern

Menu 컴포넌트는 Roving TabIndex 패턴을 사용합니다:

- 활성화된 아이템만 `tabIndex={0}`을 가집니다
- 나머지 아이템은 `tabIndex={-1}`을 가집니다
- 키보드 네비게이션으로 활성 아이템이 변경되면 포커스가 자동으로 이동합니다
- 이 패턴은 ARIA의 `activedescendant` 패턴과 함께 사용됩니다

## Styling

Menu는 data attributes를 활용해 상태별 스타일링이 가능합니다.

### Data Attributes

#### ActionItem & LinkItem

- `tabIndex={0}`: 현재 활성화된 아이템
- `tabIndex={-1}`: 비활성화된 아이템

#### Trigger & SubTrigger

- `aria-expanded="true"`: 메뉴가 열려있을 때
- `aria-expanded="false"`: 메뉴가 닫혀있을 때

### Example

```tsx
// styled.tsx
export function ActionItem({ className, ...rest }: ActionItemProps) {
  return (
    <MenuPrimitives.ActionItem
      className={cn(
        'w-full text-left px-4 py-2 text-sm text-gray-700',
        'hover:bg-gray-100',
        'focus:outline-none focus:bg-gray-100',
        'data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700',
        className,
      )}
      {...rest}
    />
  )
}
```

## Architecture

### Composite System

Menu 컴포넌트는 Composite System을 사용하여 DOM 요소를 관리합니다:

- **Registry**: 모든 메뉴 요소(trigger, content, positioner, arrow, item)를 등록
- **Role-based Access**: 역할(role)별로 요소를 조회하고 관리
- **Meta Information**: 각 요소에 메타 정보(rootId 등)를 저장하여 소유 관계 관리

```tsx
// system.ts
export const MenuSystem = createCompositeSystem<MenuRole, ItemId, MenuMeta>({
  namespace: 'menu',
  roles: ['trigger', 'content', 'positioner', 'arrow', 'item'],
})
```

### Menu Tree Management

중첩 메뉴는 `openedMenus` 배열로 관리됩니다:

- 배열의 순서는 메뉴 트리의 경로를 나타냅니다
- 예: `['root', 'sub1']`은 root 메뉴와 그 하위의 sub1 메뉴가 열려있음
- 메뉴를 닫으면 해당 메뉴와 그 하위 메뉴들이 모두 닫힙니다

### Headless UI 패턴

- **로직 분리**: `menu.tsx`는 순수 로직만 담당
- **스타일 분리**: `styled.tsx`는 스타일링만 담당
- **재사용성**: 로직과 스타일을 독립적으로 교체 가능

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
2. **SubTrigger 포커스 시**: ArrowRight으로 서브메뉴 열기/이동
3. **메뉴 열림 시**: ArrowDown/ArrowUp으로 포커스 이동 (순환)
4. **서브메뉴에서**: ArrowLeft로 상위 메뉴로 돌아가기
5. **Escape 키**: 현재 메뉴 닫기
6. **Tab 키**: 메뉴 트리 전체 닫기
7. **Shift+Tab**: 현재 메뉴만 닫고 트리거로 포커스 이동

### Focus Management

Menu는 Roving TabIndex 패턴을 사용합니다:

1. 활성화된 아이템만 `tabIndex={0}`을 가집니다
2. 키보드 네비게이션으로 활성 아이템이 변경되면 포커스가 자동으로 이동합니다
3. 메뉴가 열릴 때 `initialFocusType`에 따라 첫 번째 또는 마지막 아이템에 포커스가 설정됩니다

### Click Outside Handling

메뉴가 열려있을 때 외부 클릭을 감지하여 메뉴를 닫습니다:

- Composite Registry에 등록된 모든 노드를 확인
- 클릭된 요소가 어떤 메뉴 요소에도 포함되지 않으면 "바깥 클릭"으로 간주
- 전체 메뉴 트리를 닫습니다

### Animation Management

Menu는 `usePresence` 훅을 사용하여 애니메이션을 관리합니다:

- **애니메이션 완료 감지**: Web Animations API를 사용하여 CSS 애니메이션이 완료될 때까지 대기
- **DOM 유지**: Exit 애니메이션이 완료될 때까지 요소를 DOM에 유지
- **상태 전환**: `starting` → `idle` → `ending` → `undefined` 순서로 상태 전환

Positioner와 Content 모두 `usePresence`를 사용하므로, 각각 독립적으로 애니메이션을 관리합니다.

## Accessibility

Menu는 접근성 표준을 준수합니다:

- ✅ **ARIA roles**: `menu`, `menuitem`
- ✅ **ARIA attributes**: `aria-haspopup`, `aria-expanded`, `aria-controls`, `aria-labelledby`
- ✅ **Keyboard navigation**: 화살표 키로 아이템 간 이동
- ✅ **Focus management**: Roving TabIndex 패턴 사용
- ✅ **Click outside**: 외부 클릭 시 메뉴 닫기

## Examples

실제 사용 예제는 `examples.tsx` 파일을 참고하세요:

- NestedMenuExample

## TypeScript

모든 컴포넌트는 TypeScript로 작성되어 있으며, 타입 정의가 제공됩니다:

```tsx
import type {
  RootProps,
  SubRootProps,
  TriggerProps,
  SubTriggerProps,
  PositionerProps,
  PositionerArrowProps,
  ContentProps,
  SubContentProps,
  ActionItemProps,
  LinkItemProps,
  PortalProps,
} from './components/menu/menu'
```
