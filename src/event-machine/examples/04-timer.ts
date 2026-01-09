/**
 * 예시 4: Timer
 * 
 * effects와 cleanup 사용
 * - effects: enter에서 interval 시작
 * - cleanup: enter 반환값으로 cleanup 함수
 * - change: 값 변경 감지
 * - effect() 헬퍼로 타입 추론
 */

import { useState, useMemo, useCallback } from 'react';
import { effect, useEventMachine, createEventMachine } from '../index';

// ============================================
// 1. Context 타입 정의
// ============================================

type TimerContext = {
  isRunning: boolean;
  elapsed: number;  // ms
  interval: number;  // ms (tick 간격)
  setIsRunning: (v: boolean) => void;
  setElapsed: (n: number) => void;
  tick: () => void;
};

// ============================================
// 2. Events 타입 정의
// ============================================

type TimerEvents = {
  START: undefined;
  STOP: undefined;
  RESET: undefined;
  TOGGLE: undefined;
  SET_INTERVAL: { ms: number };
};

// ============================================
// 3. Computed 타입 정의
// ============================================

type TimerComputed = {
  seconds: number;
  minutes: number;
  formatted: string;
};

// ============================================
// 4. Machine 정의 (createEventMachine 사용)
// ============================================

const timerMachine = createEventMachine<
  TimerContext,
  TimerEvents,
  TimerComputed,
  'noop' | 'start' | 'stop' | 'reset' | 'setInterval'
>({
  computed: {
    seconds: (ctx) => Math.floor(ctx.elapsed / 1000) % 60,
    minutes: (ctx) => Math.floor(ctx.elapsed / 60000),
    formatted: (ctx) => {
      const mins = Math.floor(ctx.elapsed / 60000);
      const secs = Math.floor(ctx.elapsed / 1000) % 60;
      const ms = Math.floor((ctx.elapsed % 1000) / 10);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    },
  },

  on: {
    START: [
      { when: (ctx) => ctx.isRunning, do: 'noop' },  // 이미 실행 중
      { do: 'start' },
    ],

    STOP: [
      { when: (ctx) => !ctx.isRunning, do: 'noop' },  // 이미 정지
      { do: 'stop' },
    ],

    TOGGLE: [
      { when: (ctx) => ctx.isRunning, do: 'stop' },
      { do: 'start' },
    ],

    RESET: 'reset',

    SET_INTERVAL: 'setInterval',
  },

  effects: [
    {
      // isRunning이 true가 되면 interval 시작
      watch: (ctx) => ctx.isRunning,
      
      enter: (ctx) => {
        console.log(`Timer started (interval: ${ctx.interval}ms)`);
        
        // interval 시작
        const id = setInterval(() => {
          ctx.tick();
        }, ctx.interval);

        // cleanup 함수 반환 - 컴포넌트 언마운트 또는 isRunning이 false가 될 때 호출
        return () => {
          console.log('Timer interval cleared');
          clearInterval(id);
        };
      },

      exit: () => {
        console.log('Timer stopped');
      },
    },
    // effect() 헬퍼 사용 - prev, curr 타입 추론됨 (number)
    effect({
      watch: (ctx) => Math.floor(ctx.elapsed / 1000),  // 초 단위로만 감지
      change: (_, prev, curr) => {
        // prev: number | undefined, curr: number 로 추론됨
        if (prev !== undefined) {
          console.log(`Elapsed: ${curr}s`);
        }
      },
    })
  ],

  actions: {
    noop: () => {},
    start: (ctx) => ctx.setIsRunning(true),
    stop: (ctx) => ctx.setIsRunning(false),
    reset: (ctx) => {
      ctx.setIsRunning(false);
      ctx.setElapsed(0);
    },
    setInterval: (_, payload: { ms: number }) => {
      console.log(`Interval set to ${payload.ms}ms`);
    },
  },
});

// ============================================
// 5. Hook
// ============================================

type UseTimerProps = {
  interval?: number;  // ms
  autoStart?: boolean;
};

export function useTimer(props: UseTimerProps = {}) {
  const { interval = 10, autoStart = false } = props;

  const [isRunning, setIsRunning] = useState(autoStart);
  const [elapsed, setElapsed] = useState(0);

  const tick = useCallback(() => {
    setElapsed((prev) => prev + interval);
  }, [interval]);

  const ctx = useMemo<TimerContext>(
    () => ({
      isRunning,
      elapsed,
      interval,
      setIsRunning,
      setElapsed,
      tick,
    }),
    [isRunning, elapsed, interval, tick]
  );

  const { send, computed } = useEventMachine(timerMachine, ctx);

  return {
    // State
    isRunning,
    elapsed,
    ...computed,

    // Actions
    start: () => send('START'),
    stop: () => send('STOP'),
    toggle: () => send('TOGGLE'),
    reset: () => send('RESET'),
  };
}

// ============================================
// 6. Stopwatch (확장 예시)
// ============================================

type LapTime = {
  id: number;
  elapsed: number;
  formatted: string;
};

export function useStopwatch() {
  const timer = useTimer({ interval: 10 });
  const [laps, setLaps] = useState<LapTime[]>([]);
  const [lapId, setLapId] = useState(0);

  const lap = () => {
    if (!timer.isRunning) return;
    
    setLapId((prev) => prev + 1);
    setLaps((prev) => [
      ...prev,
      {
        id: lapId,
        elapsed: timer.elapsed,
        formatted: timer.formatted,
      },
    ]);
  };

  const reset = () => {
    timer.reset();
    setLaps([]);
    setLapId(0);
  };

  return {
    ...timer,
    laps,
    lap,
    reset,
  };
}

// ============================================
// 7. 사용 예시
// ============================================

/*
function Timer() {
  const timer = useTimer();

  return (
    <div>
      <div className="display">{timer.formatted}</div>
      
      <div className="controls">
        <button onClick={timer.toggle}>
          {timer.isRunning ? '정지' : '시작'}
        </button>
        <button onClick={timer.reset}>리셋</button>
      </div>
    </div>
  );
}

function Stopwatch() {
  const stopwatch = useStopwatch();

  return (
    <div>
      <div className="display">{stopwatch.formatted}</div>
      
      <div className="controls">
        <button onClick={stopwatch.toggle}>
          {stopwatch.isRunning ? '정지' : '시작'}
        </button>
        <button onClick={stopwatch.lap} disabled={!stopwatch.isRunning}>
          랩
        </button>
        <button onClick={stopwatch.reset}>리셋</button>
      </div>

      <ul className="laps">
        {stopwatch.laps.map((lap, i) => (
          <li key={lap.id}>
            Lap {i + 1}: {lap.formatted}
          </li>
        ))}
      </ul>
    </div>
  );
}
*/
