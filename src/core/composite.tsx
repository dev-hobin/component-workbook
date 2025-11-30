import React from 'react'

export type CompositeConfig<Role extends string> = {
  namespace: string // 'menu', 'tabs', 'list', 'tree' ...
  roles: readonly Role[]
}

export type IdStrategy<Role extends string, ItemId> = (args: {
  role: Role
  scopeId: string
  itemId: ItemId
}) => string

export interface CompositeItemMeta<Role extends string, ItemId, Meta> {
  role: Role
  itemId: ItemId
  domId: string
  node: HTMLElement
  meta: Meta
}

export interface CompositeRegistry<Role extends string, ItemId, Meta> {
  register(meta: CompositeItemMeta<Role, ItemId, Meta>): void
  unregister(role: Role, itemId: ItemId): void
  get(
    role: Role,
    itemId: ItemId,
  ): CompositeItemMeta<Role, ItemId, Meta> | undefined
  getDomId(role: Role, itemId: ItemId): string | undefined
  getNode(role: Role, itemId: ItemId): HTMLElement | undefined
  entries(): Iterable<CompositeItemMeta<Role, ItemId, Meta>>
  entriesByRole(role: Role): Iterable<CompositeItemMeta<Role, ItemId, Meta>>
}

type RegistryKey<
  Role extends string,
  ItemId,
> = `${Role}::${ItemId & (string | number)}`

function createCompositeRegistry<
  Role extends string,
  ItemId,
  Meta,
>(): CompositeRegistry<Role, ItemId, Meta> {
  const map = new Map<
    RegistryKey<Role, ItemId>,
    CompositeItemMeta<Role, ItemId, Meta>
  >()

  const makeKey = (role: Role, itemId: ItemId): RegistryKey<Role, ItemId> =>
    `${role}::${itemId}` as RegistryKey<Role, ItemId>

  return {
    register(meta) {
      const key = makeKey(meta.role, meta.itemId)
      map.set(key, meta)
    },
    unregister(role, itemId) {
      const key = makeKey(role, itemId)
      map.delete(key)
    },
    get(role, itemId) {
      const key = makeKey(role, itemId)
      return map.get(key)
    },
    getDomId(role, itemId) {
      const key = makeKey(role, itemId)
      return map.get(key)?.domId
    },
    getNode(role, itemId) {
      const key = makeKey(role, itemId)
      return map.get(key)?.node
    },
    *entries() {
      for (const v of map.values()) yield v
    },
    *entriesByRole(role) {
      for (const v of map.values()) {
        if (v.role === role) yield v
      }
    },
  }
}

export function createCompositeSystem<
  Role extends string,
  ItemId extends string | number,
  Meta extends object,
>(config: CompositeConfig<Role>) {
  type Ctx = {
    scopeId: string
    makeDomId: IdStrategy<Role, ItemId>
    registry: CompositeRegistry<Role, ItemId, Meta>
  }

  const CompositeContext = React.createContext<Ctx | null>(null)

  function useCompositeContext(): Ctx {
    const ctx = React.useContext(CompositeContext)
    if (!ctx) {
      throw new Error(
        `useCompositeContext must be used within <${config.namespace}.Provider>`,
      )
    }
    return ctx
  }

  const defaultIdStrategy: IdStrategy<Role, ItemId> = ({
    role,
    scopeId,
    itemId,
  }) => `${config.namespace}::${scopeId}::${role}-${String(itemId)}`

  function Provider(props: {
    children: React.ReactNode
    idStrategy?: IdStrategy<Role, ItemId>
  }) {
    const scopeId = React.useId()

    const makeDomId = React.useMemo(
      () => props.idStrategy ?? defaultIdStrategy,
      [props.idStrategy],
    )

    const registry = React.useRef(
      createCompositeRegistry<Role, ItemId, Meta>(),
    ).current

    const value = React.useMemo<Ctx>(
      () => ({ scopeId, makeDomId, registry }),
      [scopeId, makeDomId, registry],
    )

    return (
      <CompositeContext.Provider value={value}>
        {props.children}
      </CompositeContext.Provider>
    )
  }

  function useCompositeItemRegistration(
    role: Role,
    itemId: ItemId,
    options?: {
      id?: string
      meta?: Meta
    },
  ) {
    const { scopeId, makeDomId, registry } = useCompositeContext()

    const defaultDomId = makeDomId({ role, scopeId, itemId })
    const domId = options?.id ?? defaultDomId
    const meta = options?.meta ?? ({} as Meta)

    const ref = (node: HTMLElement | null) => {
      if (node) {
        registry.register({ role, itemId, domId, node, meta })
      } else {
        registry.unregister(role, itemId)
      }
    }

    return { domId, ref }
  }

  function useCompositeDomId(role: Role, itemId: ItemId | null | undefined) {
    const { scopeId, makeDomId, registry } = useCompositeContext()
    if (itemId == null) return undefined

    const fallback = makeDomId({ role, scopeId, itemId })
    const registered = registry.getDomId(role, itemId)
    return registered ?? fallback
  }

  function useCompositeRegistry() {
    const { registry } = useCompositeContext()
    return registry
  }

  return {
    Provider,
    useCompositeContext,
    useCompositeItemRegistration,
    useCompositeDomId,
    useCompositeRegistry,
  }
}
