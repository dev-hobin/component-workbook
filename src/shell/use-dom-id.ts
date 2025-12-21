// ============================================
// Id Shell - React 훅 모듈
// ============================================
// Core를 React Context와 연결
// ============================================

import { createContext, useContext } from 'react'
import { type IdGenerator } from '../core/id-core'

const IdContext = createContext<IdGenerator | null>(null)

export const IdProvider = IdContext.Provider

export function useIdGenerator(): IdGenerator {
  const getId = useContext(IdContext)
  if (!getId) {
    throw new Error('useIdGenerator must be used within IdProvider')
  }
  return getId
}

export function useDomId(slot: string, nodeId?: string): string {
  const getId = useIdGenerator()
  return getId(slot, nodeId)
}
