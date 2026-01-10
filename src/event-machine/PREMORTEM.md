# Event Machine 프리모템

## 포지션: Controlled XState

event-machine은 XState의 개념을 활용하면서 외부 상태(props)와 자연스럽게 결합되는 "Controlled XState"를 목표로 한다.

### 검증 기준

1. **Controlled 컴포넌트와 자연스럽게 결합되는가?**
2. **XState 개념이 자연스럽게 녹아있는가?**
3. **useReducer처럼 명확히 읽히는가?**
4. **요구사항 → 코드 1:1 매핑이 쉬운가?**

---

## Part 1. 컴포넌트 구현 실패 케이스

### 실패 1: 비동기 데이터 로딩

**요구사항**: "검색어 입력 시 API 호출 후 옵션 표시, 로딩 중 스피너"

```ts
// 현재 combobox machine에는 isLoading 개념이 없음
// 어디에 넣어야 하나?

// 방법 A: Context에 추가
type ComboboxContext = {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

// 방법 B: effects에서 처리?
effects: [
  {
    watch: (ctx) => ctx.inputValue,
    change: async (ctx, prev, curr) => {
      ctx.setIsLoading(true)
      const results = await fetchOptions(curr)
      ctx.setOptions(results)  // setOptions가 없음!
      ctx.setIsLoading(false)
    }
  }
]
```

**문제점**:
- 비동기 결과를 받아서 "옵션 목록"을 업데이트해야 하는데, 옵션은 Shell(index.tsx)에서 관리
- machine은 옵션을 "받기만" 하고 "설정"할 방법이 없음
- race condition 처리(이전 요청 취소)를 어디서 하나?

---

### 실패 2: Delayed Transition

**요구사항**: "서브메뉴 트리거에 300ms hover 시 자동으로 열기"

```ts
// XState
states: {
  idle: {
    on: { HOVER_SUBMENU_TRIGGER: 'hovering' }
  },
  hovering: {
    after: { 300: 'submenuOpen' },
    on: { HOVER_OUT: 'idle' }
  }
}

// event-machine - 어떻게?
effects: [
  {
    watch: (ctx) => ctx.hoveredTriggerId,
    enter: (ctx) => {
      const timer = setTimeout(() => {
        // 여기서 send를 어떻게 호출하지?
        // ctx에서 send에 접근할 방법이 없음
      }, 300)
      return () => clearTimeout(timer)
    }
  }
]
```

**문제점**: effects 안에서 machine의 `send`를 호출할 수 없음. setter를 직접 호출해야 하는데, 이러면 when 조건을 우회하게 됨.

---

### 실패 3: 애니메이션 중 상태

**요구사항**: "드롭다운 닫히는 애니메이션 중에는 다시 열기 이벤트 무시"

```ts
// XState - 상태로 표현
states: {
  closed: { on: { OPEN: 'opening' } },
  opening: {
    after: { 200: 'open' },
    // OPEN, CLOSE 이벤트 자동 무시 (정의 안 함)
  },
  open: { on: { CLOSE: 'closing' } },
  closing: {
    after: { 200: 'closed' },
    // 이벤트 무시
  }
}

// event-machine - 모든 이벤트에 guard 추가 필요
on: {
  OPEN: [
    { when: (ctx) => ctx.isAnimating, do: 'noop' },
    { when: (ctx) => ctx.isOpen, do: 'noop' },
    { do: 'open' }
  ],
  CLOSE: [
    { when: (ctx) => ctx.isAnimating, do: 'noop' },
    { when: (ctx) => !ctx.isOpen, do: 'noop' },
    { do: 'close' }
  ]
}
```

**문제점**: "특정 상태에서는 이벤트 자체를 받지 않는다"는 표현이 불가능. 모든 이벤트에 동일한 guard 반복 필요.

---

### 실패 4: 여러 Machine 간 조율

**요구사항**: "Modal 안의 Combobox - Combobox 열릴 때 Modal의 focus trap 일시 해제"

```ts
// 현재 구조
// Modal: modalMachine + focus-trap 라이브러리
// Combobox: comboboxMachine

// 문제: 두 machine이 서로를 모름
// Combobox가 열릴 때 Modal에게 알려줘야 함

// 해결책?
// 1. 상위 컴포넌트에서 직접 조율 - machine 밖에서 처리
// 2. Context에 콜백 주입 - 지저분해짐
// 3. 전역 이벤트 버스 - machine 철학과 맞지 않음
```

