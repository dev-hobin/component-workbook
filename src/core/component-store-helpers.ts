import type { ComponentNode, ComponentSnapshot, NodeId } from './component-store'

export function getNode<Role extends string, Meta extends object>(
  snapshot: ComponentSnapshot<Role, Meta>,
  id: NodeId
): ComponentNode<Role, Meta> | null {
  return snapshot.nodes.get(id) ?? null
}

export function getElement(
  snapshot: ComponentSnapshot,
  id: NodeId
): HTMLElement | null {
  return snapshot.nodes.get(id)?.element ?? null
}

export function getChildren<Role extends string, Meta extends object>(
  snapshot: ComponentSnapshot<Role, Meta>,
  parentId: NodeId | null
): ComponentNode<Role, Meta>[] {
  const childIds = snapshot.childrenByParent.get(parentId) ?? []
  return childIds
    .map((id) => snapshot.nodes.get(id))
    .filter((n): n is ComponentNode<Role, Meta> => n != null)
}

export function getChildrenByRole<Role extends string, Meta extends object>(
  snapshot: ComponentSnapshot<Role, Meta>,
  parentId: NodeId | null,
  role: Role
): ComponentNode<Role, Meta>[] {
  return getChildren(snapshot, parentId).filter((n) => n.role === role)
}

export function getNodesByRole<Role extends string, Meta extends object>(
  snapshot: ComponentSnapshot<Role, Meta>,
  role: Role
): ComponentNode<Role, Meta>[] {
  const result: ComponentNode<Role, Meta>[] = []
  for (const node of snapshot.nodes.values()) {
    if (node.role === role) result.push(node)
  }
  return result
}

export function getParent<Role extends string, Meta extends object>(
  snapshot: ComponentSnapshot<Role, Meta>,
  id: NodeId
): ComponentNode<Role, Meta> | null {
  const node = snapshot.nodes.get(id)
  if (!node || !node.parentId) return null
  return snapshot.nodes.get(node.parentId) ?? null
}
