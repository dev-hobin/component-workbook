# Event Machine

**상태 없는 선언적 이벤트 핸들러**

```
State Machine  = 상태 + 이벤트 + 전이
Event Machine  = computed + 이벤트 + 조건 + 액션
```

## 특징

- **~150줄** 핵심 로직 (타입 제외)
- **Framework-agnostic**: React hook + Vanilla
- **computed**: context에서 "상태" 파생
- **타입 안전**: payload, actions 이름 모두 타입 추론
- **열린 계**: Props 변경에 자연스럽게 반응

## 사용법

```typescript
import { useEventMachine, createEventMachine } from './index';

// 1. 타입 정의
type Context = {
  isOpen: boolean;
  isLoading: boolean;
  setIsOpen: (v: boolean) => void;
};

type Events = {
  TOGGLE: undefined;  // payload 없음
  SET: { value: boolean };  // payload 있음
};

type Computed = {
  state: 'closed' | 'open' | 'loading';
  canClose: boolean;
};

// 2. Machine 정의
const machine = createEventMachine<
  Context,
  Events,
  Computed,
  'noop' | 'open' | 'close' | 'set'  // actions 이름 (자동완성!)
>({
  computed: {
    state: ctx => !ctx.isOpen ? 'closed' : ctx.isLoading ? 'loading' : 'open',
    canClose: ctx => ctx.isOpen && !ctx.isLoading,
  },

  on: {
    TOGGLE: [
      { when: ctx => ctx.state === 'loading', do: 'noop' },
      { when: ctx => ctx.state === 'open', do: 'close' },
      { do: 'open' },
    ],
    SET: 'set',
  },

  effects: [{
    watch: ctx => ctx.state,
    enter: ctx => console.log('opened'),
    exit: ctx => console.log('closed'),
  }],

  actions: {
    noop: () => {},
    open: ctx => ctx.setIsOpen(true),
    close: ctx => ctx.setIsOpen(false),
    set: (ctx, payload: { value: boolean }) => ctx.setIsOpen(payload.value),
  },
});

// 3. React에서 사용
function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const ctx = { isOpen, isLoading, setIsOpen };
  const { send, computed } = useEventMachine(machine, ctx);

  return (
    <div>
      <span>State: {computed.state}</span>
      <button onClick={() => send('TOGGLE')}>Toggle</button>
    </div>
  );
}

// 4. Vanilla에서 사용
machine.send('TOGGLE', ctx);
machine.send('SET', ctx, { value: true });
```

## API

### createEventMachine

메인 API. 타입 추론과 런타임 기능 모두 제공.

```typescript
const machine = createEventMachine<
  TContext,   // context 타입
  TEvents,    // events 타입
  TComputed,  // computed 타입
  TActions    // actions 이름 유니온 (자동완성!)
>({
  computed?: { ... },  // context → 파생값
  on: { ... },         // 이벤트 → 핸들러
  effects?: [ ... ],   // watch 기반 사이드이펙트
  always?: [ ... ],    // 자동 평가 규칙
  actions: { ... },    // 액션 구현
});

// React
const { send, computed } = useEventMachine(machine, ctx);
computed.state;  // 파생 값 접근

// Vanilla
machine.send('EVENT', ctx);
machine.evaluate(ctx);
machine.getComputed(ctx);
machine.cleanup();
```

### Events 타입

```typescript
type Events = {
  TOGGLE: undefined;      // payload 없음 → send('TOGGLE')
  SET: { value: boolean }; // payload 있음 → send('SET', { value: true })
};
```

### Handler

```typescript
on: {
  // 단순
  OPEN: 'open',

  // 조건부 (첫 매칭)
  TOGGLE: [
    { when: ctx => ctx.isLoading, do: 'noop' },
    { when: ctx => ctx.isOpen, do: 'close' },
    { do: 'open' },
  ],

  // payload 조건
  SELECT: [
    { when: (ctx, { multi }) => multi, do: 'addToSelection' },
    { do: 'select' },
  ],
}
```

### Effects

```typescript
effects: [{
  watch: ctx => ctx.state,           // 감시할 값
  enter: ctx => { ... },             // falsy → truthy
  exit: ctx => { ... },              // truthy → falsy
  change: (ctx, prev, curr) => {},   // 매 변경
}]

// cleanup
effects: [{
  watch: ctx => ctx.isRunning,
  enter: ctx => {
    const id = setInterval(() => ctx.tick(), 1000);
    return () => clearInterval(id);  // cleanup
  },
}]
```

### effect() 헬퍼

watch 반환타입에서 prev/curr 타입 추론:

```typescript
import { effect } from './index';

effects: [
  // effect() 없이 - prev, curr은 unknown
  {
    watch: ctx => ctx.count,
    change: (ctx, prev, curr) => { /* prev: unknown, curr: unknown */ },
  },

  // effect() 사용 - 타입 추론됨
  effect({
    watch: ctx => ctx.count,  // number 반환
    change: (ctx, prev, curr) => {
      // prev: number | undefined
      // curr: number
    },
  }),
]
```

## XState와 비교

| | XState | Event Machine |
|---|--------|---------------|
| 상태 | `states: { ... }` | `computed: { state }` |
| 상태 변경 | 전이로만 | Props 바꾸면 자동 |
| entry/exit | 상태에 연결 | watch 값에 연결 |
| 코드량 | ~500줄+ | ~150줄 |

## 라이선스

MIT

---

## 예시 파일들

`examples/` 디렉토리에 간단한 것부터 복잡한 것까지 단계별 예시 포함:

| 파일 | 설명 | 사용 기능 |
|------|------|-----------|
| `01-counter.ts` | 가장 기본 | 이벤트, payload |
| `02-disclosure.ts` | 토글 UI | 조건부 핸들러, effects |
| `03-form.ts` | 폼 검증 | computed, always |
| `04-timer.ts` | 스톱워치 | effects, cleanup, change, effect() |
| `05-tree.ts` | 파일 트리 | **모든 기능 복합** |

```
기능별 예시 매핑

| 기능                 | 01 | 02 | 03 | 04 | 05 |
|----------------------|----|----|----|----|----|
| 기본 이벤트          | ✓  | ✓  | ✓  | ✓  | ✓  |
| payload              | ✓  |    | ✓  |    | ✓  |
| 조건부 핸들러 (when) |    | ✓  | ✓  | ✓  | ✓  |
| computed             |    |    | ✓  | ✓  | ✓  |
| effects - enter/exit |    | ✓  |    | ✓  | ✓  |
| effects - cleanup    |    |    |    | ✓  |    |
| effects - change     |    |    |    | ✓  | ✓  |
| effect() 헬퍼        |    |    |    | ✓  |    |
| always               |    |    | ✓  |    | ✓  |
| TActions 타입        | ✓  | ✓  | ✓  | ✓  | ✓  |
```
