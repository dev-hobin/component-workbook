// structure-core.ts

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
 * - childrenByParent 는 "부모-자식 관계 + 순서"를 함께 표현한다.
 *   배열의 순서가 화면/키보드 탐색에 사용할 순서의 진실이다.
 * - ReadonlyMap / NodeId[] 로 노출되지만, 내부에서는 깊은 복사된 스냅샷이기 때문에
 *   외부에서 구조를 mutate 하면 안 된다(타입 상으로도 readonly).
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

  // mutable 내부 상태
  const nodes = new Map<NodeId, Meta>()
  const childrenByParent = new Map<NodeId | null, NodeId[]>()
  const listeners = new Set<() => void>()

  // 🔹 "그 시점"을 고정한 스냅샷을 만들어 주는 함수
  function buildSnapshot(): StructureSnapshot<Role, ExtraMeta> {
    const nodesClone = new Map<NodeId, Meta>(nodes)

    const childrenClone = new Map<NodeId | null, NodeId[]>(
      Array.from(childrenByParent.entries(), ([parentId, list]) => [
        parentId,
        [...list], // 배열도 복사
      ]),
    )

    return {
      nodes: nodesClone,
      childrenByParent: childrenClone,
    }
  }

  // 항상 최신 상태를 찍어 둔 스냅샷
  let snapshot: StructureSnapshot<Role, ExtraMeta> = buildSnapshot()

  const emitChange = () => {
    snapshot = buildSnapshot()
    listeners.forEach((l) => l())
  }

  return {
    registerNode(meta) {
      const { id, parentId } = meta

      nodes.set(id, meta)

      const list = childrenByParent.get(parentId)
      if (list) {
        if (!list.includes(id)) {
          list.push(id)
        }
      } else {
        childrenByParent.set(parentId, [id])
      }

      emitChange()
    },

    unregisterNode(id) {
      const meta = nodes.get(id)
      if (!meta) return

      const { parentId } = meta

      const siblings = childrenByParent.get(parentId)
      if (siblings) {
        const idx = siblings.indexOf(id)
        if (idx !== -1) siblings.splice(idx, 1)
        if (siblings.length === 0) {
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
