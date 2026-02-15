import { createContext, useContext, type ReactNode } from 'react'
import type { IdMapActions } from './id-map'
import type { ElementRegistry } from './element-registry'

interface RegistrationContextValue {
  idActions: IdMapActions
  registry: ElementRegistry<any>
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null)

export function RegistrationProvider({
  idActions,
  registry,
  children,
}: RegistrationContextValue & { children: ReactNode }) {
  return (
    <RegistrationContext.Provider value={{ idActions, registry }}>
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
