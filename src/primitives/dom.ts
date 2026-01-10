export type NodeId = string

// DOM 순회하며 등록된 요소 찾기
function findNodeFromEvent(
  target: HTMLElement | null,
  boundary: HTMLElement | null,
  elements: Map<NodeId, HTMLElement>,
): NodeId | null {
  let current = target

  while (current && current !== boundary) {
    for (const [nodeId, element] of elements) {
      if (element === current) {
        return nodeId
      }
    }
    current = current.parentElement
  }

  return null
}

export function findNodeFromMouseEvent(
  e: React.MouseEvent,
  elements: Map<NodeId, HTMLElement>,
): NodeId | null {
  return findNodeFromEvent(
    e.target as HTMLElement,
    e.currentTarget as HTMLElement,
    elements,
  )
}
