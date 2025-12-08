// structure-core.ts

export type NodeId = string

export type StructureConfig<Role extends string> = {
  roles: readonly Role[]
}

/**
 * 모든 컴포넌트(Menu, TreeView, Tabs, Command 등)가 공유할 기본 메타.
 * - parentId: 트리 구조를 위한 부모 id
 * - role: 이 노드의 역할(메뉴아이템, 트리아이템, 탭 등)
 */
export interface StructureNodeMeta<Role extends string = string> {
  parentId: NodeId | null
  role: Role
}

/**
 * 구조 스냅샷.
 * - nodes: 각 id → 메타 정보
 * - childrenByParent: 부모 id → 자식 id 목록
 */
export interface StructureSnapshot<
  Role extends string = string,
  ExtraMeta extends object = object,
> {
  nodes: ReadonlyMap<NodeId, StructureNodeMeta<Role> & ExtraMeta>
  childrenByParent: ReadonlyMap<NodeId | null, NodeId[]>
}

/**
 * 외부에서 사용하는 Store 인터페이스.
 * React 쪽에서는 이걸 useSyncExternalStore로 어댑트해서 쓰면 됨.
 */
export interface StructureStore<
  Role extends string = string,
  ExtraMeta extends object = object,
> {
  registerNode(meta: { id: NodeId } & StructureNodeMeta<Role> & ExtraMeta): void
  unregisterNode(id: NodeId): void
  getSnapshot(): StructureSnapshot<Role, ExtraMeta>
  subscribe(listener: () => void): () => void
}

// ─────────────────────────────────────────────
// Structure Core 구현
// ─────────────────────────────────────────────

export function createStructureStore<
  Role extends string = string,
  ExtraMeta extends object = object,
>(): StructureStore<Role, ExtraMeta> {
  type Meta = StructureNodeMeta<Role> & ExtraMeta

  const nodes = new Map<NodeId, Meta>()
  const childrenByParent = new Map<NodeId | null, NodeId[]>()
  const listeners = new Set<() => void>()

  // 👇 캐싱할 snapshot 객체
  let snapshot: StructureSnapshot<Role, ExtraMeta> = {
    nodes,
    childrenByParent,
  }

  const notify = () => {
    // 구조가 바뀐 시점에만 "새 스냅샷 객체"를 만들어서 교체
    snapshot = {
      nodes,
      childrenByParent,
    }
    listeners.forEach((l) => l())
  }

  const unregisterNodeRecursive = (id: NodeId) => {
    const meta = nodes.get(id)
    if (!meta) return

    // 자식들 먼저 제거
    const children = childrenByParent.get(id) ?? []
    for (const childId of children) {
      unregisterNodeRecursive(childId)
    }
    childrenByParent.delete(id)

    // 부모의 children 배열에서 제거
    const siblings = childrenByParent.get(meta.parentId)
    if (siblings) {
      const idx = siblings.indexOf(id)
      if (idx !== -1) siblings.splice(idx, 1)
      if (siblings.length === 0) childrenByParent.delete(meta.parentId)
    }

    nodes.delete(id)
  }

  return {
    registerNode(meta) {
      const { id, parentId } = meta

      const prev = nodes.get(id)
      if (prev && prev.parentId !== parentId) {
        const prevSiblings = childrenByParent.get(prev.parentId)

        if (prevSiblings) {
          const idx = prevSiblings.indexOf(id)
          if (idx !== -1) prevSiblings.splice(idx, 1)
          if (prevSiblings.length === 0) {
            childrenByParent.delete(prev.parentId)
          }
        }
      }

      nodes.set(id, meta)

      const siblings = childrenByParent.get(parentId)
      if (siblings) {
        if (!siblings.includes(id)) {
          siblings.push(id)
        }
      } else {
        childrenByParent.set(parentId, [id])
      }

      notify()
    },

    unregisterNode(id) {
      unregisterNodeRecursive(id)
      notify()
    },

    getSnapshot() {
      return snapshot
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
