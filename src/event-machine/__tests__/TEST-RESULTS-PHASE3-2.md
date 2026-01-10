# Phase 3-2 테스트 결과: states 실행 로직

## 개요

Phase 3-2에서는 state별 핸들러와 전역 핸들러의 실행 로직을 구현했습니다.

## 변경 사항

### 실행 순서

```ts
// send 함수 내부
function send(event, payload) {
  const state = ctx.state;

  // 1. state별 핸들러 먼저
  if (machine.states?.[state]?.on?.[event]) {
    executeHandler(stateHandler, ...);
  }

  // 2. 전역 핸들러 나중에
  if (machine.on?.[event]) {
    executeHandler(globalHandler, ...);
  }
}
```

### 핵심 동작

- **둘 다 실행:** state별 핸들러와 전역 핸들러가 모두 있으면 둘 다 실행
- **순서:** state별 먼저 → 전역 나중에
- **무시:** 해당 state에 핸들러가 없으면 전역만 실행

---

## 테스트 1: 타입 체크

**방법:** `pnpm build`

**결과:** PASS

---

## 테스트 2: Vanilla 런타임

| 시나리오 | 예상 | 결과 |
|---------|------|------|
| idle + OPEN | state(`open`) → global(`logIdle`) | PASS |
| open + FOCUS | global(`focus`)만 | PASS |
| open + OPEN | state(`logOpen`) → global(`logIdle`) | PASS |
| open + CLOSE | state(`close`)만 | PASS |
| loading + OPEN | global(`logIdle`)만 | PASS |

---

## 테스트 3: 회귀 테스트

- Phase 1-1: PASS
- Phase 1-2: PASS

---

## 테스트 4: React 런타임

| 시나리오 | 예상 동작 | 결과 |
|---------|----------|------|
| idle + OPEN | startLoading → loading | PASS |
| loading + OPEN | open → open | PASS |
| open + CLOSE | close → idle | PASS |
| 모든 상태 + FOCUS | focus (global) | PASS |
| loading + CLOSE | 무시 (핸들러 없음) | PASS |

---

## 테스트 5: 외부 State 변경 (Controlled XState)

**핵심 검증:** 외부에서 state가 변경되어도 machine이 올바르게 동작하는가?

| 시나리오 | 예상 동작 | 결과 |
|---------|----------|------|
| 외부에서 state 변경 | effect가 반응 | PASS |
| 같은 state로 변경 | effect 미반응 (shallowEqual) | PASS |
| 외부 변경 후 send | 새 state 기준으로 핸들러 선택 | PASS |

**테스트 로그:**
```
EXTERNAL: state → open
effect: state changed idle → open
UI: CLOSE clicked (current state: open)
action: close (open → idle)          ← open 기준으로 동작
effect: state changed open → idle
```

---

## 결론

Phase 3-2 states 실행 로직이 정상 동작함을 확인:

1. **실행 순서:** state별 → 전역 순서로 실행
2. **둘 다 실행:** 둘 다 있으면 둘 다 실행 (override 아님)
3. **선택적 실행:** 하나만 있으면 하나만 실행
4. **무시:** 핸들러 없으면 무시
5. **회귀 테스트:** 기존 기능 정상 동작
6. **Controlled XState:** 외부 state 변경에 올바르게 반응