**문제점**: machine 간 통신 메커니즘 없음

---

## Part 2. 구조적 한계

| 문제 | 설명 | 심각도 |
|------|------|--------|
| **명시적 상태 없음** | 조건 조합으로만 상태 표현 → 복잡해지면 폭발 | 높음 |
| **Delayed transition 미지원** | setTimeout을 직접 관리해야 함 | 중간 |
| **Parallel states 미지원** | 독립적인 상태 축 표현 어려움 | 중간 |
| **Machine 간 통신 없음** | 중첩 컴포넌트 조율 어려움 | 높음 |
| **effects에서 send 불가** | setter 직접 호출 → when 조건 우회 | 높음 |
| **비동기 결과 처리** | 외부 데이터를 machine이 받을 방법 부족 | 높음 |

---

## Part 3. 해결책

### 해결 1: effects에서 send 사용 가능하게

```ts
// 현재 - setter 직접 호출, when 조건 우회됨
effects: [
  {
    watch: (ctx) => ctx.hoveredId,
    enter: (ctx) => {
      ctx.setOpen(true)
    }
  }
]

// 개선안 - send를 context에 포함
type ComboboxContext = {
  // ...
  send: Send<ComboboxEvents>
}

effects: [
  {
    watch: (ctx) => ctx.hoveredId,
    enter: (ctx) => {
      const timer = setTimeout(() => ctx.send('OPEN'), 300)
      return () => clearTimeout(timer)
    }
  }
]
```

---

### 해결 2: 이벤트 그룹 Guard

```ts
// 현재 - 모든 이벤트에 반복
on: {
  KEY_ARROW_DOWN: [{ when: isLoading, do: 'noop' }, ...],
  KEY_ARROW_UP: [{ when: isLoading, do: 'noop' }, ...],
  KEY_ENTER: [{ when: isLoading, do: 'noop' }, ...],
}

// 개선안 A: 명명된 guard
guards: {
  notLoading: (ctx) => !ctx.isLoading
},
on: {
  KEY_ARROW_DOWN: { guard: 'notLoading', handler: [...] },
  KEY_ARROW_UP: { guard: 'notLoading', handler: [...] },
}

// 개선안 B: 이벤트 필터
eventFilter: (ctx, event) => {
  if (ctx.isLoading && event.startsWith('KEY_')) return false
  return true
}
```

---

### 해결 3: Delayed Action 지원

```ts
// 개선안 - 내장 delay 지원
on: {
  HOVER_TRIGGER: {
    do: 'startHoverTimer',
    after: { 300: 'openSubmenu' }
  }
}
```

---

### 해결 4: 비동기 결과 주입 패턴 명확화

비동기 로직은 Shell에서 처리하고, 결과만 이벤트로 machine에 전달하는 패턴을 가이드라인으로 확립:

```ts
// Shell (index.tsx)
useEffect(() => {
  if (debouncedInput) {
    setIsLoading(true)
    fetchOptions(debouncedInput)
      .then(results => {
        setOptions(results)
        send('FETCH_SUCCESS')
      })
      .catch(() => send('FETCH_ERROR'))
      .finally(() => setIsLoading(false))
  }
}, [debouncedInput])

// Machine
on: {
  FETCH_SUCCESS: 'highlightFirst',
  FETCH_ERROR: 'showError'
}
```

---

## Part 4. 다음 단계

### 1. 우선순위 결정

| 순위 | 문제 | 이유 |
|------|------|------|
| 1 | effects에서 send 사용 | 가장 크리티컬, 현재 패턴이 깨짐 |
| 2 | 이벤트 그룹 guard | DX 개선, 반복 제거 |
| 3 | delayed transition | 나중에 추가 가능 |

### 2. 실제 컴포넌트로 검증

다음 컴포넌트 구현을 시도하며 한계를 검증:

- [ ] **Async Combobox**: API 호출 + 로딩 상태 + race condition 처리
- [ ] **Nested Menu with hover delay**: 300ms hover 후 서브메뉴 열기
- [ ] **Modal + Combobox 조합**: focus trap 조율

### 3. API 설계 확정

- send를 context에 넣을지, 별도 방법 제공할지
- guard 그룹 문법 확정
- delay 지원 방식

### 4. 문서화

- "이 패턴은 이렇게 구현한다" 레시피
- "이건 event-machine 범위 밖이다" 경계 명확화
- effects vs actions 책임 분리 가이드라인
