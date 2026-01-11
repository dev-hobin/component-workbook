export type NodeId = string
export type StoreKey = string // 내부 저장 키: `${id}:${role}`
export type StoreListener = () => void

/**
 * 내부 저장 키 생성
 * 같은 논리적 ID를 가진 여러 역할(role)의 노드를 구분
 */
export function createStoreKey(id: NodeId, role: string): StoreKey {
  return `${id}:${role}`
}

export interface ComponentNode<
  Role extends string = string,
  Meta extends object = object,
> {
  id: NodeId // 논리적 ID (사용자가 지정)
  parentId: NodeId | null
  role: Role
  domId: string // DOM element의 id 속성 값
  meta: Meta
  element: HTMLElement | null
}

export interface NodeStore<
  Role extends string = string,
  Meta extends object = object,
> {
  // 등록/해제
  register(node: ComponentNode<Role, Meta>): void
  unregister(id: NodeId, role: Role): void

  // 구독
  subscribe(listener: StoreListener): () => void

  // 동기 조회 API
  getNode(id: NodeId, role: Role): ComponentNode<Role, Meta> | null
  getElement(id: NodeId, role: Role): HTMLElement | null
  getNodes(): Map<StoreKey, ComponentNode<Role, Meta>>
  getNodesByRole(role: Role): ComponentNode<Role, Meta>[]
  getChildren(parentId: NodeId | null): ComponentNode<Role, Meta>[]
  getChildrenByRole(parentId: NodeId | null, role: Role): ComponentNode<Role, Meta>[]
  filterNodesByMeta(
    role: Role,
    predicate: (meta: Meta) => boolean,
  ): ComponentNode<Role, Meta>[]
  filterNodesByRolesAndMeta(
    roles: Role[],
    predicate: (meta: Meta) => boolean,
  ): ComponentNode<Role, Meta>[]
  getAllElements(): Map<StoreKey, HTMLElement>
}

export function createNodeStore<
  Role extends string = string,
  Meta extends object = object,
>(): NodeStore<Role, Meta> {
  const nodes = new Map<StoreKey, ComponentNode<Role, Meta>>()
  const childrenByParent = new Map<NodeId | null, StoreKey[]>()
  const listeners = new Set<StoreListener>()

  function notify() {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    register(node) {
      const { id, role, parentId } = node
      const storeKey = createStoreKey(id, role)

      // 이미 같은 element가 등록되어 있으면 skip
      const existing = nodes.get(storeKey)
      if (existing?.element === node.element) {
        return
      }

      nodes.set(storeKey, node)

      // childrenByParent는 논리적 parentId 기준으로 관리
      const siblings = childrenByParent.get(parentId)
      if (siblings) {
        if (!siblings.includes(storeKey)) siblings.push(storeKey)
      } else {
        childrenByParent.set(parentId, [storeKey])
      }

      notify()
    },

    unregister(id, role) {
      const storeKey = createStoreKey(id, role)
      const node = nodes.get(storeKey)

      // 이미 해제되어 있으면 skip
      if (!node) return

      const siblings = childrenByParent.get(node.parentId)
      if (siblings) {
        const idx = siblings.indexOf(storeKey)
        if (idx !== -1) siblings.splice(idx, 1)
        if (siblings.length === 0) childrenByParent.delete(node.parentId)
      }

      nodes.delete(storeKey)
      notify()
    },

    getNode(id, role) {
      const storeKey = createStoreKey(id, role)
      return nodes.get(storeKey) ?? null
    },

    getElement(id, role) {
      const storeKey = createStoreKey(id, role)
      return nodes.get(storeKey)?.element ?? null
    },

    getNodes() {
      return nodes
    },

    getNodesByRole(role) {
      const result: ComponentNode<Role, Meta>[] = []
      for (const node of nodes.values()) {
        if (node.role === role) result.push(node)
      }
      return result
    },

    getChildren(parentId) {
      const childKeys = childrenByParent.get(parentId) ?? []
      return childKeys
        .map((key) => nodes.get(key))
        .filter((n): n is ComponentNode<Role, Meta> => n != null)
    },

    getChildrenByRole(parentId, role) {
      return this.getChildren(parentId).filter((n) => n.role === role)
    },

    filterNodesByMeta(role, predicate) {
      const result: ComponentNode<Role, Meta>[] = []
      for (const node of nodes.values()) {
        if (node.role === role && predicate(node.meta)) {
          result.push(node)
        }
      }
      return result
    },

    filterNodesByRolesAndMeta(roles, predicate) {
      const result: ComponentNode<Role, Meta>[] = []
      for (const node of nodes.values()) {
        if (roles.includes(node.role) && predicate(node.meta)) {
          result.push(node)
        }
      }
      return result
    },

    getAllElements() {
      const result = new Map<StoreKey, HTMLElement>()
      for (const [key, node] of nodes.entries()) {
        if (node.element) {
          result.set(key, node.element)
        }
      }
      return result
    },
  }
}
