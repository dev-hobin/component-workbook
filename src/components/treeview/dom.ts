import { createCompositeSystem } from '../../core/composite'
import type { NodeId } from '../../core/composite-store'

type TreeViewPart = 'group' | 'item' | 'label' | 'indicator'

export const TreeViewDomSystem = createCompositeSystem<
  TreeViewPart,
  NodeId,
  object
>({
  namespace: 'tree',
  parts: ['group', 'item', 'label', 'indicator'],
})
