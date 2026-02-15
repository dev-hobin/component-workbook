import { useCallback, useEffect, useId, useRef } from 'react'
import { useRegistration } from './registration-context'

interface UseRegisterOptions<Meta extends Record<string, unknown>> {
  role: string
  value?: string
  id?: string
  meta?: Meta
}

interface UseRegisterReturn {
  value: string
  domId: string
  ref: (element: HTMLElement | null) => void
}

export function useRegister<Meta extends Record<string, unknown> = Record<string, unknown>>(
  options: UseRegisterOptions<Meta>,
): UseRegisterReturn {
  const { componentActions, elementRegistry } = useRegistration()
  const { role, id: userDomId, meta } = options

  const generatedId = useId()
  const value = options.value ?? generatedId
  const domId = userDomId ?? generatedId

  const metaRef = useRef(meta)
  metaRef.current = meta

  const elementRef = useRef<HTMLElement | null>(null)
  const mountedRef = useRef(false)

  // Ref callback: only handles ElementRegistry (no React state updates)
  const ref = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element
      mountedRef.current = !!element
      if (element) {
        elementRegistry.set(role, value, element, metaRef.current ?? ({} as Meta))
      } else {
        elementRegistry.delete(role, value)
      }
    },
    [role, value, elementRegistry],
  )

  // Effect: handles ComponentRegistry (React state) — safe from infinite loops
  useEffect(() => {
    componentActions.register(role, value, domId)
    return () => {
      componentActions.unregister(role, value)
    }
  }, [role, value, domId, componentActions])

  // Meta sync effect
  useEffect(() => {
    if (elementRef.current && meta) {
      elementRegistry.updateMeta(role, value, meta)
    }
  })

  return { value, domId, ref }
}
