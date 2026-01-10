# Phase 1-1 테스트 결과: effects에서 send + cleanup

## 개요

Phase 1-1에서는 effects 콜백에서 `send`를 사용할 수 있도록 `EffectHelpers`를 추가하고, 모든 콜백에서 cleanup 함수를 반환할 수 있도록 구현했습니다.

## 변경 사항

### 타입 변경

```ts
export type EffectHelpers<TEvents> = {
  send: Send<TEvents>;
};

export type Effect<TContext, TEvents, TWatched> = {
  watch: (ctx: TContext) => TWatched;
  enter?: (ctx, helpers: EffectHelpers<TEvents>) => void | Cleanup | Promise<void>;
  exit?: (ctx, helpers: EffectHelpers<TEvents>) => void | Cleanup;
  change?: (ctx, prev, curr, helpers: EffectHelpers<TEvents>) => void | Cleanup;
};
```

### Cleanup 호출 시점

| 콜백 | cleanup 반환 | 호출 시점 |
|------|-------------|----------|
| enter | `void \| Cleanup \| Promise<void>` | exit, change, unmount |
| exit | `void \| Cleanup` | 다음 enter, unmount |
| change | `void \| Cleanup` | 다음 change, unmount |

---

## 테스트 1: 타입 체크

**방법:** `pnpm build`

**결과:** PASS

---

## 테스트 2: Vanilla 런타임

**방법:**
```bash
npx tsx -e "
import { runVanillaTest } from './src/event-machine/__tests__/phase1-1.test'
const results = runVanillaTest()
results.forEach(r => console.log(r))
"
```

**결과:** PASS

---

## 테스트 3: React 런타임

**방법:**
1. App.tsx에서 `TestPhase1Component` import
2. `pnpm dev` 실행
3. 브라우저에서 테스트

**테스트 시나리오:**

| 시나리오 | 예상 동작 | 결과 |
|---------|----------|------|
| hover 후 300ms 대기 | enter 타이머 완료, "Open!" 표시 | PASS |
| 300ms 전에 unhover | enter cleanup 호출, 타이머 취소 | PASS |
| unhover 시 | exit 호출, CLOSE 전송 | PASS |
| unhover 후 500ms 내 재hover | exit cleanup 호출, fade-out 취소 | PASS |

---

## 버그 수정

### React Strict Mode 호환성

**문제:** Strict Mode에서 `isMountedRef`가 false로 남아 send가 동작 안 함

**원인:** Strict Mode는 mount → unmount → remount 사이클 실행. `useRef(true)`는 초기값만 설정하고 remount 시 업데이트 안 됨.

**해결:**
```ts
useEffect(() => {
  isMountedRef.current = true;  // 명시적으로 설정
  return () => {
    isMountedRef.current = false;
    // cleanup...
  };
}, []);
```

---

## 결론

Phase 1-1 기능이 정상 동작함을 확인:

1. **effects에서 send:** enter/exit/change에서 `{ send }` 헬퍼 사용 가능
2. **enter cleanup:** 타이머/구독 정리 가능
3. **exit cleanup:** 애니메이션 취소 등 정리 가능
4. **change cleanup:** debounce/비동기 취소 가능 (Phase 1-2에서 상세 테스트)
5. **React Strict Mode 호환:** safeSend + isMountedRef로 안전하게 처리
