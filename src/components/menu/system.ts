import { createDomSystem } from '../../adapter/dom-system'

type MenuRole = 'trigger' | 'content' | 'positioner' | 'arrow' | 'item'
type ItemId = string

type MenuMeta = {
  rootId: string
}

export const MenuSystem = createDomSystem<MenuRole, ItemId, MenuMeta>({
  namespace: 'menu',
  parts: ['trigger', 'content', 'positioner', 'arrow', 'item'],
})
