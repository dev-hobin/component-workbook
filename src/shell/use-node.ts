import { useId, useLayoutEffect, useRef } from 'react'
import { useComponentStore } from './use-component-store'
import { useParentId } from './use-parent-context'
import { useLatestRef } from '../hooks/useLatestRef'
import type { NodeId } from '../core/component-store'

export function useNode<Role extends string, Meta extends object = object>(
  options: {
    role: Role
    id?: NodeId
    domId?: string
    meta?: Meta
  }
) {
  const generatedId = useId()
  const id = options.id ?? generatedId
  const parentId = useParentId()
  const { store } = useComponentStore<Role, Meta>()
  const ref = useRef<HTMLElement>(null)
  const metaRef = useLatestRef(options.meta)

  const domId = options.domId ?? `${id}-${options.role}`

  useLayoutEffect(() => {
    store.register({
      id,
      parentId,
      role: options.role,
      meta: metaRef.current ?? ({} as Meta),
      element: ref.current,
    })
    return () => store.unregister(id)
  }, [id, parentId, options.role, store, metaRef])

  return { id, domId, ref }
}

export function useLogicalNode<
  Role extends string,
  Meta extends object = object,
>(options: { role: Role; id?: NodeId; meta?: Meta }) {
  const generatedId = useId()
  const id = options.id ?? generatedId
  const parentId = useParentId()
  const { store } = useComponentStore<Role, Meta>()
  const metaRef = useLatestRef(options.meta)

  useLayoutEffect(() => {
    store.register({
      id,
      parentId,
      role: options.role,
      meta: metaRef.current ?? ({} as Meta),
      element: null,
    })
    return () => store.unregister(id)
  }, [id, parentId, options.role, store, metaRef])

  return { id }
}
