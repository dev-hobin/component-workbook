/**
 * 외부(onClick 같은 prop 핸들러)와 내부(컴포넌트 자체 로직용) 이벤트 핸들러를
 * 합성할 때 사용하는 유틸입니다.
 *
 * 기본 동작:
 * - external → internal 순서로 호출
 * - external 에서 event.preventDefault() 를 호출하면 internal 은 실행되지 않음
 *   (브라우저 기본 동작이 preventDefault 로 취소되는 semantics 를 그대로 가져온 것)
 */
export type EventHandler<E> = ((event: E) => void) | undefined

export interface ComposeEventHandlersOptions {
  /**
   * true 인 경우, external 핸들러 실행 후 event.defaultPrevented 가 true 이면
   * internal 핸들러를 실행하지 않습니다. (기본값: true)
   */
  checkForDefaultPrevented?: boolean
}

/**
 * 외부 핸들러가 내부 동작을 "cancel" 할 수 있는 compose 함수.
 *
 * 사용 예:
 *
 *   <button
 *     onClick={composeEventHandlers(props.onClick, (event) => {
 *       // 내부 기본 동작 (예: 메뉴 열기)
 *     })}
 *   />
 *
 *   // 사용자가 이렇게 쓰면:
 *   <MyButton
 *     onClick={(event) => {
 *       event.preventDefault(); // 내부 기본 동작까지 막힘
 *     }}
 *   />
 */
export function composeEventHandlers<E extends { defaultPrevented?: boolean }>(
  external: EventHandler<E>,
  internal: EventHandler<E>,
  options: ComposeEventHandlersOptions = {},
): (event: E) => void {
  const { checkForDefaultPrevented = true } = options

  // 둘 다 없으면 매번 클로저를 새로 만들 필요가 없으니 noop 반환
  if (!external && !internal) {
    return () => {}
  }

  // 하나만 있으면 그대로 반환해서 불필요한 래핑을 피함
  if (!external || !internal) {
    return (external ?? internal) as (event: E) => void
  }

  return (event: E) => {
    // 1) 외부 핸들러 먼저 실행
    external(event)

    // 2) 외부에서 preventDefault 했다면 내부 동작은 취소
    if (checkForDefaultPrevented && event.defaultPrevented) {
      return
    }

    // 3) 내부 핸들러 실행
    internal(event)
  }
}
