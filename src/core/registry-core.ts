// ============================================
// Registry Core - 순수 함수 모듈
// ============================================
// 노드 등록/해제, 계층 관계, 파트 역할 관리
// DOM/React 의존성 없음 (Element는 Shell에서 관리)
// ============================================

export type NodeId = string

// ============================================
// 기본 타입
// ============================================

/**
 * Part → Meta 매핑 타입
 * 각 컴포넌트에서 정의하여 타입 추론에 사용
 *
 * @example
 * type MenuPartMetaMap = {
 *   trigger: { menuId: string }
 *   item: { menuId: string }
 *   content: { menuId: string }
 * }
 */
export type PartMetaMap = Record<string, object>

/**
 * Part에 해당하는 Meta 타입 추론
 * PM[P]가 존재하면 해당 타입, 없으면 object
 */
export type InferMeta<
  PM extends PartMetaMap,
  P extends string,
> = P extends keyof PM ? PM[P] : object

export type RegistryNode<
  Part extends string = string,
  Meta extends object = object,
> = {
  id: NodeId
  parentId: NodeId | null // 계층 관계 (옵션)
  part: Part | null // 파트 역할 (옵션)
  meta: Meta // 추가 메타데이터
}

// Key: part가 있으면 "nodeId::part", 없으면 "nodeId"
export type RegistryKey = string

export type Registry<
  Part extends string = string,
  Meta extends object = object,
> = Map<RegistryKey, RegistryNode<Part, Meta>>

// ============================================
// Key 생성
// ============================================

export function makeKey(nodeId: NodeId, part?: string | null): RegistryKey {
  if (part) {
    return `${nodeId}::${part}`
  }
  return nodeId
}

export function parseKey(key: RegistryKey): { nodeId: NodeId; part: string | null } {
  const separatorIndex = key.indexOf('::')
  if (separatorIndex === -1) {
    return { nodeId: key, part: null }
  }
  return {
    nodeId: key.slice(0, separatorIndex),
    part: key.slice(separatorIndex + 2),
  }
}

// ============================================
// 생성
// ============================================

export function createRegistry<
  Part extends string = string,
  Meta extends object = object,
>(): Registry<Part, Meta> {
  return new Map()
}

// ============================================
// 등록 / 해제 (immutable)
// ============================================

export type RegisterOptions<
  Part extends string = string,
  Meta extends object = object,
> = {
  id: NodeId
  parentId?: NodeId | null
  part?: Part | null
  meta?: Meta
}

export function registerNode<
  Part extends string = string,
  Meta extends object = object,
>(
  registry: Registry<Part, Meta>,
  options: RegisterOptions<Part, Meta>,
): Registry<Part, Meta> {
  const { id, parentId = null, part = null, meta = {} as Meta } = options
  const key = makeKey(id, part)
  const next = new Map(registry)
  next.set(key, { id, parentId, part, meta })
  return next
}

export function unregisterNode<
  Part extends string = string,
  Meta extends object = object,
>(
  registry: Registry<Part, Meta>,
  nodeId: NodeId,
  part?: Part | null,
): Registry<Part, Meta> {
  const key = makeKey(nodeId, part)
  const next = new Map(registry)
  next.delete(key)
  return next
}

// ============================================
// 조회
// ============================================

export function getNode<
  Part extends string = string,
  Meta extends object = object,
>(
  registry: Registry<Part, Meta>,
  nodeId: NodeId,
  part?: Part | null,
): RegistryNode<Part, Meta> | null {
  const key = makeKey(nodeId, part)
  return registry.get(key) ?? null
}

export function hasNode<
  Part extends string = string,
  Meta extends object = object,
>(
  registry: Registry<Part, Meta>,
  nodeId: NodeId,
  part?: Part | null,
): boolean {
  const key = makeKey(nodeId, part)
  return registry.has(key)
}

// 특정 part의 모든 노드 조회
export function getNodesByPart<
  Part extends string = string,
  Meta extends object = object,
>(registry: Registry<Part, Meta>, part: Part): RegistryNode<Part, Meta>[] {
  const result: RegistryNode<Part, Meta>[] = []
  for (const node of registry.values()) {
    if (node.part === part) {
      result.push(node)
    }
  }
  return result
}

// 특정 부모의 자식들 조회
export function getChildNodes<
  Part extends string = string,
  Meta extends object = object,
>(
  registry: Registry<Part, Meta>,
  parentId: NodeId,
): RegistryNode<Part, Meta>[] {
  const result: RegistryNode<Part, Meta>[] = []
  for (const node of registry.values()) {
    if (node.parentId === parentId) {
      result.push(node)
    }
  }
  return result
}

// 부모 ID 찾기
export function getParentId<
  Part extends string = string,
  Meta extends object = object,
>(
  registry: Registry<Part, Meta>,
  nodeId: NodeId,
  part?: Part | null,
): NodeId | null {
  const node = getNode(registry, nodeId, part)
  return node?.parentId ?? null
}

// 루트 노드들 조회 (parentId가 null인 노드들)
export function getRootNodes<
  Part extends string = string,
  Meta extends object = object,
>(registry: Registry<Part, Meta>): RegistryNode<Part, Meta>[] {
  const result: RegistryNode<Part, Meta>[] = []
  for (const node of registry.values()) {
    if (node.parentId === null) {
      result.push(node)
    }
  }
  return result
}

// ============================================
// 계층 구조 (Shape) 변환 - Tree용
// ============================================

export type HierarchyNode = {
  id: NodeId
  children: NodeId[]
}

export type HierarchyShape = {
  rootIds: NodeId[]
  nodesById: Record<NodeId, HierarchyNode>
}

/**
 * Registry를 계층 구조(Shape)로 변환
 * part가 없는 노드들만 대상으로 함 (Tree의 Item 등)
 */
export function registryToShape<
  Part extends string = string,
  Meta extends object = object,
>(registry: Registry<Part, Meta>): HierarchyShape {
  const nodesById: Record<NodeId, HierarchyNode> = {}
  const rootIds: NodeId[] = []

  // part가 없는 노드들만 수집
  for (const node of registry.values()) {
    if (node.part !== null) continue

    nodesById[node.id] = { id: node.id, children: [] }
    if (node.parentId === null) {
      rootIds.push(node.id)
    }
  }

  // 부모-자식 관계 설정
  for (const node of registry.values()) {
    if (node.part !== null) continue
    if (node.parentId && nodesById[node.parentId]) {
      nodesById[node.parentId].children.push(node.id)
    }
  }

  return { rootIds, nodesById }
}

// ============================================
// 메타 조회를 위한 필터 헬퍼
// ============================================

/**
 * 특정 part의 노드들 중 meta 조건에 맞는 것들 필터링
 */
export function filterNodesByMeta<
  Part extends string = string,
  Meta extends object = object,
>(
  registry: Registry<Part, Meta>,
  part: Part,
  predicate: (meta: Meta) => boolean,
): RegistryNode<Part, Meta>[] {
  const nodes = getNodesByPart(registry, part)
  return nodes.filter((node) => predicate(node.meta))
}
