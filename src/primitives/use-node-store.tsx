import { createContext, useContext, useRef, type ReactNode } from 'react'
import { createNodeStore, type NodeStore } from './node-store'

const NodeStoreContext = createContext<NodeStore | null>(null)

export function NodeStoreProvider<
  Role extends string = string,
  Meta extends object = object,
>({ children }: { children: ReactNode }) {
  const storeRef = useRef<NodeStore<Role, Meta>>(null)

  if (!storeRef.current) {
    storeRef.current = createNodeStore<Role, Meta>()
  }

  return (
    <NodeStoreContext.Provider value={storeRef.current}>
      {children}
    </NodeStoreContext.Provider>
  )
}

export function useNodeStore<
  Role extends string = string,
  Meta extends object = object,
>(): NodeStore<Role, Meta> {
  const store = useContext(NodeStoreContext)
  if (!store) {
    throw new Error('useNodeStore must be used within NodeStoreProvider')
  }
  return store as NodeStore<Role, Meta>
}
