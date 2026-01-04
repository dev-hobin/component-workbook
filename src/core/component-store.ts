export type NodeId = string

export interface ComponentNode<
  Role extends string = string,
  Meta extends object = object,
> {
  id: NodeId
  parentId: NodeId | null
  role: Role
  meta: Meta
  element: HTMLElement | null
}

export interface ComponentSnapshot<
  Role extends string = string,
  Meta extends object = object,
> {
  nodes: ReadonlyMap<NodeId, ComponentNode<Role, Meta>>
  childrenByParent: ReadonlyMap<NodeId | null, NodeId[]>
}

export interface ComponentStore<
  Role extends string = string,
  Meta extends object = object,
> {
  register(node: ComponentNode<Role, Meta>): void
  unregister(id: NodeId): void
  getSnapshot(): ComponentSnapshot<Role, Meta>
  subscribe(listener: () => void): () => void
}

export function createComponentStore<
  Role extends string = string,
  Meta extends object = object,
>(): ComponentStore<Role, Meta> {
  const nodes = new Map<NodeId, ComponentNode<Role, Meta>>()
  const childrenByParent = new Map<NodeId | null, NodeId[]>()
  const listeners = new Set<() => void>()

  let snapshot: ComponentSnapshot<Role, Meta> = buildSnapshot()

  function buildSnapshot(): ComponentSnapshot<Role, Meta> {
    return {
      nodes: new Map(nodes),
      childrenByParent: new Map(
        Array.from(childrenByParent.entries(), ([k, v]) => [k, [...v]])
      ),
    }
  }

  function emit() {
    snapshot = buildSnapshot()
    listeners.forEach((l) => l())
  }

  return {
    register(node) {
      const { id, parentId } = node
      nodes.set(id, node)

      const siblings = childrenByParent.get(parentId)
      if (siblings) {
        if (!siblings.includes(id)) siblings.push(id)
      } else {
        childrenByParent.set(parentId, [id])
      }

      emit()
    },

    unregister(id) {
      const node = nodes.get(id)
      if (!node) return

      const siblings = childrenByParent.get(node.parentId)
      if (siblings) {
        const idx = siblings.indexOf(id)
        if (idx !== -1) siblings.splice(idx, 1)
        if (siblings.length === 0) childrenByParent.delete(node.parentId)
      }

      childrenByParent.delete(id)
      nodes.delete(id)

      emit()
    },

    getSnapshot() {
      return snapshot
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
