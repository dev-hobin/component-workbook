import { useCallback, useRef } from 'react'

// useStableCallback은 의도적으로 의존성 배열을 비워두어 안정적인 참조를 유지합니다.
// callbackRef.current를 통해 항상 최신 콜백을 호출하므로 의존성 배열이 필요 없습니다.

/**
 * 콜백 함수의 참조를 안정적으로 유지하는 훅
 *
 * 매 렌더링마다 변경되는 콜백 함수를 받아서, 항상 최신 버전을 호출하지만
 * 반환되는 함수 자체는 안정적인 참조를 유지합니다.
 *
 * 이 훅을 사용하면 useEffect나 useLayoutEffect의 의존성 배열에
 * 콜백을 포함하지 않아도 항상 최신 콜백이 호출됩니다.
 *
 * @example
 * ```ts
 * const callback = useStableCallback((value: string) => {
 *   console.log(value)
 * })
 *
 * useEffect(() => {
 *   // callback을 의존성 배열에 넣지 않아도 됨
 *   callback('hello')
 * }, [])
 * ```
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
): (...args: Parameters<T>) => ReturnType<T> {
  const callbackRef = useRef(callback)

  // 매 렌더링마다 최신 콜백으로 업데이트
  callbackRef.current = callback

  // 안정적인 함수 참조 반환
  // callbackRef.current를 사용하므로 의존성 배열이 비어있어도 항상 최신 콜백 호출
  return useCallback((...args: Parameters<T>): ReturnType<T> => {
    return callbackRef.current(...args) as ReturnType<T>
  }, [])
}
