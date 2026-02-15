import { useCallback, useMemo, useState } from 'react'

export type IdMapKey = string

export function createIdMapKey(value: string, role: string): IdMapKey {
  return `${value}:${role}`
}

export type IdMap = Map<IdMapKey, string>

export type IdMapActions = {
  register: (value: string, role: string, domId: string) => void
  unregister: (value: string, role: string) => void
}

export function useIdMap(): [IdMap, IdMapActions] {
  const [map, setMap] = useState<IdMap>(() => new Map())

  const register = useCallback((value: string, role: string, domId: string) => {
    setMap((prev) => {
      const key = createIdMapKey(value, role)
      if (prev.get(key) === domId) return prev
      const next = new Map(prev)
      next.set(key, domId)
      return next
    })
  }, [])

  const unregister = useCallback((value: string, role: string) => {
    setMap((prev) => {
      const key = createIdMapKey(value, role)
      if (!prev.has(key)) return prev
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }, [])

  const actions = useMemo(() => ({ register, unregister }), [register, unregister])

  return [map, actions]
}
