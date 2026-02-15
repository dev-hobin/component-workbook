export interface RegistryEntry<Meta extends Record<string, unknown> = Record<string, unknown>> {
  value: string
  role: string
  element: HTMLElement
  meta: Meta
}

export interface ElementRegistry<Meta extends Record<string, unknown> = Record<string, unknown>> {
  set(role: string, value: string, element: HTMLElement, meta: Meta): void
  delete(role: string, value: string): void
  updateMeta(role: string, value: string, meta: Partial<Meta>): void

  getElement(role: string, value: string): HTMLElement | null
  getMeta(role: string, value: string): Meta | null
  getEntry(role: string, value: string): RegistryEntry<Meta> | null
  getEntriesByRole(role: string): RegistryEntry<Meta>[]
  getEntriesByRoleInDomOrder(role: string): RegistryEntry<Meta>[]
  filterEntries(
    roles: string | string[],
    predicate: (entry: RegistryEntry<Meta>) => boolean,
  ): RegistryEntry<Meta>[]
}

function makeKey(role: string, value: string): string {
  return `${role}:${value}`
}

export function createElementRegistry<
  Meta extends Record<string, unknown> = Record<string, unknown>,
>(): ElementRegistry<Meta> {
  const entries = new Map<string, RegistryEntry<Meta>>()

  return {
    set(role, value, element, meta) {
      entries.set(makeKey(role, value), { value, role, element, meta })
    },

    delete(role, value) {
      entries.delete(makeKey(role, value))
    },

    updateMeta(role, value, meta) {
      const entry = entries.get(makeKey(role, value))
      if (entry) {
        entry.meta = { ...entry.meta, ...meta }
      }
    },

    getElement(role, value) {
      return entries.get(makeKey(role, value))?.element ?? null
    },

    getMeta(role, value) {
      return entries.get(makeKey(role, value))?.meta ?? null
    },

    getEntry(role, value) {
      return entries.get(makeKey(role, value)) ?? null
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
