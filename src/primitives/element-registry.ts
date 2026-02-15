export interface RegistryEntry<Meta extends Record<string, unknown> = Record<string, unknown>> {
  value: string
  role: string
  element: HTMLElement
  meta: Meta
}

export interface ElementRegistry<Meta extends Record<string, unknown> = Record<string, unknown>> {
  set(value: string, role: string, element: HTMLElement, meta: Meta): void
  delete(value: string, role: string): void
  updateMeta(value: string, role: string, meta: Partial<Meta>): void

  getElement(value: string, role: string): HTMLElement | null
  getMeta(value: string, role: string): Meta | null
  getEntry(value: string, role: string): RegistryEntry<Meta> | null
  getEntriesByRole(role: string): RegistryEntry<Meta>[]
  getEntriesByRoleInDomOrder(role: string): RegistryEntry<Meta>[]
  filterEntries(
    roles: string | string[],
    predicate: (entry: RegistryEntry<Meta>) => boolean,
  ): RegistryEntry<Meta>[]
}

function makeKey(value: string, role: string): string {
  return `${value}:${role}`
}

export function createElementRegistry<
  Meta extends Record<string, unknown> = Record<string, unknown>,
>(): ElementRegistry<Meta> {
  const entries = new Map<string, RegistryEntry<Meta>>()

  return {
    set(value, role, element, meta) {
      entries.set(makeKey(value, role), { value, role, element, meta })
    },

    delete(value, role) {
      entries.delete(makeKey(value, role))
    },

    updateMeta(value, role, meta) {
      const entry = entries.get(makeKey(value, role))
      if (entry) {
        entry.meta = { ...entry.meta, ...meta }
      }
    },

    getElement(value, role) {
      return entries.get(makeKey(value, role))?.element ?? null
    },

    getMeta(value, role) {
      return entries.get(makeKey(value, role))?.meta ?? null
    },

    getEntry(value, role) {
      return entries.get(makeKey(value, role)) ?? null
    },

    getEntriesByRole(role) {
      const result: RegistryEntry<Meta>[] = []
      for (const entry of entries.values()) {
        if (entry.role === role) result.push(entry)
      }
      return result
    },

    getEntriesByRoleInDomOrder(role) {
      const result = this.getEntriesByRole(role)
      result.sort((a, b) => {
        const pos = a.element.compareDocumentPosition(b.element)
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1
        return 0
      })
      return result
    },

    filterEntries(roles, predicate) {
      const roleList = typeof roles === 'string' ? [roles] : roles
      const result: RegistryEntry<Meta>[] = []
      for (const entry of entries.values()) {
        if (roleList.includes(entry.role) && predicate(entry)) {
          result.push(entry)
        }
      }
      return result
    },
  }
}
