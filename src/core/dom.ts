import type { NodeId } from './registry-core'

// 저수준: DOM만 알고 이벤트 모름
export function findNodeFromEvent(
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
