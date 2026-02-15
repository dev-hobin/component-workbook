import { useCallback, useEffect, useRef } from 'react'
import { useRegistration } from './registration-context'
import { createDomId } from './create-dom-id'

interface UseRegisterOptions<Meta extends Record<string, unknown>> {
  value: string
  role: string
  id?: string
  meta?: Meta
}

interface UseRegisterReturn {
  domId: string
  ref: (element: HTMLElement | null) => void
}

export function useRegister<Meta extends Record<string, unknown> = Record<string, unknown>>(
  options: UseRegisterOptions<Meta>,
): UseRegisterReturn {
  const { idActions, registry } = useRegistration()
  const { value, role, id: userDomId, meta } = options

  const domId = userDomId ?? createDomId(role, value)

  const metaRef = useRef(meta)
  metaRef.current = meta

  const elementRef = useRef<HTMLElement | null>(null)
  const mountedRef = useRef(false)

  // Ref callback: only handles mutable registry (no React state updates)
  const ref = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element
      mountedRef.current = !!element
      if (element) {
        registry.set(value, role, element, metaRef.current ?? ({} as Meta))
      } else {
        registry.delete(value, role)
      }
    },
    [value, role, registry],
  )

  // Effect: handles IdMap registration (React state) — safe from infinite loops
  useEffect(() => {
    idActions.register(value, role, domId)
    return () => {
      idActions.unregister(value, role)
    }
  }, [value, role, domId, idActions])

  // Meta sync effect
  useEffect(() => {
    if (elementRef.current && meta) {
      registry.updateMeta(value, role, meta)
    }
  })

  return { domId, ref }
}
