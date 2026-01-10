# Discussion 01: 근본 문제 정리

> PREMORTEM.md의 여러 실패 케이스를 분석한 결과

## 결론: 두 가지 근본 문제로 귀결됨

| 근본 문제 | 파생 문제들 |
|----------|------------|
| **1. 상태폭발** | 명시적 상태 없음, guard 반복, 조건 조합 폭발 |
| **2. 비동기 처리** | effects에서 send 불가, delayed transition, race condition |

---

## 근본 문제 1: 상태폭발

### 원인: 외부 context 주입의 대가

XState는 **상태(state)가 내부에 있어서** 이벤트 수신 자체를 상태로 제어한다:

```ts
// XState - loading 상태에서는 KEY_* 이벤트 정의 자체가 없음 = 무시
states: {
  idle: { on: { KEY_ARROW_DOWN: 'doSomething' } },
  loading: { /* KEY_ARROW_DOWN 없음 */ }
}
```

event-machine은 **상태가 외부에 있어서** 모든 이벤트에 조건으로 표현해야 한다:

```ts
// event-machine - 모든 이벤트에 guard 반복
on: {
  KEY_ARROW_DOWN: [{ when: (ctx) => ctx.isLoading, do: 'noop' }, ...],
  KEY_ARROW_UP: [{ when: (ctx) => ctx.isLoading, do: 'noop' }, ...],
  KEY_ENTER: [{ when: (ctx) => ctx.isLoading, do: 'noop' }, ...],
}
```

### 결과: 조건 조합 폭발

외부 상태가 늘어날수록 조건 조합이 폭발한다:

```
isOpen × isLoading × isAnimating × hasSelection = 16가지 조합
```

### 파생되는 실패 케이스

- **PREMORTEM 실패 3 (애니메이션 중 상태)**: 모든 이벤트에 `isAnimating` 체크 필요
- **로딩 중 상태**: 모든 KEY_* 이벤트에 `isLoading` 체크 필요
- 조건들이 중첩되면서 가독성 저하

---

## 근본 문제 2: 비동기 처리

### 원인: effects에서 send 접근 불가

effects는 상태 변화에 "반응"만 하고, machine에 "이벤트 발행"을 할 수 없다:

```ts
effects: [
  {
    watch: (ctx) => ctx.inputValue,
    change: async (ctx) => {
      const results = await fetch(...)
      // 여기서 send('FETCH_SUCCESS', results)를 못 함
      // setter 직접 호출 → when 조건 우회됨
      ctx.setOptions(results)
    }
  }
]
```

### 결과: when 조건 우회

setter를 직접 호출하면 machine의 `on` 핸들러를 거치지 않아서:
- guard 조건이 무시됨
- 이벤트 흐름 추적 불가
- 일관성 없는 상태 변경

### 파생되는 실패 케이스

- **PREMORTEM 실패 1 (비동기 데이터 로딩)**: API 결과를 이벤트로 전달 불가
- **PREMORTEM 실패 2 (Delayed Transition)**: setTimeout 안에서 send 호출 불가
- **PREMORTEM 실패 4 (Machine 간 조율)**: 다른 machine에 이벤트 전달 불가
- Race condition 처리 위치 모호

---

## 해결 방향

### 상태폭발 → 이벤트 필터

```ts
eventFilter: (ctx, event) => {
  if (ctx.isLoading && event.startsWith('KEY_')) return false
  if (ctx.isAnimating && ['OPEN', 'CLOSE'].includes(event)) return false
  return true
}
```

### 비동기 → effects에서 send 사용 가능하게

```ts
effects: [
  {
    watch: (ctx) => ctx.hoveredTriggerId,
    enter: (ctx) => {
      const timer = setTimeout(() => ctx.send('OPEN_SUBMENU'), 300)
      return () => clearTimeout(timer)
    }
  }
]
```

---

## 우선순위

| 순위 | 문제 | 이유 |
|------|------|------|
| 1 | **effects에서 send 사용** | 가장 크리티컬, 이걸 해결하면 delayed transition도 해결 |
| 2 | **이벤트 필터** | 상태폭발 완화, DX 개선 |
