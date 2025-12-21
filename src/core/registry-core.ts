// ============================================
// Registry Core - 순수 함수 모듈
// ============================================
// 노드 등록/해제, 부모-자식 관계 관리
// DOM element 없이 구조만 다룸
// ============================================

export type NodeId = string

export type RegistryNode = {
  id: NodeId
  parentId: NodeId | null
}

export type Registry = Map<NodeId, RegistryNode>

// 빈 레지스트리 생성
export function createRegistry(): Registry {
  return new Map()
}

// 노드 등록 (mutable)
export function registerNode(
  registry: Registry,
  id: NodeId,
  parentId: NodeId | null,
): void {
  registry.set(id, { id, parentId })
}

// 노드 해제 (mutable)
export function unregisterNode(registry: Registry, id: NodeId): void {
  registry.delete(id)
}

// 부모 찾기
export function getParentId(registry: Registry, id: NodeId): NodeId | null {
  return registry.get(id)?.parentId ?? null
}

// 자식들 찾기
export function getChildIds(registry: Registry, parentId: NodeId): NodeId[] {
  const children: NodeId[] = []
  registry.forEach((node) => {
    if (node.parentId === parentId) {
      children.push(node.id)
    }
  })
  return children
}

// 루트 노드들 찾기
export function getRootIds(registry: Registry): NodeId[] {
  const roots: NodeId[] = []
  registry.forEach((node) => {
    if (node.parentId === null) {
      roots.push(node.id)
    }
  })
  return roots
}

// 노드 존재 확인
export function hasNode(registry: Registry, id: NodeId): boolean {
  return registry.has(id)
}

// ============================================
// Registry → Shape 변환
// ============================================

export type HierarchyNode = {
  id: NodeId
  children: NodeId[]
}

export type HierarchyShape = {
  rootIds: NodeId[]
  nodesById: Record<NodeId, HierarchyNode>
}

export function registryToShape(registry: Registry): HierarchyShape {
  const nodesById: Record<NodeId, HierarchyNode> = {}
  const rootIds: NodeId[] = []

  registry.forEach((node, nodeId) => {
    nodesById[nodeId] = { id: nodeId, children: [] }
    if (node.parentId === null) {
      rootIds.push(nodeId)
    }
  })

  registry.forEach((node) => {
    if (node.parentId && nodesById[node.parentId]) {
      nodesById[node.parentId].children.push(node.id)
    }
  })

  return { rootIds, nodesById }
}
