// ============================================
// Registry Shell - React 훅 모듈
// ============================================
// Core를 React와 연결
// Element 매핑은 여기서 담당
// ============================================

import {
  useRef,
  useCallback,
  useContext,
  createContext,
  useState,
  useMemo,
} from 'react'
import {
  type Registry,
  type NodeId,
  type HierarchyShape,
  createRegistry,
  registerNode,
  unregisterNode,
  registryToShape,
} from '../core/registry-core'

// Element 매핑은 Shell에서
type ElementMap = Map<NodeId, HTMLElement>

export type RegistryContextValue = {
  shape: HierarchyShape
  register: (id: NodeId, parentId: NodeId | null, element: HTMLElement) => void
  unregister: (id: NodeId) => void
  getElement: (id: NodeId) => HTMLElement | null
  getElements: () => ElementMap
}

export const RegistryContext = createContext<RegistryContextValue | null>(null)

// 부모 ID 전달용 Context
export const ParentIdContext = createContext<NodeId | null>(null)

export function useRegistryProvider(): RegistryContextValue {
  const [registry, setRegistry] = useState<Registry>(() => createRegistry())
  const elementsRef = useRef<ElementMap>(new Map())

  const register = useCallback(
    (id: NodeId, parentId: NodeId | null, element: HTMLElement) => {
      setRegistry((prev) => {
        const next = new Map(prev)
        registerNode(next, id, parentId)
        return next
      })
      elementsRef.current.set(id, element)
    },
    [],
  )

  const unregister = useCallback((id: NodeId) => {
    setRegistry((prev) => {
      const next = new Map(prev)
      unregisterNode(next, id)
      return next
    })
    elementsRef.current.delete(id)
  }, [])

  const shape = useMemo(() => registryToShape(registry), [registry])

  const getElement = useCallback((id: NodeId) => {
    return elementsRef.current.get(id) ?? null
  }, [])

  const getElements = useCallback(() => {
    return elementsRef.current
  }, [])

  return {
    shape,
    register,
    unregister,
    getElement,
    getElements,
  }
}

export function useRegistry(): RegistryContextValue {
  const context = useContext(RegistryContext)
  if (!context) {
    throw new Error('useRegistry must be used within RegistryProvider')
  }
  return context
}

export function useParentId(): NodeId | null {
  return useContext(ParentIdContext)
}
