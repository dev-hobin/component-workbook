import { createCompositeSystem } from '../../core/composite'

type MenuRole = 'trigger' | 'content' | 'positioner' | 'arrow' | 'item'
type ItemId = string

type MenuMeta = {
  rootId: string
}

export const MenuSystem = createCompositeSystem<MenuRole, ItemId, MenuMeta>({
  namespace: 'menu',
  roles: ['trigger', 'content', 'positioner', 'arrow', 'item'],
})
