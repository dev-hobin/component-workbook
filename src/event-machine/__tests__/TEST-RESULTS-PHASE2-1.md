# Phase 2-1 테스트 결과: 복합 watch (shallowEqual)

## 개요

Phase 2-1에서는 `shallowEqual` 함수를 구현하여 복합 watch (배열)를 지원합니다.

## 변경 사항

### shallowEqual 함수 추가

```ts
function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  // 배열 비교
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  return false;
}
```

### 비교 로직 변경

```ts
// Before
if (prev !== curr) { ... }

// After
if (!shallowEqual(prev, curr)) { ... }
```

---

## 테스트 1: 타입 체크

**방법:** `pnpm build`

**결과:** PASS

---

## 테스트 2: Vanilla 런타임

### 단일 값 비교 (기존 동작 유지)

**결과:** PASS - 값이 다를 때만 change 트리거

### 복합 watch (배열)

**결과:** PASS

```
change: [undefined] → [x,1]     // 초기
change: [x,1] → [y,1]           // a만 변경
change: [y,1] → [y,2]           // b만 변경
(no change)                      // 같은 값 - 트리거 안 됨
```

### 회귀 테스트

- Phase 1-1: PASS
- Phase 1-2: PASS

---

## 테스트 3: React 런타임

**테스트 시나리오:**

| 시나리오 | 예상 동작 | 결과 |
|---------|----------|------|
| 입력창에 텍스트 입력 | change 트리거 | PASS |
| 모드 버튼 클릭 | change 트리거 (inputValue 동일해도) | PASS |
| 같은 모드 버튼 다시 클릭 | change 트리거 안 됨 | PASS |

---

## 사용 예시

```ts
effects: [{
  // 복합 watch - inputValue 또는 mode 변경 시 트리거
  watch: (ctx) => [ctx.inputValue, ctx.mode] as const,
  change: (ctx, prev, curr, { send }) => {
    // prev: [prevInputValue, prevMode] | undefined
    // curr: [currInputValue, currMode]
  }
}]
```

---

## 결론

Phase 2-1 기능이 정상 동작함을 확인:

1. **기존 동작 유지:** 단일 값 비교는 기존과 동일
2. **복합 watch:** 배열 요소 중 하나라도 변경 시 트리거
3. **shallowEqual:** 같은 값이면 트리거 안 됨
4. **회귀 테스트:** Phase 1-1, 1-2 모두 정상 동작
