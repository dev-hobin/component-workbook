# Phase 1-2 테스트 결과: change cleanup 반환

## 개요

Phase 1-2에서는 `effects.change` 콜백에서 cleanup 함수를 반환하여 비동기 작업을 취소할 수 있는 기능을 구현했습니다.

## 변경 사항

### 타입 변경

```ts
// Before
change?: (ctx, prev, curr, helpers) => void

// After
change?: (ctx, prev, curr, helpers) => void | Cleanup
```

### 구현 변경

- `cleanupsRef`를 `enterCleanupsRef`와 `changeCleanupsRef`로 분리
- change 콜백 실행 후 반환값이 함수이면 `changeCleanupsRef`에 저장
- 다음 change 실행 전에 이전 cleanup 호출
- unmount 시 모든 cleanup 호출

---

## 테스트 1: 타입 체크

**방법:** `pnpm build`

**결과:** PASS

```
✓ 36 modules transformed.
✓ built in 988ms
```

---

## 테스트 2: Vanilla 런타임

**방법:**
```bash
npx tsx -e "
import { runChangeCleanupTest } from './src/event-machine/__tests__/phase1-2.test'
const results = runChangeCleanupTest()
results.forEach(r => console.log(r))
"
```

**결과:** PASS

```
change: inputValue changed to "a"
--- after evaluate with "a" ---
change cleanup: aborting fetch for "a"
change: inputValue changed to "ab"
--- after evaluate with "ab" ---
change cleanup: aborting fetch for "ab"
change: inputValue changed to "abc"
--- after evaluate with "abc" ---
change cleanup: aborting fetch for "abc"
--- after cleanup() ---
```

**검증:**
1. 첫 번째 evaluate("a") - change 콜백 호출됨
2. 두 번째 evaluate("ab") - 이전("a") cleanup 먼저 호출, 새 change 실행
3. 세 번째 evaluate("abc") - 이전("ab") cleanup 먼저 호출, 새 change 실행
4. cleanup() 호출 - 마지막("abc") cleanup 호출

---

## 테스트 3: React 런타임

**방법:**
1. App.tsx에서 `TestPhase1_2Component` import
2. `pnpm dev` 실행
3. 브라우저에서 테스트

**테스트 시나리오:**

| 시나리오 | 예상 동작 | 결과 |
|---------|----------|------|
| 입력 후 1초 대기 | debounce(500ms) + fetch(500ms) 후 결과 표시 | PASS |
| 빠른 연속 입력 | 이전 요청 취소(cleanup), 최종 입력만 fetch | PASS |
| 입력 삭제 | cleanup 호출, 빈 값은 fetch 안 함 | PASS |

---

## 결론

Phase 1-2 기능이 정상 동작함을 확인:

1. **타입 체크:** change에서 cleanup 반환 타입 지원
2. **Cleanup 호출 순서:** 다음 change 전에 이전 cleanup 호출됨
3. **비동기 취소 패턴:** AbortController + cleanup으로 debounce/취소 구현 가능
4. **기존 코드 호환:** cleanup 반환하지 않아도 정상 동작 (compatMachine 테스트)
