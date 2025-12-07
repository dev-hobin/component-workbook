// ─────────────────────────────────────────────
// Composite Core Types
// ─────────────────────────────────────────────

import { useEffect, useSyncExternalStore } from 'react'

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

  // 👇 캐싱할 snapshot 객체
  let snapshot: CompositeSnapshot<Role, ExtraMeta> = {
    nodes,
    childrenByParent,
  }

  const emitChange = () => {
    // 구조가 바뀐 시점에만 "새 스냅샷 객체"를 만들어서 교체
    snapshot = {
      nodes,
      childrenByParent,
    }
    listeners.forEach((l) => l())
  }

  return {
    registerNode(meta) {
      const { id, parentId } = meta

      nodes.set(id, meta)

      const existing = childrenByParent.get(parentId)
      if (existing) {
        if (!existing.includes(id)) {
          existing.push(id)
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

      childrenByParent.delete(id)
      nodes.delete(id)

      emitChange()
    },

    getSnapshot() {
      // 항상 "캐시된" snapshot 객체를 반환
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

export function useCompositeNodeRegistration<
  Role extends string,
  ExtraMeta extends object,
>(
  store: CompositeStore<Role, ExtraMeta>,
  config: { id: NodeId } & BaseNodeMeta<Role> & ExtraMeta,
) {
  // config를 안정적으로 관리하고 싶으면, 호출하는 쪽에서 useMemo로 싸주는 편이 안전
  useEffect(() => {
    store.registerNode(config)

    return () => {
      store.unregisterNode(config.id)
    }
  }, [store, config])
}

export function useCompositeSnapshot<
  Role extends string = string,
  ExtraMeta extends object = object,
>(store: CompositeStore<Role, ExtraMeta>): CompositeSnapshot<Role, ExtraMeta> {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot, // SSR fallback도 동일하게
  )
}

// ─────────────────────────────────────────────
// tree-visible-nodes.ts
// ─────────────────────────────────────────────

export type VisibleNode<
  Role extends string = string,
  ExtraMeta extends object = object,
> = {
  id: NodeId
  parentId: NodeId | null
  depth: number
  index: number // 같은 parent 내에서의 index
  size: number // 같은 parent 내에서의 총 노드 수
  hasChildren: boolean
  meta: CompositeSnapshot<Role, ExtraMeta>['nodes'] extends ReadonlyMap<
    NodeId,
    infer M
  >
    ? M
    : never
}

export function buildVisibleNodes<
  Role extends string = string,
  ExtraMeta extends object = object,
>(
  snapshot: CompositeSnapshot<Role, ExtraMeta>,
  expandedIds: NodeId[],
  rootParentId: NodeId | null = null,
): VisibleNode<Role, ExtraMeta>[] {
  const result: VisibleNode<Role, ExtraMeta>[] = []
  const expandedSet = new Set(expandedIds)

  const { nodes, childrenByParent } = snapshot

  function walk(parentId: NodeId | null, depth: number) {
    const children = childrenByParent.get(parentId) ?? []
    const size = children.length

    children.forEach((id, index) => {
      const meta = nodes.get(id)
      if (!meta) return

      const hasChildren = (childrenByParent.get(id) ?? []).length > 0

      const visibleNode: VisibleNode<Role, ExtraMeta> = {
        id,
        parentId,
        depth,
        index,
        size,
        hasChildren,
        meta,
      }
      result.push(visibleNode)

      // 이 노드가 expand 되어 있으면 자식도 이어서 탐색
      if (expandedSet.has(id)) {
        walk(id, depth + 1)
      }
    })
  }

  walk(rootParentId, 0)

  return result
}
