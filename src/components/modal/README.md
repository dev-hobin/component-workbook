# Modal Component

모달 컴포넌트입니다. 사용자의 주의를 집중시키는 오버레이 다이얼로그를 제공합니다.

## Features

- ✅ Uncontrolled & Controlled 모드 지원
- ✅ Portal을 통한 렌더링 (body에 직접 렌더링)
- ✅ Focus trap 지원 (포커스가 모달 내부에 고정)
- ✅ Escape 키로 닫기
- ✅ 외부 클릭으로 닫기 옵션
- ✅ 초기 포커스 설정 가능
- ✅ Data attributes를 활용한 상태별 스타일링
- ✅ 접근성 지원 (ARIA 속성)
- ✅ 자동 ID 관리

## Installation

```tsx
import Modal from './components/modal'
```

## Basic Usage

### Uncontrolled Mode

```tsx
<Modal.Root>
  <Modal.Trigger>Open Modal</Modal.Trigger>
  <Modal.Portal>
    <Modal.Backdrop />
    <Modal.Content>
      <Modal.Title>Modal Title</Modal.Title>
      <Modal.Description>Modal description goes here.</Modal.Description>
      <Modal.CloseTrigger>Close</Modal.CloseTrigger>
    </Modal.Content>
  </Modal.Portal>
</Modal.Root>
```

### Controlled Mode

```tsx
const [open, setOpen] = useState(false)

<Modal.Root open={open} onOpenChange={setOpen}>
  <Modal.Trigger>Open Modal</Modal.Trigger>
  <Modal.Portal>
    <Modal.Backdrop />
    <Modal.Content>
      <Modal.Title>Modal Title</Modal.Title>
      <Modal.Description>Modal description goes here.</Modal.Description>
      <Modal.CloseTrigger>Close</Modal.CloseTrigger>
    </Modal.Content>
  </Modal.Portal>
</Modal.Root>
```

## Props

### Root

| Prop                  | Type                                 | Default | Description                             |
| --------------------- | ------------------------------------ | ------- | --------------------------------------- |
| `open`                | `boolean`                            | -       | Controlled mode에서 모달 열림/닫힘 상태 |
| `onOpenChange`        | `(open: boolean) => void`            | -       | Controlled mode의 onChange 핸들러       |
| `defaultOpen`         | `boolean`                            | `false` | Uncontrolled mode의 초기 상태           |
| `idRules`             | `object`                             | -       | 커스텀 ID 규칙 (자동 생성됨)            |
| `initialFocus`        | `HTMLElement \| (() => HTMLElement)` | -       | 모달이 열릴 때 초기 포커스를 받을 요소  |
| `closeOnOutsideClick` | `boolean`                            | `false` | 외부(Backdrop) 클릭 시 모달 닫기 여부   |
| `closeOnEscape`       | `boolean`                            | `true`  | Escape 키로 모달 닫기 여부              |

#### idRules

| Property         | Type     | Description            |
| ---------------- | -------- | ---------------------- |
| `rootId`         | `string` | Root 요소의 ID         |
| `backdropId`     | `string` | Backdrop 요소의 ID     |
| `contentId`      | `string` | Content 요소의 ID      |
| `titleId`        | `string` | Title 요소의 ID        |
| `descriptionId`  | `string` | Description 요소의 ID  |
| `triggerId`      | `string` | Trigger 버튼의 ID      |
| `closeTriggerId` | `string` | CloseTrigger 버튼의 ID |

### Trigger & CloseTrigger

Trigger와 CloseTrigger는 표준 HTML button 속성을 모두 받을 수 있습니다 (`className`, `style` 등).

### Content, Backdrop, Title, Description

Content, Backdrop, Title, Description은 표준 HTML 속성을 모두 받을 수 있습니다 (`className`, `style` 등).

### Portal

| Prop        | Type                          | Default         | Description                |
| ----------- | ----------------------------- | --------------- | -------------------------- |
| `children`  | `React.ReactNode`             | -               | Portal에 렌더링할 내용     |
| `container` | `Element \| DocumentFragment` | `document.body` | Portal이 렌더링될 컨테이너 |
| `key`       | `React.Key \| null`           | -               | React key                  |

## Advanced Usage

### Close on Outside Click

```tsx
<Modal.Root closeOnOutsideClick>
  <Modal.Trigger>Open Modal</Modal.Trigger>
  <Modal.Portal>
    <Modal.Backdrop />
    <Modal.Content>{/* Backdrop 클릭 시 모달이 닫힘 */}</Modal.Content>
  </Modal.Portal>
</Modal.Root>
```

### Disable Escape Key

```tsx
<Modal.Root closeOnEscape={false}>
  <Modal.Trigger>Open Modal</Modal.Trigger>
  <Modal.Portal>
    <Modal.Backdrop />
    <Modal.Content>{/* Escape 키로 닫을 수 없음 */}</Modal.Content>
  </Modal.Portal>
</Modal.Root>
```

### Custom Initial Focus

```tsx
<Modal.Root initialFocus={() => document.getElementById('my-input')}>
  <Modal.Trigger>Open Modal</Modal.Trigger>
  <Modal.Portal>
    <Modal.Backdrop />
    <Modal.Content>
      <input id="my-input" type="text" />
      {/* 모달이 열릴 때 이 input에 포커스 */}
    </Modal.Content>
  </Modal.Portal>
</Modal.Root>
```

### Custom ID Rules

```tsx
<Modal.Root
  idRules={{
    rootId: 'my-modal',
    contentId: 'my-modal-content',
    titleId: 'my-modal-title',
  }}
>
  {/* 커스텀 ID 사용 */}
</Modal.Root>
```

## Styling

Modal은 data attributes를 활용해 상태별 스타일링이 가능합니다.

### Data Attributes

- `data-state="open"` / `data-state="closed"`: 모달 열림/닫힘 상태

### Example

```tsx
// styled.tsx
export function Backdrop({ className, ...rest }) {
  return (
    <ModalPrimitives.Backdrop
      className={cn(
        'fixed inset-0 bg-black/50 transition-opacity',
        'data-[state=open]:animate-in data-[state=open]:fade-in',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out',
        className,
      )}
      {...rest}
    />
  )
}

export function Content({ className, ...rest }) {
  return (
    <ModalPrimitives.Content
      className={cn(
        'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'bg-white rounded-lg shadow-lg p-6 max-w-md w-full',
        'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95',
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
- **Portal**: `react-dom`의 `createPortal`을 사용하여 body에 직접 렌더링
- **Focus Trap**: `focus-trap` 라이브러리를 사용하여 포커스 관리

## Implementation Details

### Focus Management

Modal은 `focus-trap` 라이브러리를 사용하여 포커스를 모달 내부에 고정합니다:

- 모달이 열릴 때 포커스가 모달 내부로 이동
- Tab 키로 포커스가 모달 내부에서만 순환
- 모달이 닫힐 때 이전 포커스 위치로 복원

### Accessibility

Modal은 ARIA 속성을 자동으로 관리합니다:

- `role="dialog"`: 모달의 역할 명시
- `aria-modal="true"`: 모달임을 명시
- `aria-labelledby`: Title과 연결
- `aria-describedby`: Description과 연결

### Portal Rendering

Modal의 Content와 Backdrop은 Portal을 통해 `document.body`에 직접 렌더링됩니다:

- z-index 문제 해결
- 스크롤 문제 해결
- 다른 요소와의 겹침 문제 해결

## Examples

실제 사용 예제는 `examples.tsx` 파일을 참고하세요.

- UncontrolledExample
- ControlledExample
- CloseOnOutsideClickExample
- CustomInitialFocusExample
