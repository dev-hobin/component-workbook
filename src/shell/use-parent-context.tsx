import { createContext, useContext, type ReactNode } from 'react'
import type { NodeId } from '../core/component-store'

const ParentContext = createContext<NodeId | null>(null)

export function ParentProvider({
  id,
  children,
}: {
  id: NodeId
  children: ReactNode
}) {
  return <ParentContext.Provider value={id}>{children}</ParentContext.Provider>
}

export function useParentId(): NodeId | null {
  return useContext(ParentContext)
}
