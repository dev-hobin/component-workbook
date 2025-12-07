import React, { useSyncExternalStore } from 'react'

export type CompositeConfig<Part extends string> = {
  namespace: string // 'menu', 'tabs', 'list', 'tree' ...
  parts: readonly Part[]
}

export type IdRule<Part extends string, NodeId> = (args: {
  part: Part
  scopeId: string
  nodeId: NodeId
}) => string

export interface CompositeItemMeta<Part extends string, NodeId, Meta> {
  part: Part
  nodeId: NodeId
  domId: string
  node: HTMLElement
  meta: Meta
}

export interface CompositeRegistry<Part extends string, NodeId, Meta> {
  register(meta: CompositeItemMeta<Part, NodeId, Meta>): void
  unregister(part: Part, itemId: NodeId): void
  get(
    part: Part,
    itemId: NodeId,
  ): CompositeItemMeta<Part, NodeId, Meta> | undefined
  getDomId(part: Part, nodeId: NodeId): string | undefined
  getNode(part: Part, nodeId: NodeId): HTMLElement | undefined
  entries(): Iterable<CompositeItemMeta<Part, NodeId, Meta>>
  entriesByPart(part: Part): Iterable<CompositeItemMeta<Part, NodeId, Meta>>
  subscribe(listener: () => void): () => void
}

type RegistryKey<
  Part extends string,
  ItemId,
> = `${Part}::${ItemId & (string | number)}`

function createCompositeRegistry<
  Part extends string,
  NodeId,
  Meta,
>(): CompositeRegistry<Part, NodeId, Meta> {
  const map = new Map<
    RegistryKey<Part, NodeId>,
    CompositeItemMeta<Part, NodeId, Meta>
  >()

  const listeners = new Set<() => void>()

  const makeKey = (part: Part, nodeId: NodeId): RegistryKey<Part, NodeId> =>
    `${part}::${nodeId}` as RegistryKey<Part, NodeId>

  const notify = () => {
    listeners.forEach((l) => l())
  }

  return {
    register(meta) {
      const key = makeKey(meta.part, meta.nodeId)
      map.set(key, meta)
      notify()
    },
    unregister(part, nodeId) {
      const key = makeKey(part, nodeId)
      map.delete(key)
      notify()
    },
    get(part, nodeId) {
      const key = makeKey(part, nodeId)
      return map.get(key)
    },
    getDomId(part, nodeId) {
      const key = makeKey(part, nodeId)
      return map.get(key)?.domId
    },
    getNode(part, nodeId) {
      const key = makeKey(part, nodeId)
      return map.get(key)?.node
    },
    *entries() {
      for (const v of map.values()) yield v
    },
    *entriesByPart(part) {
      for (const v of map.values()) {
        if (v.part === part) yield v
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function createCompositeSystem<
  Part extends string,
  NodeId extends string | number,
  Meta extends object,
>(config: CompositeConfig<Part>) {
  type Context = {
    scopeId: string
    makeDomId: IdRule<Part, NodeId>
    registry: CompositeRegistry<Part, NodeId, Meta>
  }

  const CompositeContext = React.createContext<Context | null>(null)

  function useCompositeContext(): Context {
    const ctx = React.useContext(CompositeContext)
    if (!ctx) {
      throw new Error(
        `useCompositeContext must be used within <${config.namespace}.Provider>`,
      )
    }
    return ctx
  }

  const defaultIdRule: IdRule<Part, NodeId> = ({ part, scopeId, nodeId }) =>
    `${config.namespace}::${scopeId}::${part}-${String(nodeId)}`

  function Provider(props: {
    children: React.ReactNode
    idRule?: IdRule<Part, NodeId>
  }) {
    const scopeId = React.useId()

    const makeDomId = React.useMemo(
      () => props.idRule ?? defaultIdRule,
      [props.idRule],
    )

    const registry = React.useRef(
      createCompositeRegistry<Part, NodeId, Meta>(),
    ).current

    const value = React.useMemo<Context>(
      () => ({ scopeId, makeDomId, registry }),
      [scopeId, makeDomId, registry],
    )

    return (
      <CompositeContext.Provider value={value}>
        {props.children}
      </CompositeContext.Provider>
    )
  }

  function useCompositeItemRegistration(
    part: Part,
    nodeId: NodeId,
    options?: {
      id?: string
      meta?: Meta
    },
  ) {
    const { scopeId, makeDomId, registry } = useCompositeContext()

    const defaultDomId = makeDomId({ part, scopeId, nodeId })
    const domId = options?.id ?? defaultDomId
    const meta = options?.meta ?? ({} as Meta)

    const ref = (node: HTMLElement | null) => {
      if (node) {
        registry.register({ part, nodeId, domId, node, meta })
      } else {
        registry.unregister(part, nodeId)
      }
    }

    return { domId, ref }
  }

  function useCompositeDomId(part: Part, nodeId: NodeId | null | undefined) {
    const { registry } = useCompositeContext()

    const getSnapshot = React.useCallback(() => {
      if (nodeId == null) return undefined
      return registry.getDomId(part, nodeId)
    }, [registry, part, nodeId])

    const subscribe = React.useCallback(
      (listener: () => void) => registry.subscribe(listener),
      [registry],
    )

    // key가 바뀌면(다른 노드를 바라보면) 새로운 구독처럼 취급
    const domId = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

    return domId
  }

  function useCompositeRegistry() {
    const { registry } = useCompositeContext()
    return registry
  }

  return {
    Provider,
    useCompositeContext,
    useCompositeItemRegistration,
    useCompositeDomId,
    useCompositeRegistry,
  }
}
