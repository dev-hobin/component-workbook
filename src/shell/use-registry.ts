// ============================================
// Registry Shell - React 훅 모듈
// ============================================
// Core를 React와 연결
// Element 매핑은 여기서 담당 (Core는 DOM 모름)
// ============================================

import { useRef, useCallback, useContext, createContext } from 'react'
import {
  type Registry,
  type NodeId,
  type HierarchyShape,
  type RegisterOptions,
  type RegistryNode,
  type PartMetaMap,
  createRegistry,
  registerNode,
  unregisterNode,
  registryToShape,
  makeKey,
  getNodesByPart,
  filterNodesByMeta,
} from '../core/registry-core'

// Re-export for convenience
export type { PartMetaMap, NodeId }

// ============================================
// Types
// ============================================

// Element 매핑용 Key (nodeId 또는 nodeId::part)
type ElementKey = string
type ElementMap = Map<ElementKey, HTMLElement>

/**
 * Registry Context Value
 * PartMetaMap 타입을 전달하면 Part → Meta 타입 추론 지원
 *
 * @example
 * // 기본 사용 (타입 추론 없음)
 * const registry = useRegistryProvider()
 *
 * // 타입 추론 사용
 * type MenuPartMetaMap = { item: { menuId: string } }
 * const registry = useRegistryProvider<MenuPartMetaMap>()
 * registry.filterNodesByMeta('item', (meta) => meta.menuId === 'x')
 * // meta는 자동으로 { menuId: string }으로 추론됨
 */
export type RegistryContextValue<
  PM extends PartMetaMap = Record<string, object>,
> = {
  // 등록/해제 (동기적, 리렌더링 유발하지 않음 - ref 콜백에서 안전)
  register: (
    options: RegisterOptions<string, object> & { element: HTMLElement },
  ) => void
  unregister: (nodeId: NodeId, part?: string | null) => void

  // Element 조회
  getElement: (nodeId: NodeId, part?: string | null) => HTMLElement | null
  getElements: () => ElementMap

  // Part 기반 조회 (타입 추론 지원)
  getNodesByPart: <P extends keyof PM & string>(
    part: P,
  ) => RegistryNode<P, PM[P]>[]

  filterNodesByMeta: <P extends keyof PM & string>(
    part: P,
    predicate: (meta: PM[P]) => boolean,
  ) => RegistryNode<P, PM[P]>[]

  getElementsByPart: <P extends keyof PM & string>(
    part: P,
  ) => Array<{ node: RegistryNode<P, PM[P]>; element: HTMLElement }>

  // Shape 조회 (Tree 등에서 사용)
  getShape: () => HierarchyShape

  // 원본 registry 접근 (고급 사용)
  getRegistry: () => Registry<string, object>
}

// ============================================
// Contexts
// ============================================

export const RegistryContext = createContext<RegistryContextValue | null>(null)

// 부모 ID 전달용 Context (계층 구조에서 사용)
export const ParentIdContext = createContext<NodeId | null>(null)

// ============================================
// Provider Hook
// ============================================

/**
 * Registry Provider 훅
 *
 * @example
 * // 기본 사용 (타입 추론 없음)
 * const registry = useRegistryProvider()
 *
 * // 타입 추론 사용
 * type MenuPartMetaMap = { item: { menuId: string } }
 * const registry = useRegistryProvider<MenuPartMetaMap>()
 * registry.filterNodesByMeta('item', (meta) => meta.menuId === 'x')
 */
export function useRegistryProvider<
  PM extends PartMetaMap = Record<string, object>,
>(): RegistryContextValue<PM> {
  // Store는 ref로 관리 (렌더링에 영향 X, React 리렌더링 유발하지 않음)
  const storeRef = useRef<{
    registry: Registry<string, object>
    elements: ElementMap
  }>({
    registry: createRegistry<string, object>(),
    elements: new Map(),
  })
  const store = storeRef.current

  // 동기적으로 registry 업데이트 (ref 콜백에서 안전, 리렌더링 없음)
  const register = useCallback(
    (options: RegisterOptions<string, object> & { element: HTMLElement }) => {
      const { element, ...nodeOptions } = options
      const key = makeKey(options.id, options.part)

      // 이미 같은 element가 등록되어 있으면 skip
      if (store.elements.get(key) === element) {
        return
      }

      store.elements.set(key, element)
      store.registry = registerNode(store.registry, nodeOptions)
    },
    [store],
  )

  const unregister = useCallback(
    (nodeId: NodeId, part?: string | null) => {
      const key = makeKey(nodeId, part)

      // 이미 해제되어 있으면 skip
      if (!store.elements.has(key)) {
        return
      }

      store.elements.delete(key)
      store.registry = unregisterNode(store.registry, nodeId, part)
    },
    [store],
  )

  const getElement = useCallback(
    (nodeId: NodeId, part?: string | null): HTMLElement | null => {
      const key = makeKey(nodeId, part)
      return store.elements.get(key) ?? null
    },
    [store],
  )

  const getElements = useCallback(() => {
    return store.elements
  }, [store])

  const getNodesByPartFn = useCallback(
    (part: string) => {
      return getNodesByPart(store.registry, part)
    },
    [store],
  )

  const filterNodesByMetaFn = useCallback(
    (part: string, predicate: (meta: object) => boolean) => {
      return filterNodesByMeta(store.registry, part, predicate)
    },
    [store],
  )

  const getElementsByPart = useCallback(
    (part: string) => {
      const nodes = getNodesByPart(store.registry, part)
      const result: Array<{
        node: RegistryNode<string, object>
        element: HTMLElement
      }> = []

      for (const node of nodes) {
        const key = makeKey(node.id, node.part)
        const element = store.elements.get(key)
        if (element) {
          result.push({ node, element })
        }
      }

      return result
    },
    [store],
  )

  const getShape = useCallback(() => {
    return registryToShape(store.registry)
  }, [store])

  const getRegistry = useCallback(() => store.registry, [store])

  // 런타임에는 string 타입이지만 제네릭 PM으로 타입 변환
  return {
    register,
    unregister,
    getElement,
    getElements,
    getNodesByPart: getNodesByPartFn,
    filterNodesByMeta: filterNodesByMetaFn,
    getElementsByPart,
    getShape,
    getRegistry,
  } as RegistryContextValue<PM>
}

// ============================================
// Consumer Hooks
// ============================================

/**
 * Registry Consumer 훅
 * PartMetaMap 타입을 전달하면 타입 추론 지원
 *
 * @example
 * // 기본 사용
 * const registry = useRegistry()
 *
 * // 타입 추론 사용
 * const registry = useRegistry<MenuPartMetaMap>()
 * registry.filterNodesByMeta('item', (meta) => meta.menuId === 'x')
 */
export function useRegistry<
  PM extends PartMetaMap = Record<string, object>,
>(): RegistryContextValue<PM> {
  const context = useContext(RegistryContext)
  if (!context) {
    throw new Error('useRegistry must be used within RegistryProvider')
  }
  return context as RegistryContextValue<PM>
}

export function useParentId(): NodeId | null {
  return useContext(ParentIdContext)
}
