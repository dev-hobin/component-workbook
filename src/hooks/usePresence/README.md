# usePresence Hook

컴포넌트의 나타남/사라짐 애니메이션을 관리하는 훅입니다. CSS 애니메이션이 완료될 때까지 DOM에 요소를 유지하고, 전환 상태를 추적합니다.

## Features

- ✅ CSS 애니메이션 완료 감지 (Web Animations API 사용)
- ✅ Enter/Exit 애니메이션 상태 관리
- ✅ 애니메이션 중간 취소 처리
- ✅ 안전한 상태 전환 보장
- ✅ `requestAnimationFrame`을 통한 부드러운 상태 업데이트

## Installation

```tsx
import { usePresence } from './hooks/usePresence'
```

## Basic Usage

```tsx
function MyComponent({ isVisible }: { isVisible: boolean }) {
  const { isPresent, transitionState } = usePresence({
    isVisible,
    resolveElement: () => document.getElementById('my-element'),
  })

  if (!isPresent) {
    return null
  }

  return (
    <div
      id="my-element"
      data-transition={transitionState}
      className={cn(
        'transition-all duration-300',
        'data-[transition=starting]:opacity-0 data-[transition=starting]:scale-95',
        'data-[transition=idle]:opacity-100 data-[transition=idle]:scale-100',
        'data-[transition=ending]:opacity-0 data-[transition=ending]:scale-95',
      )}
    >
      Content
    </div>
  )
}
```

## API

### Parameters

| Parameter        | Type                    | Description                                  |
| ---------------- | ----------------------- | -------------------------------------------- |
| `isVisible`      | `boolean`               | 컴포넌트가 보여야 하는지 여부                |
| `resolveElement` | `() => Element \| null` | 애니메이션을 감지할 DOM 요소를 반환하는 함수 |

### Returns

| Property          | Type                                            | Description                      |
| ----------------- | ----------------------------------------------- | -------------------------------- |
| `isPresent`       | `boolean`                                       | 컴포넌트가 DOM에 존재하는지 여부 |
| `transitionState` | `'starting' \| 'idle' \| 'ending' \| undefined` | 현재 전환 상태                   |

## Transition States

### `undefined`

- 컴포넌트가 DOM에 존재하지 않음
- `isPresent = false`

### `'starting'`

- 컴포넌트가 나타나기 시작하는 상태
- Enter 애니메이션이 진행 중
- `isPresent = true`

### `'idle'`

- 컴포넌트가 완전히 표시된 안정 상태
- 애니메이션이 완료됨
- `isPresent = true`

### `'ending'`

- 컴포넌트가 사라지기 시작하는 상태
- Exit 애니메이션이 진행 중
- `isPresent = true`

## State Transition Flow

### 나타나는 경우 (isVisible: false → true)

```
undefined → starting → idle
```

1. `isVisible`이 `true`로 변경
2. `transitionState`가 `'starting'`으로 설정
3. Enter 애니메이션 시작
4. 애니메이션 완료 후 `'idle'`로 전환

### 사라지는 경우 (isVisible: true → false)

```
idle → ending → undefined
```

1. `isVisible`이 `false`로 변경
2. `transitionState`가 `'ending'`으로 설정
3. Exit 애니메이션 시작
4. 애니메이션 완료 후 `undefined`로 전환 (DOM에서 제거)

### 중간 취소 처리

애니메이션이 진행 중일 때 `isVisible`이 다시 변경되면:

- **Enter 중에 취소**: `starting` → `ending` (즉시 전환)
- **Exit 중에 취소**: `ending` → `idle` (즉시 전환)

## Advanced Usage

### Modal 컴포넌트 예제

```tsx
export function Content(props: ContentProps) {
  const { open, idRules } = useModalContext()

  const { isPresent, transitionState } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(idRules.contentId),
  })

  if (!isPresent) {
    return null
  }

  return (
    <div
      id={idRules.contentId}
      data-transition={transitionState}
      className={cn(
        'transition-all duration-1000',
        'data-[transition=starting]:opacity-0 data-[transition=starting]:scale-95',
        'data-[transition=idle]:opacity-100 data-[transition=idle]:scale-100',
        'data-[transition=ending]:opacity-0 data-[transition=ending]:scale-95',
      )}
      {...props}
    />
  )
}
```

