import { createContext, useContext, useRef, type ReactNode } from 'react'
import {
  createComponentStore,
  type ComponentStore,
} from './component-store'

type ComponentStoreContextValue<
  Role extends string = string,
  Meta extends object = object,
> = {
  store: ComponentStore<Role, Meta>
}

const ComponentStoreContext = createContext<ComponentStoreContextValue | null>(
  null,
)

export function ComponentStoreProvider<
  Role extends string = string,
  Meta extends object = object,
>({ children }: { children: ReactNode }) {
  const storeRef = useRef<ComponentStore<Role, Meta>>(null)

  if (!storeRef.current) {
    storeRef.current = createComponentStore<Role, Meta>()
  }

  return (
    <ComponentStoreContext.Provider value={{ store: storeRef.current }}>
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
      'useComponentStore must be used within ComponentStoreProvider',
    )
  }
  return ctx as ComponentStoreContextValue<Role, Meta>
}
