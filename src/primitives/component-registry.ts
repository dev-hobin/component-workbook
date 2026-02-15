import { useCallback, useMemo, useState } from 'react'

export type ComponentKey = string

export function createComponentKey(role: string, value: string): ComponentKey {
  return `${role}:${value}`
}

export type ComponentRegistry = Map<ComponentKey, string>

export type ComponentRegistryActions = {
  register: (role: string, value: string, domId: string) => void
  unregister: (role: string, value: string) => void
}

export function useComponentRegistry(): [
  ComponentRegistry,
  ComponentRegistryActions,
] {
  const [map, setMap] = useState<ComponentRegistry>(() => new Map())

  const register = useCallback(
    (role: string, value: string, domId: string) => {
      setMap((prev) => {
        const key = createComponentKey(role, value)
        if (prev.get(key) === domId) return prev
        const next = new Map(prev)
        next.set(key, domId)
        return next
      })
    },
    [],
  )

  const unregister = useCallback((role: string, value: string) => {
    setMap((prev) => {
      const key = createComponentKey(role, value)
      if (!prev.has(key)) return prev
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }, [])

  const actions = useMemo(
    () => ({ register, unregister }),
    [register, unregister],
  )

  return [map, actions]
}