### Backdrop 컴포넌트 예제

```tsx
export function Backdrop(props: BackdropProps) {
  const { open, idRules } = useModalContext()

  const { isPresent, transitionState } = usePresence({
    isVisible: open,
    resolveElement: () => document.getElementById(idRules.backdropId),
  })

  if (!isPresent) {
    return null
  }

  return (
    <div
      id={idRules.backdropId}
      data-transition={transitionState}
      className={cn(
        'transition-opacity duration-1000',
        'data-[transition=starting]:opacity-0',
        'data-[transition=idle]:opacity-100',
        'data-[transition=ending]:opacity-0',
      )}
      {...props}
    />
  )
}
```

## Implementation Details

### 애니메이션 감지

`usePresence`는 Web Animations API의 `getAnimations()`를 사용하여 요소의 모든 애니메이션을 감지합니다:

```tsx
const animations = element.getAnimations({ subtree: true })
await Promise.all(animations.map((animation) => animation.finished))
```

- `subtree: true` 옵션으로 하위 요소의 애니메이션도 감지
- CSS `transition`과 `animation` 모두 감지 가능
- 애니메이션이 없으면 즉시 완료로 처리

### 상태 업데이트 타이밍

상태 업데이트는 `requestAnimationFrame`을 사용하여 다음 프레임에 실행됩니다:

```tsx
rafId = requestAnimationFrame(() => {
  // 상태 검증 후 업데이트
  setTransitionState(nextState)
})
```

이렇게 하면:

- DOM 업데이트와 동기화
- 불필요한 리렌더링 방지
- 부드러운 애니메이션 보장

### 안전한 상태 전환

상태 업데이트 전에 다음을 검증합니다:

1. `isVisible`이 변경되지 않았는지
2. `transitionState`가 변경되지 않았는지

이를 통해 경쟁 조건(race condition)을 방지합니다.

## Styling with Data Attributes

`transitionState`를 `data-transition` 속성으로 전달하여 CSS로 스타일링할 수 있습니다:

```css
/* Enter animation */
[data-transition='starting'] {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}

/* Idle state */
[data-transition='idle'] {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Exit animation */
[data-transition='ending'] {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}
```

또는 Tailwind CSS를 사용:

```tsx
className={cn(
  'transition-all duration-300',
  'data-[transition=starting]:opacity-0 data-[transition=starting]:scale-95',
  'data-[transition=idle]:opacity-100 data-[transition=idle]:scale-100',
  'data-[transition=ending]:opacity-0 data-[transition=ending]:scale-95',
)}
```

## Best Practices

1. **`resolveElement`는 항상 최신 요소를 반환해야 합니다**
   - `useStableCallback`을 사용하여 함수 참조를 안정화할 수 있습니다

2. **애니메이션이 없으면 즉시 완료됩니다**
   - CSS `transition` 또는 `animation`이 없으면 `'starting'` → `'idle'` 전환이 즉시 발생합니다

3. **중간 취소를 고려한 디자인**
   - 애니메이션이 중간에 취소될 수 있으므로, 모든 상태에서 자연스럽게 전환되도록 스타일을 설계하세요

4. **성능 최적화**
   - `isPresent`가 `false`일 때는 컴포넌트를 렌더링하지 않아 메모리를 절약합니다

## Limitations

- Web Animations API를 사용하므로, CSS `transition`과 `animation`만 감지 가능합니다
- JavaScript로 제어하는 애니메이션은 감지하지 못할 수 있습니다
- `resolveElement`가 `null`을 반환하면 애니메이션 감지가 작동하지 않습니다

## Related Hooks

- `useLatestRef`: 최신 값을 참조로 유지
- `useStableCallback`: 안정적인 콜백 참조 유지
