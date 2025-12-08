// build-visible-nodes.ts

import type {
  NodeId,
  StructureNodeMeta,
  StructureSnapshot,
} from './structure-core'

// ─────────────────────────────────────────────
// VisibleNode 타입
// ─────────────────────────────────────────────

export type VisibleNode<
  Role extends string = string,
  ExtraMeta extends object = object,
> = {
  id: NodeId
  parentId: NodeId | null
  depth: number
  index: number // 같은 parent 내에서의 index (외부에서 주입한 순서 기준)
  size: number // 같은 parent 내에서의 총 노드 수
  hasChildren: boolean
  meta: StructureNodeMeta<Role> & ExtraMeta
}

// ─────────────────────────────────────────────
// 순서 주입을 위한 콜백 타입
// ─────────────────────────────────────────────

/**
 * 외부에서 "parentId 아래 children을 어떤 순서로 볼지"를 결정하는 함수.
 *
 * - children: StructureStore가 알려주는 "현재 자식 집합" (순서 없음)
 * - parentId: 그 부모 id (루트는 null 가능)
 * - snapshot: 전체 구조 스냅샷 (메타 정보를 보고 정렬할 수도 있음)
 *
 * 반환:
 * - 화면/키보드 탐색/ARIA 등에 사용할 **최종 순서의 children 배열**
 */
export type GetOrderedChildren<
  Role extends string = string,
  ExtraMeta extends object = object,
> = (params: {
  parentId: NodeId | null
  children: NodeId[]
  snapshot: StructureSnapshot<Role, ExtraMeta>
}) => NodeId[]

// 기본 구현: 순서 안 건드리고 children 그대로 사용
export function defaultGetOrderedChildren<
  Role extends string = string,
  ExtraMeta extends object = object,
>(params: {
  parentId: NodeId | null
  children: NodeId[]
  snapshot: StructureSnapshot<Role, ExtraMeta>
}): NodeId[] {
  return params.children
}

// ─────────────────────────────────────────────
// buildVisibleNodes 구현
// ─────────────────────────────────────────────

export function buildVisibleNodes<
  Role extends string = string,
  ExtraMeta extends object = object,
>(
  snapshot: StructureSnapshot<Role, ExtraMeta>,
  expandedIds: NodeId[],
  getOrderedChildren: GetOrderedChildren<
    Role,
    ExtraMeta
  > = defaultGetOrderedChildren,
  rootParentId: NodeId | null = null,
): VisibleNode<Role, ExtraMeta>[] {
  const result: VisibleNode<Role, ExtraMeta>[] = []
  const expandedSet = new Set(expandedIds)

  const { nodes, childrenByParent } = snapshot

  function walk(parentId: NodeId | null, depth: number) {
    const childrenSet = childrenByParent.get(parentId) ?? new Set<NodeId>()
    const rawChildren = Array.from(childrenSet)

    // 🔸 여기서 "외부가 정의한 순서"를 주입
    const orderedChildren = getOrderedChildren({
      parentId,
      children: rawChildren,
      snapshot,
    })

    const size = orderedChildren.length

    orderedChildren.forEach((id, index) => {
      const meta = nodes.get(id)
      if (!meta) return

      const childSet = childrenByParent.get(id)
      const hasChildren = !!childSet && childSet.size > 0

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
