import { findNodeFromEvent } from '../core/dom'
import type { NodeId } from '../core/registry-core'

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
