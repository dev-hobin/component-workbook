// dom-system.ts
import React, { useSyncExternalStore } from 'react'
import { createDomRegistry, type DomRegistry } from '../core/dom-registry'

export type DomConfig<Part extends string> = {
  namespace: string
  parts: readonly Part[]
}

export type IdRule<Part extends string, NodeId> = (args: {
  part: Part
  scopeId: string
  nodeId: NodeId
}) => string

export function createDomSystem<
  Part extends string,
  NodeId extends string | number,
  Meta extends object,
>(config: DomConfig<Part>) {
  type Registry = DomRegistry<Part, NodeId, Meta>

  type Context = {
    scopeId: string
    makeDomId: IdRule<Part, NodeId>
    registry: Registry
  }

  const DomContext = React.createContext<Context | null>(null)

  function useContext(): Context {
    const ctx = React.useContext(DomContext)
    if (!ctx) {
      throw new Error(
        `useDomContext must be used within <${config.namespace}.Provider>`,
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

    const registry =
      React.useRef(createDomRegistry<Part, NodeId, Meta>()).current

    const value = React.useMemo<Context>(
      () => ({ scopeId, makeDomId, registry }),
      [scopeId, makeDomId, registry],
    )

    return (
      <DomContext.Provider value={value}>{props.children}</DomContext.Provider>
    )
  }

  function useRegistration(
    part: Part,
    nodeId: NodeId,
    options?: {
      id?: string
      meta?: Meta
    },
  ) {
    const { scopeId, makeDomId, registry } = useContext()

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

  function useId(part: Part, nodeId: NodeId | null | undefined) {
    const { registry } = useContext()

    const getSnapshot = React.useCallback(() => {
      if (nodeId == null) {
        return undefined
      }

      return registry.getDomId(part, nodeId)
    }, [registry, part, nodeId])

    const subscribe = React.useCallback(
      (listener: () => void) => registry.subscribe(listener),
      [registry],
    )

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  }

  function useRegistry(): Registry {
    const { registry } = useContext()
    return registry
  }

  return {
    Provider,
    useContext,
    useRegistration,
    useId,
    useRegistry,
  }
}
