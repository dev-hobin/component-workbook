# Accordion Component

아코디언 컴포넌트입니다. 접을 수 있는 콘텐츠를 표시합니다.

## Features

- ✅ Uncontrolled & Controlled 모드 지원
- ✅ Multiple & Single 모드 지원 (여러 개 동시 열기)
- ✅ Grid 기반 애니메이션 (CSS Grid의 grid-template-rows를 이용한 부드러운 애니메이션)
- ✅ Data attributes를 활용한 상태별 스타일링
- ✅ 접근성 지원 (ARIA 속성)
- ✅ Collapsible 옵션 (열린 상태에서 닫기 허용 여부)
- ✅ Disabled 상태 지원
- ✅ Root 단위 animationDuration 설정

## Installation

```tsx
import Accordion from './components/accordion/hobin'
```

## Basic Usage

### Uncontrolled Mode

```tsx
<Accordion.Root defaultValue={['item-1']}>
  <Accordion.Item value="item-1">
    <Accordion.Trigger>Item 1</Accordion.Trigger>
    <Accordion.Panel>Content for item 1</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="item-2">
    <Accordion.Trigger>Item 2</Accordion.Trigger>
    <Accordion.Panel>Content for item 2</Accordion.Panel>
  </Accordion.Item>
</Accordion.Root>
```

### Controlled Mode

```tsx
const [value, setValue] = useState<string[]>(['item-1'])

;<Accordion.Root value={value} onValueChange={setValue}>
  <Accordion.Item value="item-1">
    <Accordion.Trigger>Item 1</Accordion.Trigger>
    <Accordion.Panel>Content for item 1</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="item-2">
    <Accordion.Trigger>Item 2</Accordion.Trigger>
    <Accordion.Panel>Content for item 2</Accordion.Panel>
  </Accordion.Item>
</Accordion.Root>
```

## Props

### Root

| Prop                | Type                        | Default   | Description                            |
| ------------------- | --------------------------- | --------- | -------------------------------------- |
| `value`             | `string[]`                  | -         | Controlled mode에서 열린 아이템 배열   |
| `onValueChange`     | `(value: string[]) => void` | -         | Controlled mode의 onChange 핸들러      |
| `defaultValue`      | `string[]`                  | `[]`      | Uncontrolled mode의 초기 값            |
| `multiple`          | `boolean`                   | `false`   | 여러 아이템을 동시에 열 수 있는지 여부 |
| `collapsible`       | `boolean`                   | `true`    | 열린 아이템을 닫을 수 있는지 여부      |
| `disabled`          | `boolean`                   | `false`   | 전체 Accordion 비활성화                |
| `animationDuration` | `` `${number}ms` ``         | `"300ms"` | 애니메이션 지속 시간                   |

### Item

| Prop        | Type      | Default | Description                      |
| ----------- | --------- | ------- | -------------------------------- |
| `value`     | `string`  | -       | (필수) 아이템을 식별하는 고유 값 |
| `disabled`  | `boolean` | `false` | 해당 아이템만 비활성화           |
| `triggerId` | `string`  | -       | (자동 생성) 트리거 ID            |
| `panelId`   | `string`  | -       | (자동 생성) 패널 ID              |

### Trigger & Panel

Trigger와 Panel은 표준 HTML 속성을 모두 받을 수 있습니다 (`className`, `style` 등).

## Advanced Usage

### Multiple Mode

```tsx
<Accordion.Root multiple defaultValue={['item-1', 'item-3']}>
  {/* 여러 아이템 동시에 열기 가능 */}
</Accordion.Root>
```

### Custom Animation Duration

```tsx
<Accordion.Root animationDuration="500ms">
  {/* 모든 아이템이 500ms 애니메이션 */}
</Accordion.Root>
```

### Collapsible Disabled

```tsx
<Accordion.Root collapsible={false}>
  {/* 한 번 열면 닫을 수 없음 (single mode에서) */}
</Accordion.Root>
```

### Individual Item Disabled

```tsx
<Accordion.Item value="item-1" disabled>
  {/* 특정 아이템만 비활성화 */}
</Accordion.Item>
```

## Styling

Accordion은 data attributes를 활용해 상태별 스타일링이 가능합니다.

### Data Attributes

- `data-expanded="true"` / `data-expanded="false"`: 아이템 열림/닫힘 상태
- `data-disabled="true"` / `data-disabled="false"`: 비활성화 상태

### Example

```tsx
// styled.tsx
export function Trigger({ className, ...rest }) {
  return (
    <AccordionPrimitives.Trigger
      className={clsx(
        'w-full px-6 py-4 rounded-lg',
        'data-[expanded=true]:bg-gray-50',
        'data-[disabled=true]:opacity-50',
        className,
      )}
      {...rest}
    />
  )
}
```

## Architecture

- **Headless UI 패턴**: 로직(`index.tsx`)과 스타일(`styled.tsx`) 분리
- **Grid-based Animation**: CSS Grid의 `grid-template-rows`를 이용한 부드러운 전환
- **Context API**: Root, Item별로 분리된 Context 구조

## Implementation Details

### Animation

Panel의 애니메이션은 CSS Grid를 사용합니다:

```css
grid-template-rows: 0fr; /* 닫힘 */
grid-template-rows: 1fr; /* 열림 */
```

이 방식의 장점:

- 하드코딩된 max-height 불필요
- 콘텐츠 크기에 맞춰 자동으로 조정
- Padding이 있어도 올바르게 처리

### DOM Structure

```tsx
<div className="grid overflow-hidden ...">
  {/* Grid 래퍼 */}
  <div className="overflow-hidden">
    {/* 축소 가능한 wrapper */}
    <div id={panelId} className="...">
      {/* 실제 Panel (padding 포함) */}
      {children}
    </div>
  </div>
</div>
```

## Examples

실제 사용 예제는 `examples.tsx` 파일을 참고하세요.

- UncontrolledExample
- ControlledExample
