import type {
  NodeId,
  StructureNodeMeta,
  StructureSnapshot,
} from './structure-core'

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
  meta: StructureNodeMeta<Role> & ExtraMeta
}

export function buildVisibleNodes<
  Role extends string = string,
  ExtraMeta extends object = object,
>(
  snapshot: StructureSnapshot<Role, ExtraMeta>,
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
