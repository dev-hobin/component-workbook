import { createContext, useContext, type ReactNode } from 'react'
import type { ComponentRegistryActions } from './component-registry'
import type { ElementRegistry } from './element-registry'

interface RegistrationContextValue {
  componentActions: ComponentRegistryActions
  elementRegistry: ElementRegistry<any>
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null)

export function RegistrationProvider({
  componentActions,
  elementRegistry,
  children,
}: RegistrationContextValue & { children: ReactNode }) {
  return (
    <RegistrationContext.Provider
      value={{ componentActions, elementRegistry }}
    >
      {children}
    </RegistrationContext.Provider>
  )
}

export function useRegistration(): RegistrationContextValue {
  const ctx = useContext(RegistrationContext)
  if (!ctx) {
    throw new Error('useRegistration must be used within RegistrationProvider')
  }
  return ctx
}
