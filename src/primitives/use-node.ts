import { useCallback, useId, useLayoutEffect, useRef } from 'react'
import { useNodeStore } from './use-node-store'
import { useParentId } from './use-parent-context'
import type { NodeId } from './node-store'

export function useNode<
  Role extends string,
  Meta extends object = object,
>(options: { role: Role; id?: NodeId; domId?: string; meta?: Meta }) {
  const generatedId = useId()
  const id = options.id ?? generatedId
  const parentId = useParentId()
  const store = useNodeStore<Role, Meta>()
  const elementRef = useRef<HTMLElement | null>(null)
  const metaRef = useRef(options.meta)
  metaRef.current = options.meta

  const domId = options.domId ?? `${options.role}::${id}`

  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (elementRef.current === element) return

      if (elementRef.current) {
        store.unregister(id, options.role)
      }

      elementRef.current = element

      if (element) {
        store.register({
          id,
          parentId,
          role: options.role,
          domId,
          meta: metaRef.current ?? ({} as Meta),
          element,
        })
      }
    },
    [store, id, options.role, parentId, domId],
  )

  if (elementRef.current && options.meta) {
    store.updateMeta(id, options.role, options.meta)
  }

  return { id, domId, ref, elementRef }
}

export function useLogicalNode<
  Role extends string,
  Meta extends object = object,
>(options: { role: Role; id?: NodeId; meta?: Meta }) {
  const generatedId = useId()
  const id = options.id ?? generatedId
  const parentId = useParentId()
  const store = useNodeStore<Role, Meta>()
  const metaRef = useRef(options.meta)
  metaRef.current = options.meta

  const domId = `${options.role}::${id}`

  useLayoutEffect(() => {
    store.register({
      id,
      parentId,
      role: options.role,
      domId,
      meta: metaRef.current ?? ({} as Meta),
      element: null,
    })

    return () => store.unregister(id, options.role)
  }, [id, parentId, options.role, domId, store])

  if (options.meta) {
    store.updateMeta(id, options.role, options.meta)
  }

  return { id, domId }
}
