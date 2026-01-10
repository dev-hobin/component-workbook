# Phase 1-1 테스트 결과: effects에서 send 사용

> 테스트 일시: 2026-01-10

## 테스트 항목

| # | 항목 | 대상 | 결과 |
|---|------|------|------|
| 1 | 타입 체크 | createEventMachine (vanilla) | ✅ 통과 |
| 2 | 타입 체크 | useEventMachine (React) | ✅ 통과 |
| 3 | 타입 체크 | 기존 코드 호환성 (helpers 안 씀) | ✅ 통과 |
| 4 | 런타임 테스트 | createEventMachine (vanilla) | ✅ 통과 |
| 5 | 빌드 테스트 | 기존 accordion machine | ✅ 통과 |
| 6 | 런타임 테스트 | useEventMachine (React) | ✅ 통과 |

---

## 테스트 1: createEventMachine (vanilla) 타입 체크

effects에서 send 사용 가능한지 확인:

```ts
effects: [
  {
    watch: (ctx) => ctx.hoveredId,
    // enter에서 send 사용 + cleanup 반환
    enter: (_ctx, { send }) => {
      const timer = setTimeout(() => send('DELAYED_OPEN'), 300)
      return () => clearTimeout(timer)
    },
    // exit에서 send 사용
    exit: (_ctx, { send }) => {
      send('CLOSE')
    },
    // change에서 send 사용 + payload 전달
    change: (_ctx, _prev, _curr, { send }) => {
      send('FETCH_SUCCESS', { data: 'test' })
    },
  },
]
```

**결과**: ✅ 타입 에러 없음

---

## 테스트 2: useEventMachine (React) 타입 체크

EventMachine 타입으로 직접 정의 후 useEventMachine에 전달:

```ts
const machine: EventMachine<TestContext, TestEvents, Record<string, never>> = {
  on: { OPEN: 'open', CLOSE: 'close' },
  effects: [
    {
      watch: (ctx) => ctx.isOpen,
      enter: (_ctx, { send }) => { send('OPEN') },
      change: (_ctx, _prev, _curr, { send }) => { send('CLOSE') },
    },
  ],
  actions: { ... }
}

const { send, computed } = useEventMachine(machine, ctx)
```

**결과**: ✅ 타입 에러 없음

---

## 테스트 3: 기존 코드 호환성

helpers 인자 없이도 동작하는지 확인:

```ts
effects: [
  {
    watch: (ctx) => ctx.hoveredId,
    // helpers 안 써도 타입 에러 없어야 함
    change: (ctx) => {
      console.log('changed:', ctx.hoveredId)
    },
  },
]
```

**결과**: ✅ 타입 에러 없음 (기존 코드 호환)

---

## 테스트 4: Vanilla 런타임 테스트

```bash
npx tsx -e "import { runVanillaTest } from './src/event-machine/__test-phase1-1'; ..."
```

**출력**:
```
=== Vanilla Runtime Test ===
setIsOpen(true)
after OPEN: isOpen=true
setIsOpen(false)
after CLOSE: isOpen=false
after evaluate with hoveredId='item-1'
cleanup called
```

**결과**: ✅ send, evaluate, cleanup 모두 정상 동작

---

## 테스트 5: 기존 코드 빌드 테스트

```bash
pnpm build
```

기존 accordion machine 포함 전체 빌드:

```
✓ 54 modules transformed.
✓ built in 1.09s
```

**결과**: ✅ 기존 코드 깨지지 않음

---

## 테스트 6: useEventMachine 런타임 테스트 (React)

테스트 컴포넌트(`__TestComponent.tsx`)를 dev 서버에서 실행:

**테스트 시나리오**:
- 박스에 마우스 hover → 300ms 후 DELAYED_OPEN 이벤트 → "Open!" 표시
- 마우스 leave → cleanup 실행 + CLOSE 이벤트

**로그 출력**:
```
[오후 10:28:28] UI: mouseenter
[오후 10:28:28] action: setHovered
[오후 10:28:28] effect enter: starting 300ms timer
[오후 10:28:29] effect enter: timer fired, sending DELAYED_OPEN
[오후 10:28:29] action: open
[오후 10:28:34] UI: mouseleave
[오후 10:28:34] action: setUnhovered
[오후 10:28:34] effect cleanup: clearing timer
[오후 10:28:34] effect exit: sending CLOSE
[오후 10:28:34] action: close
```

**결과**: ✅ effects에서 send 정상 동작

---

## 발견된 버그 및 수정

### 버그: React Strict Mode에서 isMountedRef가 false로 유지됨

**원인**:
- Strict Mode는 마운트 → 언마운트 → 재마운트 순서로 실행
- `useRef(true)`는 최초 생성 시에만 값 설정
- 언마운트 cleanup에서 `false`로 설정 후 재마운트에서 복원 안 됨

**수정**:
```ts
// Before
const isMountedRef = useRef(true);
useEffect(() => {
  return () => { isMountedRef.current = false; };
}, []);

// After
const isMountedRef = useRef(true);
useEffect(() => {
  isMountedRef.current = true;  // 마운트 시 명시적 설정
  return () => { isMountedRef.current = false; };
}, []);
```

---

## 결론

Phase 1-1 **완료**:
- ✅ 타입 체크 통과
- ✅ vanilla 런타임 동작 확인
- ✅ React 런타임 동작 확인
- ✅ 기존 코드 호환
- ✅ React Strict Mode 호환
