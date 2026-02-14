/**
 * 컴포넌트 내부 핸들러와 사용자 핸들러(prop)를 합성합니다.
 *
 * 실행 순서: overrideHandler → originalHandler
 * overrideHandler에서 event.preventDefault()를 호출하면 originalHandler는 실행되지 않음.
 */
export type EventHandler<E> = ((event: E) => void) | undefined

export interface ComposeEventHandlersOptions {
  /**
   * true인 경우, overrideHandler 실행 후 event.defaultPrevented가 true이면
   * originalHandler를 실행하지 않습니다. (기본값: true)
   */
  checkForDefaultPrevented?: boolean
}

/**
 * 사용자 핸들러(override)가 내부 동작(original)을 "cancel"할 수 있는 compose 함수.
 *
 * @param originalHandler - 컴포넌트 내부 기본 동작 핸들러
 * @param overrideHandler - 사용자(외부)가 전달한 prop 핸들러. 먼저 실행됨.
 */
export function composeEventHandlers<E extends { defaultPrevented?: boolean }>(
  originalHandler: EventHandler<E>,
  overrideHandler: EventHandler<E>,
  options: ComposeEventHandlersOptions = {},
): (event: E) => void {
  const { checkForDefaultPrevented = true } = options

  if (!overrideHandler && !originalHandler) {
    return () => {}
  }

  if (!overrideHandler || !originalHandler) {
    return (overrideHandler ?? originalHandler) as (event: E) => void
  }

  return (event: E) => {
    // 1) 사용자 핸들러 먼저 실행
    overrideHandler(event)

    // 2) preventDefault 했다면 내부 동작은 취소
    if (checkForDefaultPrevented && event.defaultPrevented) {
      return
    }

    // 3) 내부 핸들러 실행
    originalHandler(event)
  }
}
