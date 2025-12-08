// ─────────────────────────────────────────────
// 기본 타입
// ─────────────────────────────────────────────

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
 *
 * 중요:
 * - childrenByParent 는 "부모-자식 관계"만 표현하고, **순서 정보는 없음**
 * - 순서는 항상 외부(도메인 데이터, React children, DnD state 등)가 책임지고,
 *   buildVisibleNodes 단계에서 주입함.
 */
export interface StructureSnapshot<
  Role extends string = string,
  ExtraMeta extends object = object,
> {
  nodes: ReadonlyMap<NodeId, StructureNodeMeta<Role> & ExtraMeta>
  childrenByParent: ReadonlyMap<NodeId | null, ReadonlySet<NodeId>>
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

  // 현재 상태 (mutable)
  const nodes = new Map<NodeId, Meta>()
  const childrenByParent = new Map<NodeId | null, Set<NodeId>>()
  const listeners = new Set<() => void>()

  // 불변 스냅샷 (immutable) 캐시
  let snapshot: StructureSnapshot<Role, ExtraMeta> = buildSnapshot()

  function buildSnapshot(): StructureSnapshot<Role, ExtraMeta> {
    // Map/Set을 깊은 수준에서 복사해서 "그 시점의 스냅샷"을 고정
    const nodesClone = new Map<NodeId, Meta>(nodes)

    const childrenClone = new Map<NodeId | null, ReadonlySet<NodeId>>(
      Array.from(childrenByParent.entries(), ([parentId, childrenSet]) => [
        parentId,
        new Set(childrenSet) as ReadonlySet<NodeId>,
      ]),
    )

    return {
      nodes: nodesClone,
      childrenByParent: childrenClone,
    }
  }

  const emitChange = () => {
    snapshot = buildSnapshot()
    listeners.forEach((l) => l())
  }

  return {
    registerNode(meta) {
      const { id, parentId } = meta

      nodes.set(id, meta)

      let children = childrenByParent.get(parentId)
      if (!children) {
        children = new Set<NodeId>()
        childrenByParent.set(parentId, children)
      }
      children.add(id) // 🔸 순서는 저장하지 않고 "멤버십"만 저장

      emitChange()
    },

    unregisterNode(id) {
      const meta = nodes.get(id)
      if (!meta) return

      const { parentId } = meta

      // 부모의 children Set에서 제거
      const siblings = childrenByParent.get(parentId)
      if (siblings) {
        siblings.delete(id)
        if (siblings.size === 0) {
          childrenByParent.delete(parentId)
        }
      }

      // 이 노드를 부모로 가진 children 관계 제거
      childrenByParent.delete(id)

      nodes.delete(id)

      emitChange()
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
