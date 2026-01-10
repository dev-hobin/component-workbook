# Event Machine 테스트

## 테스트 파일

| 파일 | Phase | 내용 |
|------|-------|------|
| `phase1-1.test.ts` | 1-1 | effects에서 send - 타입 체크 + vanilla 런타임 |
| `Phase1TestComponent.tsx` | 1-1 | effects에서 send - React 런타임 |
| `phase1-2.test.ts` | 1-2 | change cleanup 반환 - 타입 체크 + vanilla 런타임 |
| `Phase1-2TestComponent.tsx` | 1-2 | change cleanup 반환 - React 런타임 |
| `Phase2-1TestComponent.tsx` | 2-1 | 복합 watch (shallowEqual) - React 런타임 |
| `Phase3-2TestComponent.tsx` | 3-2 | states 실행 로직 - React 런타임 |

---

## 테스트 실행 방법

### 1. 타입 체크

```bash
pnpm build
```

### 2. Vanilla 런타임 테스트

**Phase 1-1:**
```bash
npx tsx -e "
import { runVanillaTest } from './src/event-machine/__tests__/phase1-1.test'
console.log('=== Vanilla Runtime Test ===')
const results = runVanillaTest()
results.forEach(r => console.log(r))
"
```

**Phase 1-2:**
```bash
npx tsx -e "
import { runChangeCleanupTest } from './src/event-machine/__tests__/phase1-2.test'
console.log('=== Phase 1-2: Change Cleanup Test ===')
const results = runChangeCleanupTest()
results.forEach(r => console.log(r))
"
```

### 3. React 런타임 테스트

**Phase 1-1:**
1. `src/App.tsx` 수정:
```tsx
import { TestPhase1Component } from './event-machine/__tests__/Phase1TestComponent'

function App() {
  return <TestPhase1Component />
}
```

2. Dev 서버 실행: `pnpm dev`

3. 테스트 시나리오:
   - 박스에 마우스 hover → 300ms 후 "Open!" 표시
   - 300ms 전에 마우스 빼기 → cleanup 로그 확인
   - 열린 후 마우스 빼기 → 닫힘 + exit 로그 확인

**Phase 1-2:**
1. `src/App.tsx` 수정:
```tsx
import { TestPhase1_2Component } from './event-machine/__tests__/Phase1-2TestComponent'

function App() {
  return <TestPhase1_2Component />
}
```

2. Dev 서버 실행: `pnpm dev`

3. 테스트 시나리오:
   - 입력창에 텍스트 입력 (debounce 500ms + fetch 500ms)
   - 빠르게 연속 입력 → 이전 요청 취소 (cleanup 로그 확인)
   - 1초 대기 → 결과 표시

**Phase 2-1:**
1. `src/App.tsx` 수정:
```tsx
import { TestPhase2_1Component } from './event-machine/__tests__/Phase2-1TestComponent'

function App() {
  return <TestPhase2_1Component />
}
```

2. Dev 서버 실행: `pnpm dev`

3. 테스트 시나리오:
   - 입력창에 텍스트 입력 → change 트리거
   - 모드 버튼 클릭 → change 트리거 (inputValue 동일해도)
   - 같은 모드 버튼 다시 클릭 → change 트리거 안 됨 (shallowEqual)

**Phase 3-2:**
1. `src/App.tsx` 수정:
```tsx
import { TestPhase3_2Component } from './event-machine/__tests__/Phase3-2TestComponent'

function App() {
  return <TestPhase3_2Component />
}
```

2. Dev 서버 실행: `pnpm dev`

3. 테스트 시나리오:
   - idle에서 OPEN → loading 전이
   - loading에서 OPEN → open 전이
   - open에서 CLOSE → idle 전이
   - 모든 상태에서 FOCUS → 전역 핸들러 실행

---

## 테스트 결과

각 Phase별 테스트 결과는 `TEST-RESULTS-PHASE*.md` 파일에 기록됨.
