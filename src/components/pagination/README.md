# Pagination Component

접근성을 고려한 페이지네이션 컴포넌트입니다. Controlled/Uncontrolled 모드, Button/Link 액션 타입, 페이지 Truncation을 지원합니다.

## Features

- ✅ **Controlled & Uncontrolled 모드 지원**
- ✅ **Button & Link 액션 타입**
- ✅ **페이지 Truncation** (연속된 생략 페이지를 하나로 표시)
- ✅ **커스터마이징 가능한 Siblings Count**
- ✅ **접근성 기능** (ARIA attributes)
- ✅ **스타일링 컴포넌트 제공**

## Installation

```tsx
import Pagination from './components/pagination/hobin'
// 또는 styled 버전 사용
import Pagination from './components/pagination/hobin/styled'
```

## Basic Usage

### Uncontrolled Mode

`totalCount`와 `pageSize`를 사용하여 초기 상태를 설정합니다. `defaultPage`를 사용하여 초기 페이지를 지정할 수 있습니다.

```tsx
import Pagination from './components/pagination/hobin/styled'

function MyComponent() {
  return (
    <Pagination.Root totalCount={100} pageSize={10}>
      <Pagination.PreviousTrigger>Previous</Pagination.PreviousTrigger>
      <Pagination.Pages action={{ type: 'button', onPageClick: () => {} }} />
      <Pagination.NextTrigger>Next</Pagination.NextTrigger>
    </Pagination.Root>
  )
}
```

초기 페이지를 지정하려면 `defaultPage`를 사용하세요:

```tsx
<Pagination.Root totalCount={100} pageSize={10} defaultPage={3}>
  <Pagination.PreviousTrigger>Previous</Pagination.PreviousTrigger>
  <Pagination.Pages action={{ type: 'button', onPageClick: () => {} }} />
  <Pagination.NextTrigger>Next</Pagination.NextTrigger>
</Pagination.Root>
```

### Controlled Mode

`page`와 `onPageChange`를 사용하여 외부에서 상태를 관리합니다.

```tsx
import { useState } from 'react'
import Pagination from './components/pagination/hobin/styled'

function MyComponent() {
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <Pagination.Root
      totalCount={100}
      pageSize={10}
      page={currentPage}
      onPageChange={setCurrentPage}
    >
      <Pagination.PreviousTrigger>Previous</Pagination.PreviousTrigger>
      <Pagination.Pages
        action={{
          type: 'button',
          onPageClick: (page) => {
            console.log('Page clicked:', page)
          },
        }}
      />
      <Pagination.NextTrigger>Next</Pagination.NextTrigger>
    </Pagination.Root>
  )
}
```

## Components

### `Pagination.Root`

페이지네이션의 최상위 컨테이너입니다.

#### Props

| Prop               | Type                                      | Default     | Description                                      |
| ------------------ | ----------------------------------------- | ----------- | ------------------------------------------------ |
| `page`             | `number \| undefined`                     | `undefined` | Controlled 모드에서 현재 페이지                  |
| `onPageChange`     | `(page: number) => void \| undefined`     | `undefined` | Controlled 모드에서 페이지 변경 시 호출되는 콜백 |
| `defaultPage`      | `number \| undefined`                     | `1`         | Uncontrolled 모드에서 초기 페이지                |
| `pageSize`         | `number \| undefined`                     | `10`        | 한 페이지에 표시할 아이템 수                     |
| `onPageSizeChange` | `(pageSize: number) => void \| undefined` | `undefined` | 페이지 크기 변경 시 호출되는 콜백                |
| `totalCount`       | `number`                                  | -           | 전체 아이템 개수 (필수)                          |
| `...rest`          | `ComponentPropsWithoutRef<"div">`         | -           | div 요소의 모든 표준 props                       |

**참고:** `totalCount`는 전체 아이템 개수이고, 실제 페이지 수는 `Math.ceil(totalCount / pageSize)`로 자동 계산됩니다.

### `Pagination.PreviousTrigger`

이전 페이지로 이동하는 버튼입니다.

#### Props

모든 표준 `button` props를 지원합니다.

- 첫 번째 페이지일 때 자동으로 `disabled` 상태가 됩니다.

### `Pagination.NextTrigger`

다음 페이지로 이동하는 버튼입니다.

#### Props

모든 표준 `button` props를 지원합니다.

- 마지막 페이지일 때 자동으로 `disabled` 상태가 됩니다.

### `Pagination.Pages`

페이지 번호 목록을 표시하는 컴포넌트입니다.

#### Props

| Prop                  | Type                                                                                                                 | Required | Description                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------- |
| `action`              | `{ type: "button", onPageClick: (page: number) => void } \| { type: "link", getPageLink: (page: number) => string }` | ✅       | 페이지 클릭 액션 타입                             |
| `siblingsCount`       | `number \| undefined`                                                                                                | ❌       | 현재 페이지 주변에 표시할 페이지 개수 (기본값: 1) |
| `TruncationComponent` | `ReactNode \| undefined`                                                                                             | ❌       | 생략된 페이지를 표시할 컴포넌트 (기본값: "...")   |
| `...rest`             | `ComponentPropsWithoutRef<"ul">`                                                                                     | -        | ul 요소의 모든 표준 props                         |

#### Action Types

**Button Type:**

```tsx
<Pagination.Pages
  action={{
    type: 'button',
    onPageClick: (page) => {
      console.log('Page clicked:', page)
    },
  }}
/>
```

**Link Type:**

```tsx
<Pagination.Pages
  action={{
    type: 'link',
    getPageLink: (page) => `/page/${page}`,
  }}
/>
```

## Page Truncation

많은 페이지가 있을 때, 컴포넌트는 자동으로 페이지를 생략(truncate)합니다:

- **항상 표시되는 페이지:**
  - 첫 번째 페이지
  - 마지막 페이지
  - 현재 페이지 주변 `siblingsCount` 개의 페이지

- **나머지 페이지:** 연속된 생략 페이지는 하나의 `TruncationComponent`로 표시됩니다.

예시: `totalCount={1000}`, `pageSize={10}`, `siblingsCount={1}`, 현재 페이지가 50일 때
