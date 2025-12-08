import { createStructureSystem } from '../../adapter/structure-system'
import { createDomSystem } from '../../adapter/dom-system'

export type TreeViewRole = 'item' | 'group'
export type TreeViewPart = 'group' | 'item' | 'label' | 'indicator'

export const TreeStructureSystem = createStructureSystem<TreeViewRole, object>({
  roles: ['item', 'group'],
})

export const TreeViewDomSystem = createDomSystem<TreeViewPart, string, object>({
  namespace: 'treeview',
  parts: ['group', 'item', 'label', 'indicator'],
})
