// ─────────────────────────────────────────────
// Composite Core Types
// ─────────────────────────────────────────────

export type NodeId = string

/**
 * 모든 컴포넌트(Menu, TreeView, Tabs, Command 등)가 공유할 기본 메타.
 * - parentId: 트리 구조를 위한 부모 id
 * - role: 이 노드의 역할(메뉴아이템, 트리아이템, 탭 등)
 */
export interface BaseNodeMeta<Role extends string = string> {
  parentId: NodeId | null
  role: Role
}

/**
 * 구조 스냅샷.
 * - nodes: 각 id → 메타 정보
 * - childrenByParent: 부모 id → 자식 id 목록
 */
export interface CompositeSnapshot<
  Role extends string = string,
  ExtraMeta extends object = object,
> {
  nodes: ReadonlyMap<NodeId, BaseNodeMeta<Role> & ExtraMeta>
  childrenByParent: ReadonlyMap<NodeId | null, NodeId[]>
}

/**
 * 외부에서 사용하는 Store 인터페이스.
 * React 쪽에서는 이걸 useSyncExternalStore로 어댑트해서 쓰면 됨.
 */
export interface CompositeStore<
  Role extends string = string,
  ExtraMeta extends object = object,
> {
  registerNode(meta: { id: NodeId } & BaseNodeMeta<Role> & ExtraMeta): void
  unregisterNode(id: NodeId): void
  getSnapshot(): CompositeSnapshot<Role, ExtraMeta>
  subscribe(listener: () => void): () => void
}

// ─────────────────────────────────────────────
// Composite Core 구현
// ─────────────────────────────────────────────

export function createCompositeStore<
  Role extends string = string,
  ExtraMeta extends object = object,
>(): CompositeStore<Role, ExtraMeta> {
  type Meta = BaseNodeMeta<Role> & ExtraMeta

  const nodes = new Map<NodeId, Meta>()
  const childrenByParent = new Map<NodeId | null, NodeId[]>()
  const listeners = new Set<() => void>()

  const notify = () => {
    listeners.forEach((l) => l())
  }

  return {
    registerNode(meta) {
      const { id, parentId } = meta

      // 메타 갱신
      nodes.set(id, meta)

      // 부모 → 자식 리스트 갱신
      const existing = childrenByParent.get(parentId)
      if (existing) {
        if (!existing.includes(id)) {
          existing.push(id)
        }
      } else {
        childrenByParent.set(parentId, [id])
      }

      notify()
    },

    unregisterNode(id) {
      const meta = nodes.get(id)
      if (!meta) return

      const { parentId } = meta

      // 부모의 children 리스트에서 제거
      const siblings = childrenByParent.get(parentId)
      if (siblings) {
        const idx = siblings.indexOf(id)
        if (idx !== -1) {
          siblings.splice(idx, 1)
        }
        if (siblings.length === 0) {
          childrenByParent.delete(parentId)
        }
      }

      // 이 노드를 부모로 갖는 children 리스트 제거(자식들은 따로 unregister 해줄 것)
      childrenByParent.delete(id)

      // 메타 삭제
      nodes.delete(id)

      notify()
    },

    getSnapshot() {
      // 내부적으로는 mutable Map이지만,
      // 타입 상으로는 ReadonlyMap으로 노출해서 외부에서 수정 못 하게 가이드.
      return {
        nodes,
        childrenByParent,
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
