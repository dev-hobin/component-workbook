/**
 * 예시 1: Counter
 * 
 * 가장 기본적인 사용법
 * - 단순 이벤트 (payload 없음)
 * - payload 있는 이벤트
 * - createEventMachine으로 actions 타입 추론
 */

import { useState, useMemo } from 'react';
import { useEventMachine, createEventMachine } from '../index';

// ============================================
// 1. Context 타입 정의
// ============================================

type CounterContext = {
  count: number;
  setCount: (n: number) => void;
};

// ============================================
// 2. Events 타입 정의
// ============================================

type CounterEvents = {
  INCREMENT: undefined;        // payload 없음
  DECREMENT: undefined;        // payload 없음
  SET: { value: number };      // payload 필수
  ADD: { amount: number };     // payload 필수
};

// ============================================
// 3. Machine 정의 (createEventMachine 사용)
// ============================================

const counterMachine = createEventMachine<
  CounterContext, 
  CounterEvents, 
  Record<string, never>,  // no computed
  'increment' | 'decrement' | 'set' | 'add'  // 액션 이름들
>({
  on: {
    INCREMENT: 'increment',   // ✓ 자동완성됨!
    DECREMENT: 'decrement',   // ✓
    SET: 'set',               // ✓
    ADD: 'add',               // ✓
    // ADD: 'asdf',           // ❌ Error - actions에 없음
  },

  actions: {
    increment: (ctx) => ctx.setCount(ctx.count + 1),
    decrement: (ctx) => ctx.setCount(ctx.count - 1),
    set: (ctx, payload: { value: number }) => {
      ctx.setCount(payload.value);
    },
    add: (ctx, payload: { amount: number }) => {
      ctx.setCount(ctx.count + payload.amount);
    },
  },
});

// ============================================
// 4. Hook
// ============================================

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const ctx = useMemo<CounterContext>(
    () => ({ count, setCount }),
    [count]
  );

  const { send } = useEventMachine(counterMachine, ctx);

  return {
    count,
    increment: () => send('INCREMENT'),
    decrement: () => send('DECREMENT'),
    set: (value: number) => send('SET', { value }),
    add: (amount: number) => send('ADD', { amount }),
  };
}

// ============================================
// 5. Vanilla 사용 예시
// ============================================

/*
// Vanilla에서는 직접 send 사용
const ctx = { count: 0, setCount: (n) => console.log(n) };
counterMachine.send('INCREMENT', ctx);
counterMachine.send('ADD', ctx, { amount: 10 });
*/

// ============================================
// 6. React 사용 예시
// ============================================

/*
function Counter() {
  const { count, increment, decrement, set, add } = useCounter(0);

  return (
    <div>
      <span>{count}</span>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
      <button onClick={() => add(10)}>+10</button>
      <button onClick={() => set(0)}>Reset</button>
    </div>
  );
}
*/
