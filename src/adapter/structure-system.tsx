// structure-system.ts
import React, { useEffect, useSyncExternalStore } from 'react'
import {
  createStructureStore,
  type StructureStore,
  type StructureNodeMeta,
  type NodeId,
  type StructureConfig,
} from '../core/structure-core'
import { useLatestRef } from '../hooks/useLatestRef'

export function createStructureSystem<
  Role extends string,
  ExtraMeta extends object = object,
>(config: StructureConfig<Role>) {
  type Store = StructureStore<Role, ExtraMeta>

  const StructureContext = React.createContext<Store | null>(null)

  function useStructureContext(): Store {
    const ctx = React.useContext(StructureContext)
    if (!ctx) {
      throw new Error(
        'useStructureContext must be used within <StructureSystem.Provider>',
      )
    }
    return ctx
  }

  function Provider(props: { children: React.ReactNode }) {
    const storeRef = React.useRef<Store | null>(null)
    if (!storeRef.current) {
      storeRef.current = createStructureStore<Role, ExtraMeta>()
    }
    return (
      <StructureContext.Provider value={storeRef.current}>
        {props.children}
      </StructureContext.Provider>
    )
  }

  function useNodeRegistration(
    configArg: { id: NodeId } & StructureNodeMeta<Role> & ExtraMeta,
  ) {
    const store = useStructureContext()

    if (!config.roles.includes(configArg.role)) {
      throw new Error(
        `[StructureSystem] 등록하려는 role ${configArg.role}는 허용되지 않은 role입니다.`,
      )
    }

    const configArgRef = useLatestRef(configArg)
    useEffect(() => {
      const configArg = configArgRef.current
      store.registerNode(configArg)

      return () => {
        store.unregisterNode(configArg.id)
      }
    }, [store, configArgRef])
  }

  function useSnapshot() {
    const store = useStructureContext()
    return useSyncExternalStore(
      store.subscribe,
      store.getSnapshot,
      store.getSnapshot,
    )
  }

  function useStore() {
    return useStructureContext()
  }

  return {
    Provider,
    useNodeRegistration,
    useSnapshot,
    useStore,

    Context: StructureContext,
  }
}
