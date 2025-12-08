import { createDomSystem } from '../../adapter/dom-system'
import type { NodeId } from '../../core/composite-store'

type TreeViewPart = 'group' | 'item' | 'label' | 'indicator'

export const TreeViewDomSystem = createDomSystem<TreeViewPart, NodeId, object>({
  namespace: 'tree',
  parts: ['group', 'item', 'label', 'indicator'],
})
