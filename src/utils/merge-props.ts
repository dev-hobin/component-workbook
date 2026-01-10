import { composeEventHandlers } from './compose-event-handlers'

type UnknownRecord = Record<string, unknown>
type AnyEventHandler = ((event: unknown) => void) | undefined

const isEventHandlerKey = (key: string) => /^on[A-Z]/.test(key)
const isClassNameKey = (key: string): key is 'className' => key === 'className'
const isStyleKey = (key: string): key is 'style' => key === 'style'

/**
 * T: internal props
 * U: external props (user props)
 *
 * external 이 internal 을 override 하는 형태로 타입이 합쳐짐.
 */
export type MergeProps<T, U> = {
  [K in keyof T | keyof U]: K extends keyof U
    ? U[K]
    : K extends keyof T
      ? T[K]
      : never
}

export function mergeProps<T, U>(internal: T, external: U): MergeProps<T, U> {
  const target: UnknownRecord = { ...(internal as UnknownRecord) }
  const source: UnknownRecord = external as UnknownRecord

  for (const key in source) {
    const next = source[key]
    const prev = target[key]

    // 이벤트 핸들러
    if (isEventHandlerKey(key)) {
      const internalHandler = prev as AnyEventHandler
      const externalHandler = next as AnyEventHandler

      target[key] = internalHandler
        ? composeEventHandlers(internalHandler, externalHandler)
        : externalHandler
      continue
    }

    // className
    if (isClassNameKey(key)) {
      const prevStr = prev as string | undefined
      const nextStr = next as string | undefined

      target[key] =
        prevStr && nextStr ? `${prevStr} ${nextStr}` : (prevStr ?? nextStr)
      continue
    }

    // style
    if (isStyleKey(key)) {
      const prevStyle = prev as Record<string, unknown> | undefined
      const nextStyle = next as Record<string, unknown> | undefined

      target[key] =
        prevStyle && nextStyle
          ? { ...prevStyle, ...nextStyle }
          : (prevStyle ?? nextStyle)
      continue
    }

    // 나머지 props는 단순 override (external 이 이김)
    target[key] = next
  }

  return target as MergeProps<T, U>
}
