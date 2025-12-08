// dom-registry.ts

export type DomItemMeta<Part extends string, NodeId, Meta> = {
  part: Part
  nodeId: NodeId
  domId: string
  node: HTMLElement
  meta: Meta
}

export interface DomRegistry<Part extends string, NodeId, Meta> {
  register(meta: DomItemMeta<Part, NodeId, Meta>): void
  unregister(part: Part, itemId: NodeId): void
  get(part: Part, itemId: NodeId): DomItemMeta<Part, NodeId, Meta> | undefined
  getDomId(part: Part, nodeId: NodeId): string | undefined
  getNode(part: Part, nodeId: NodeId): HTMLElement | undefined
  entries(): Iterable<DomItemMeta<Part, NodeId, Meta>>
  entriesByPart(part: Part): Iterable<DomItemMeta<Part, NodeId, Meta>>
  subscribe(listener: () => void): () => void
}

type RegistryKey<
  Part extends string,
  NodeId,
> = `${Part}::${NodeId & (string | number)}`

export function createDomRegistry<
  Part extends string,
  NodeId,
  Meta,
>(): DomRegistry<Part, NodeId, Meta> {
  const map = new Map<
    RegistryKey<Part, NodeId>,
    DomItemMeta<Part, NodeId, Meta>
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
