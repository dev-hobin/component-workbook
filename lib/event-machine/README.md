# Event Machine

**상태 없는 선언적 이벤트 핸들러**

```
State Machine  = 상태 + 이벤트 + 전이
Event Machine  = computed + 이벤트 + 조건 + 액션
```

## 특징

- **~100줄** 핵심 로직 (타입 제외)
- **Framework-agnostic**: React hook + Vanilla
- **computed**: context에서 "상태" 파생
- **타입 안전한 Payload**
- **열린 계**: Props 변경에 자연스럽게 반응

## 사용법

```typescript
import { useEventMachine, EventMachine } from './index';

// 1. 타입 정의
type Context = {
  isOpen: boolean;
  isLoading: boolean;
  setIsOpen: (v: boolean) => void;
};

type Events = {
  TOGGLE: void;
  SET: { value: boolean };
};

type Computed = {
  state: 'closed' | 'open' | 'loading';
  canClose: boolean;
};

// 2. Machine 정의
const machine: EventMachine<Context, Events, Computed> = {
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
    set: (ctx, { value }) => ctx.setIsOpen(value),
  },
};

// 3. React에서 사용
function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const ctx = useMemo(() => ({ isOpen, isLoading, setIsOpen }), [isOpen, isLoading]);
  const send = useEventMachine(machine, ctx);

  return (
    <button onClick={() => send('TOGGLE')}>Toggle</button>
  );
}
```

## API

### EventMachine

```typescript
type EventMachine<TContext, TEvents, TComputed> = {
  computed?: { ... };  // context → 파생값
  on: { ... };         // 이벤트 → 핸들러
  effects?: [ ... ];   // watch 기반 사이드이펙트
  always?: [ ... ];    // 자동 평가 규칙
  actions: { ... };    // 액션 구현
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

### Vanilla

```typescript
import { createEventMachine } from './index';

const machine = createEventMachine(definition);

machine.send('TOGGLE', ctx);
machine.send('SELECT', ctx, { id: 'item-1' });
machine.evaluate(ctx);  // always + effects 평가
machine.getFullContext(ctx);  // computed 포함
machine.cleanup();  // cleanup 실행
```

## XState와 비교

| | XState | Event Machine |
|---|--------|---------------|
| 상태 | `states: { ... }` | `computed: { state }` |
| 상태 변경 | 전이로만 | Props 바꾸면 자동 |
| entry/exit | 상태에 연결 | watch 값에 연결 |
| 코드량 | ~500줄+ | ~100줄 |

## 라이선스

MIT
