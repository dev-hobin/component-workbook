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
  index: number // 같은 parent 내에서의 index (childrenByParent 순서 기준)
  size: number // 같은 parent 내에서의 총 노드 수
  hasChildren: boolean
  meta: StructureNodeMeta<Role> & ExtraMeta
}

// ─────────────────────────────────────────────
// buildVisibleNodes 구현
// ─────────────────────────────────────────────

/**
 * 구조 스냅샷 + expandedIds 를 받아서 "화면에 보이는 노드 목록"을 평탄화한다.
 *
 * - 순서는 snapshot.childrenByParent 에 들어있는 배열 순서를 그대로 사용한다.
 * - expandedIds 에 포함된 id 의 자식만 재귀적으로 내려간다.
 * - startParentId:
 *    - null      → 루트 레벨(null 아래 자식들)부터 시작
 *    - 특정 id   → 해당 id 의 자식들부터 시작 (서브트리만 보고 싶을 때)
 */
export function buildVisibleNodes<
  Role extends string = string,
  ExtraMeta extends object = object,
>(
  snapshot: StructureSnapshot<Role, ExtraMeta>,
  expandedIds: NodeId[],
  startParentId: NodeId | null = null,
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

      const childList = childrenByParent.get(id) ?? []
      const hasChildren = childList.length > 0

      result.push({
        id,
        parentId,
        depth,
        index,
        size,
        hasChildren,
        meta,
      })

      if (expandedSet.has(id)) {
        walk(id, depth + 1)
      }
    })
  }

  walk(startParentId, 0)

  return result
}
