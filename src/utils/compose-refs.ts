/**
 * 여러 개의 ref를 하나로 합성하는 유틸.
 * DOM node가 mount/unmount 될 때
 * 모든 ref callback 또는 ref object에 동일하게 전달됨.
 */
type AnyRefObject<T> = { current: T | null }

export type ReactRef<T> = React.Ref<T> | undefined | null

export function composeRefs<T>(...refs: ReactRef<T>[]): React.RefCallback<T> {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue

      if (typeof ref === 'function') {
        // callback ref
        ref(node)
      } else {
        // object ref (RefObject / MutableRefObject 어떤 형태든 current만 있으면 됨)
        ;(ref as AnyRefObject<T>).current = node
      }
    }
  }
}
