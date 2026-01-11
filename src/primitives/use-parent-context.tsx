import { createContext, useContext, type ReactNode } from 'react'
import type { NodeId } from './node-store'

type ParentContextValue = {
  id: NodeId
  level: number
}

const ParentContext = createContext<ParentContextValue | null>(null)

export function ParentProvider({
  id,
  children,
}: {
  id: NodeId
  children: ReactNode
}) {
  const parent = useContext(ParentContext)
  const level = parent ? parent.level + 1 : 1

  return (
    <ParentContext.Provider value={{ id, level }}>
      {children}
    </ParentContext.Provider>
  )
}

export function useParentId(): NodeId | null {
  const context = useContext(ParentContext)
  return context?.id ?? null
}

export function useLevel(): number {
  const context = useContext(ParentContext)
  return context?.level ?? 1
}
