import {
  createContext,
  useContext,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  createComponentStore,
  type ComponentStore,
  type ComponentSnapshot,
} from '../core/component-store'

type ComponentStoreContextValue<
  Role extends string = string,
  Meta extends object = object,
> = {
  store: ComponentStore<Role, Meta>
  snapshot: ComponentSnapshot<Role, Meta>
}

const ComponentStoreContext = createContext<ComponentStoreContextValue | null>(
  null
)

export function ComponentStoreProvider<
  Role extends string = string,
  Meta extends object = object,
>({ children }: { children: ReactNode }) {
  const storeRef = useRef<ComponentStore<Role, Meta>>(null)

  if (!storeRef.current) {
    storeRef.current = createComponentStore<Role, Meta>()
  }

  const snapshot = useSyncExternalStore(
    storeRef.current.subscribe,
    storeRef.current.getSnapshot,
    storeRef.current.getSnapshot
  )

  return (
    <ComponentStoreContext.Provider
      value={{ store: storeRef.current, snapshot }}
    >
      {children}
    </ComponentStoreContext.Provider>
  )
}

export function useComponentStore<
  Role extends string = string,
  Meta extends object = object,
>() {
  const ctx = useContext(ComponentStoreContext)
  if (!ctx) {
    throw new Error(
      'useComponentStore must be used within ComponentStoreProvider'
    )
  }
  return ctx as ComponentStoreContextValue<Role, Meta>
}

export function useSnapshot<
  Role extends string = string,
  Meta extends object = object,
>() {
  const { snapshot } = useComponentStore<Role, Meta>()
  return snapshot
}
