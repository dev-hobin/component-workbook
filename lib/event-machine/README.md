# Event Machine

**상태 없는 선언적 이벤트 핸들러**

상태머신(State Machine)에서 "상태(State)"를 빼고, 이벤트 → 조건 → 액션만 남긴 패턴.

```
State Machine  = 상태 + 이벤트 + 전이
Event Machine  = 이벤트 + 조건 + 액션 (상태 없음!)
```

## 특징

- **~70줄** 핵심 런타임
- **Framework-agnostic**: React, Vue, Svelte, Solid 모두 지원 가능
- **타입 안전한 Payload**: `send('SELECT', { id })` 자동 완성
- **열린 계**: Props 변경에 자연스럽게 반응
- **선언적**: 조건부 로직이 한눈에 보임

## 설치

```bash
# 그냥 파일 복사
cp event-machine/index.ts your-project/
```

## 기본 사용법

```typescript
import { useEventMachine, EventMachine } from './event-machine';

// 1. Context 타입 정의
type Context = {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
};

// 2. Events 타입 정의 (payload 포함)
type Events = {
  TOGGLE: void;           // payload 없음
  OPEN: void;
  CLOSE: void;
  SET: { value: boolean }; // payload 있음
};

// 3. Machine 정의
const machine: EventMachine<Context, Events> = {
  on: {
    TOGGLE: [
      { when: ctx => ctx.isOpen, do: 'close' },
      { do: 'open' },
    ],
    OPEN: 'open',
    CLOSE: 'close',
    SET: 'set',
  },
  
  actions: {
    open: ctx => ctx.setIsOpen(true),
    close: ctx => ctx.setIsOpen(false),
    set: (ctx, { value }) => ctx.setIsOpen(value),
  },
};

// 4. Hook에서 사용
function useDisclosure() {
  const [isOpen, setIsOpen] = useState(false);
  const ctx = useMemo(() => ({ isOpen, setIsOpen }), [isOpen]);
  
  const send = useEventMachine(machine, ctx);
  
  return {
    isOpen,
    toggle: () => send('TOGGLE'),
    open: () => send('OPEN'),
    set: (value: boolean) => send('SET', { value }),
  };
}
```

## API

### EventMachine<TContext, TEvents>

```typescript
type EventMachine<TContext, TEvents> = {
  on: { [K in keyof TEvents]?: Handler };  // 이벤트 핸들러
  always?: Rule[];                         // 자동 평가 규칙
  effects?: Effect[];                      // 사이드 이펙트
  actions: Record<string, Action>;         // 액션 구현
};
```

### Events 타입 정의

```typescript
type MyEvents = {
  // payload 없음
  TOGGLE: void;
  CLEAR: void;
  
  // payload 있음
  SELECT: { id: string };
  FOCUS: { id: string; scroll?: boolean };
  INPUT: { value: string };
};

// 사용
send('TOGGLE');                          // OK
send('SELECT', { id: 'item-1' });        // OK
send('SELECT');                          // TS Error!
send('TOGGLE', { id: 'x' });             // TS Error!
```

### Handler (조건부 규칙)

```typescript
on: {
  // 단순: 바로 액션 실행
  OPEN: 'open',

  // 조건부: 첫 번째 매칭 규칙 실행
  TOGGLE: [
    { when: ctx => ctx.disabled, do: 'noop' },
    { when: ctx => ctx.isOpen, do: 'close' },
    { do: 'open' },  // default
  ],
  
  // payload 조건
  SELECT: [
    { when: (ctx, { multi }) => multi, do: 'addToSelection' },
    { do: 'select' },
  ],
}
```

### Effects (entry/exit/invoke 대체)

```typescript
effects: [
  {
    watch: ctx => ctx.isOpen,           // 감시할 값
    enter: ctx => console.log('열림'),   // false → true
    exit: ctx => console.log('닫힘'),    // true → false
    change: (ctx, prev, curr) => {},    // 값 변경 시
  },
]
```

cleanup 반환:

```typescript
effects: [{
  watch: ctx => ctx.isRunning,
  enter: ctx => {
    const id = setInterval(() => ctx.tick(), 1000);
    return () => clearInterval(id);  // cleanup!
  },
}]
```

### Always (자동 평가)

```typescript
always: [
  { when: ctx => ctx.value.length > 10, do: 'setError' },
  { when: ctx => ctx.value.length === 0, do: 'setRequired' },
  { do: 'clearError' },
]
```

## Framework Bindings

핵심 로직은 framework-agnostic. 각 프레임워크용 바인딩만 만들면 됨.

### React (포함됨)

```typescript
const send = useEventMachine(machine, ctx);
```

### Vue (직접 구현)

```typescript
function useEventMachine(machine, ctx: Ref) {
  watch(ctx, (newCtx) => {
    // always, effects 평가
  });
  
  return (event, payload?) => {
    executeHandler(machine.on[event], machine.actions, ctx.value, payload);
  };
}
```

### Svelte / Solid

비슷한 패턴으로 구현 가능.

## 실제 예시: TreeView

```typescript
type TreeEvents = {
  FOCUS: { id: string };
  SELECT: { id: string; multi?: boolean };
  EXPAND: { id: string };
  COLLAPSE: { id: string };
  ARROW_DOWN: void;
  ARROW_UP: void;
};

const treeMachine: EventMachine<TreeContext, TreeEvents> = {
  on: {
    FOCUS: 'focus',
    
    SELECT: [
      { when: (ctx, { multi }) => multi && ctx.multiSelect, do: 'addToSelection' },
      { do: 'select' },
    ],
    
    EXPAND: [
      { when: (ctx, { id }) => !ctx.hasChildren(id), do: 'noop' },
      { do: 'expand' },
    ],
    
    ARROW_DOWN: 'focusNext',
    ARROW_UP: 'focusPrev',
  },
  
  actions: {
    focus: (ctx, { id }) => ctx.setFocusedId(id),
    select: (ctx, { id }) => ctx.setSelectedIds(new Set([id])),
    addToSelection: (ctx, { id }) => ctx.setSelectedIds(new Set([...ctx.selectedIds, id])),
    expand: (ctx, { id }) => ctx.setExpandedIds(new Set([...ctx.expandedIds, id])),
    focusNext: ctx => { /* ... */ },
    focusPrev: ctx => { /* ... */ },
  },
};

// 사용
tree.send('SELECT', { id: 'node-1', multi: true });
tree.send('EXPAND', { id: 'folder-1' });
tree.send('ARROW_DOWN');  // payload 없음
```

## XState와 비교

| | XState | Event Machine |
|---|--------|---------------|
| 상태 정의 | 필수 | 없음 |
| 코드량 | ~500줄+ | ~70줄 |
| Payload | `{ type, ...payload }` | 타입 안전 분리 |
| entry/exit | 상태에 연결 | watch 값에 연결 |
| Props 반응 | 어려움 | 자연스러움 |

## 파일 구조

```
event-machine/
├── index.ts              # 핵심 런타임 (~70줄)
├── README.md
└── examples/
    └── useTree.ts        # TreeView 전체 예시
```

## 라이선스

MIT
