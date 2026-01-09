/**
 * Event Machine Examples
 * 
 * 간단한 것부터 복잡한 것까지 모든 기능을 포괄하는 예시들
 * 모든 예시는 createEventMachine을 사용하여 actions 타입 추론
 */

// 01. Counter - 가장 기본
// - 단순 이벤트 (payload 없음)
// - payload 있는 이벤트
// - createEventMachine + TActions
export { useCounter } from './01-counter';

// 02. Disclosure - 조건부 + effects
// - 조건부 규칙 (when)
// - effects (enter/exit)
export { useDisclosure } from './02-disclosure';

// 03. Form - computed + always
// - computed: context에서 파생 값 계산
// - always: context 변경 시 자동 평가
export { useSignupForm } from './03-form';

// 04. Timer - effects + cleanup + effect() 헬퍼
// - effects: enter에서 interval 시작
// - cleanup: enter 반환값으로 cleanup 함수
// - change: 값 변경 감지
// - effect() 헬퍼로 prev/curr 타입 추론
export { useTimer, useStopwatch } from './04-timer';

// 05. TreeView - 모든 기능 복합
// - 조건부 핸들러 (when)
// - payload 있는/없는 이벤트 혼합
// - computed (파생 상태)
// - effects (enter/exit/change)
// - always (자동 평가)
// - TActions 타입으로 19개 액션 자동완성
export { useTree } from './05-tree';
export type { TreeNode } from './05-tree';

/**
 * 기능별 예시 매핑
 * 
 * | 기능                 | 01 | 02 | 03 | 04 | 05 |
 * |----------------------|----|----|----|----|----|
 * | 기본 이벤트          | ✓  | ✓  | ✓  | ✓  | ✓  |
 * | payload              | ✓  |    | ✓  |    | ✓  |
 * | 조건부 핸들러 (when) |    | ✓  | ✓  | ✓  | ✓  |
 * | computed             |    |    | ✓  | ✓  | ✓  |
 * | effects - enter/exit |    | ✓  |    | ✓  | ✓  |
 * | effects - cleanup    |    |    |    | ✓  |    |
 * | effects - change     |    |    |    | ✓  | ✓  |
 * | effect() 헬퍼        |    |    |    | ✓  |    |
 * | always               |    |    | ✓  |    | ✓  |
 * | TActions 타입        | ✓  | ✓  | ✓  | ✓  | ✓  |
 */
